import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminProyectos } from "@/features/admin/hooks";
import { fetchAreas, fetchCargos, fetchProyectos, fetchTrabajadores } from "@/features/admin/api";
import { rowsToCsv } from "@/features/hours/domain";
import type { Periodo } from "@/types/database.types";
import {
  fetchCentrosCostoActivosCount,
  fetchPlanillasDelPeriodo,
  fetchPlanillasPendientesCount,
  fetchRegistrosPorPlanillas,
  fetchTrabajadoresActivosCount,
} from "./api";

const ESTADOS_PLANILLA = ["BORRADOR", "ENVIADA", "DEVUELTA", "APROBADA", "REABIERTA", "BLOQUEADA"] as const;

const ESTADO_LABEL: Record<(typeof ESTADOS_PLANILLA)[number], string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  DEVUELTA: "Devuelta",
  APROBADA: "Aprobada",
  REABIERTA: "Reabierta",
  BLOQUEADA: "Bloqueada",
};

export interface HorasPorProyecto {
  codigo: string;
  nombre: string;
  horas: number;
}

export interface PlanillasPorEstado {
  estado: string;
  cantidad: number;
}

const MAX_PROYECTOS_GRAFICO = 8;

export function useResumenPeriodo(periodoId: string | undefined) {
  const planillasQuery = useQuery({
    queryKey: ["resumen-periodo-planillas", periodoId],
    queryFn: () => fetchPlanillasDelPeriodo(periodoId as string),
    enabled: Boolean(periodoId),
  });
  const planillaIds = (planillasQuery.data ?? []).map((planilla) => planilla.id);
  const registrosQuery = useQuery({
    queryKey: ["resumen-periodo-registros", periodoId, planillaIds.length],
    queryFn: () => fetchRegistrosPorPlanillas(planillaIds),
    enabled: Boolean(periodoId) && planillasQuery.isSuccess,
  });
  const proyectosQuery = useAdminProyectos();

  const isLoading = planillasQuery.isLoading || registrosQuery.isLoading || proyectosQuery.isLoading;

  const planillasPorEstado: PlanillasPorEstado[] = ESTADOS_PLANILLA.map((estado) => ({
    estado: ESTADO_LABEL[estado],
    cantidad: (planillasQuery.data ?? []).filter((planilla) => planilla.estado === estado).length,
  })).filter((item) => item.cantidad > 0);

  const nombrePorProyectoId = new Map((proyectosQuery.data ?? []).map((p) => [p.id, p]));
  const horasPorProyectoId = new Map<string, number>();
  for (const registro of registrosQuery.data ?? []) {
    if (!registro.proyecto_id) continue;
    horasPorProyectoId.set(registro.proyecto_id, (horasPorProyectoId.get(registro.proyecto_id) ?? 0) + Number(registro.horas));
  }

  const horasOrdenadas = [...horasPorProyectoId.entries()]
    .map(([proyectoId, horas]) => {
      const proyecto = nombrePorProyectoId.get(proyectoId);
      return { codigo: proyecto?.codigo ?? "—", nombre: proyecto?.nombre ?? "Desconocido", horas };
    })
    .sort((a, b) => b.horas - a.horas);

  const horasPorProyecto: HorasPorProyecto[] = horasOrdenadas.slice(0, MAX_PROYECTOS_GRAFICO);
  const otrasHoras = horasOrdenadas.slice(MAX_PROYECTOS_GRAFICO).reduce((acc, item) => acc + item.horas, 0);
  if (otrasHoras > 0) {
    horasPorProyecto.push({ codigo: "OTROS", nombre: "Otros centros de costo", horas: otrasHoras });
  }

  const totalHoras = (registrosQuery.data ?? []).reduce((acc, r) => acc + Number(r.horas), 0);
  const trabajadoresConHoras = new Set((registrosQuery.data ?? []).map((r) => r.trabajador_id)).size;
  const planillasTotal = planillasQuery.data?.length ?? 0;

  return {
    horasPorProyecto,
    planillasPorEstado,
    isLoading,
    totalHoras,
    trabajadoresConHoras,
    planillasTotal,
  };
}

/** Exporta a CSV el detalle de horas de TODOS los trabajadores en un período (uso Super Admin). */
export function useExportarResumenPeriodo() {
  return useMutation({
    mutationFn: async (periodo: Periodo) => {
      const planillas = await fetchPlanillasDelPeriodo(periodo.id);
      const registros = await fetchRegistrosPorPlanillas(planillas.map((p) => p.id));
      const [trabajadores, proyectos, areas, cargos] = await Promise.all([
        fetchTrabajadores(),
        fetchProyectos(),
        fetchAreas(),
        fetchCargos(),
      ]);

      const trabajadorPorId = new Map(trabajadores.map((t) => [t.id, t]));
      const proyectoPorId = new Map(proyectos.map((p) => [p.id, p]));
      const areaPorId = new Map(areas.map((a) => [a.id, a.nombre]));
      const cargoPorId = new Map(cargos.map((c) => [c.id, c.nombre]));

      const filas = registros
        .map((r) => {
          const t = trabajadorPorId.get(r.trabajador_id);
          const p = r.proyecto_id ? proyectoPorId.get(r.proyecto_id) : undefined;
          return {
            trabajador: t ? [t.nombres, t.apellidos].filter(Boolean).join(" ") : "",
            rut: t?.rut ?? "",
            area: t?.area_id ? areaPorId.get(t.area_id) ?? "" : "",
            cargo: t?.cargo_id ? cargoPorId.get(t.cargo_id) ?? "" : "",
            fecha: r.fecha,
            codigo: p?.codigo ?? "",
            nombreProyecto: p?.nombre ?? "",
            horas: Number(r.horas),
          };
        })
        .sort((a, b) => a.trabajador.localeCompare(b.trabajador, "es") || a.fecha.localeCompare(b.fecha));

      const header = ["Trabajador", "RUT", "Área", "Cargo", "Fecha", "Centro de costo", "Nombre centro de costo", "Horas"];
      const rows = filas.map((f) => [
        f.trabajador,
        f.rut,
        f.area,
        f.cargo,
        f.fecha,
        f.codigo,
        f.nombreProyecto,
        f.horas.toString().replace(".", ","),
      ]);

      const csv = rowsToCsv([header, ...rows]);
      const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detalle-horas-${periodo.nombre.replaceAll(" ", "-").toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Se descargó el detalle del período en un archivo CSV compatible con Microsoft Excel.");
    },
    onError: () => {
      toast.error("No fue posible exportar el período.");
    },
  });
}

export function useResumenSuperAdmin() {
  const trabajadoresQuery = useQuery({
    queryKey: ["resumen-trabajadores-activos"],
    queryFn: fetchTrabajadoresActivosCount,
  });
  const centrosQuery = useQuery({
    queryKey: ["resumen-centros-activos"],
    queryFn: fetchCentrosCostoActivosCount,
  });
  const pendientesQuery = useQuery({
    queryKey: ["resumen-planillas-pendientes"],
    queryFn: fetchPlanillasPendientesCount,
  });

  return {
    trabajadoresActivos: trabajadoresQuery.data ?? 0,
    centrosCostoActivos: centrosQuery.data ?? 0,
    planillasPendientes: pendientesQuery.data ?? 0,
    isLoading: trabajadoresQuery.isLoading || centrosQuery.isLoading || pendientesQuery.isLoading,
  };
}
