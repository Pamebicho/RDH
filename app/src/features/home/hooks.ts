import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminProyectos } from "@/features/admin/hooks";
import { fetchAreas, fetchCargos, fetchProyectos, fetchTrabajadores } from "@/features/admin/api";
import { descargarCsv, rowsToCsv } from "@/features/hours/domain";
import type { Periodo } from "@/types/database.types";
import {
  fetchCentrosCostoActivosCount,
  fetchPlanillasDelPeriodo,
  fetchPlanillasPendientesCount,
  fetchRegistrosPorPlanillas,
  fetchTrabajadoresActivosCount,
} from "./api";

const SIN_CATEGORIA = "Sin categoría";
const VACACIONES_LICENCIA = "Vacaciones / Licencia";

export interface ClienteAreaHoras {
  clienteArea: string;
  horas: number;
}

export interface CentroCostoHoras {
  codigo: string;
  nombre: string;
  horas: number;
}

export interface ParetoPunto extends ClienteAreaHoras {
  porcentajeAcumulado: number;
}

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

  const proyectoPorId = new Map((proyectosQuery.data ?? []).map((p) => [p.id, p]));
  const horasPorProyectoId = new Map<string, number>();
  for (const registro of registrosQuery.data ?? []) {
    if (!registro.proyecto_id) continue;
    horasPorProyectoId.set(registro.proyecto_id, (horasPorProyectoId.get(registro.proyecto_id) ?? 0) + Number(registro.horas));
  }

  const proyectosActivos = (proyectosQuery.data ?? []).filter((p) => p.activo);

  const centrosCostoDetalle: CentroCostoHoras[] = proyectosActivos
    .map((p) => ({ codigo: p.codigo, nombre: p.nombre, horas: horasPorProyectoId.get(p.id) ?? 0 }))
    .sort((a, b) => b.horas - a.horas);

  const ccUtilizados = centrosCostoDetalle.filter((c) => c.horas > 0).length;
  const ccSinMovimiento = centrosCostoDetalle.length - ccUtilizados;

  const horasPorClienteArea = new Map<string, number>();
  for (const [proyectoId, horas] of horasPorProyectoId) {
    const clienteArea = proyectoPorId.get(proyectoId)?.cliente_area || SIN_CATEGORIA;
    horasPorClienteArea.set(clienteArea, (horasPorClienteArea.get(clienteArea) ?? 0) + horas);
  }

  // Horas sin centro de costo (vacaciones, licencia, etc.) — equivalente a la fila
  // "No disponibles" de la hoja Resumen del Excel, para que el total de esta distribución
  // sume el 100% de las horas del período, igual que "Horas registradas".
  const horasSinCentroCosto = (registrosQuery.data ?? [])
    .filter((r) => !r.proyecto_id)
    .reduce((acc, r) => acc + Number(r.horas), 0);
  if (horasSinCentroCosto > 0) {
    horasPorClienteArea.set(VACACIONES_LICENCIA, horasSinCentroCosto);
  }

  const clienteAreaDetalle: ClienteAreaHoras[] = [...horasPorClienteArea.entries()]
    .map(([clienteArea, horas]) => ({ clienteArea, horas }))
    .sort((a, b) => b.horas - a.horas);

  const totalHoras = (registrosQuery.data ?? []).reduce((acc, r) => acc + Number(r.horas), 0);
  const trabajadoresConHoras = new Set((registrosQuery.data ?? []).map((r) => r.trabajador_id)).size;

  let acumulado = 0;
  const paretoData: ParetoPunto[] = clienteAreaDetalle.map((item) => {
    acumulado += item.horas;
    return { ...item, porcentajeAcumulado: totalHoras > 0 ? (acumulado / totalHoras) * 100 : 0 };
  });

  return {
    isLoading,
    totalHoras,
    trabajadoresConHoras,
    ccUtilizados,
    ccSinMovimiento,
    clienteAreaDetalle,
    centrosCostoDetalle,
    paretoData,
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
            clienteArea: p?.cliente_area ?? "",
            horas: Number(r.horas),
          };
        })
        .sort((a, b) => a.trabajador.localeCompare(b.trabajador, "es") || a.fecha.localeCompare(b.fecha));

      const header = [
        "Trabajador",
        "RUT",
        "Área",
        "Cargo",
        "Fecha",
        "Centro de costo",
        "Nombre centro de costo",
        "Cliente/Área",
        "Horas",
      ];
      const rows = filas.map((f) => [
        f.trabajador,
        f.rut,
        f.area,
        f.cargo,
        f.fecha,
        f.codigo,
        f.nombreProyecto,
        f.clienteArea,
        f.horas.toString().replace(".", ","),
      ]);

      const csv = rowsToCsv([header, ...rows]);
      descargarCsv(csv, `detalle-horas-${periodo.nombre.replaceAll(" ", "-").toLowerCase()}.csv`);
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
