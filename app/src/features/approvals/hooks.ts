import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchProyectosActivos, fetchTiposRegistroActivos } from "@/features/hours/api";
import { createWeekDays, getDayTotal, getWeekTotal, type ColumnaRegistro, type HoursByDateAndColumn } from "@/features/hours/domain";
import type { RegistroHoras } from "@/types/database.types";
import {
  aprobarPlanilla,
  devolverPlanilla,
  fetchHistorialAprobaciones,
  fetchPeriodosPorIds,
  fetchPlanillasEnviadas,
  fetchRegistrosDePlanilla,
  fetchSemanasPorIds,
  fetchTrabajadoresPorIds,
} from "./api";

export interface PlanillaPendiente {
  id: string;
  trabajadorNombre: string;
  semanaNumero: number;
  semanaFechaInicio: string;
  semanaFechaFin: string;
  periodoNombre: string;
  totalOrdinarias: number;
  totalExtraordinarias: number;
  totalAusencias: number;
  enviadaEn: string | null;
}

export function usePlanillasPendientes() {
  const planillasQuery = useQuery({ queryKey: ["planillas-enviadas"], queryFn: fetchPlanillasEnviadas });

  const trabajadorIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.trabajador_id))],
    [planillasQuery.data],
  );
  const semanaIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.semana_id))],
    [planillasQuery.data],
  );
  const periodoIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.periodo_id))],
    [planillasQuery.data],
  );

  const trabajadoresQuery = useQuery({
    queryKey: ["trabajadores-por-ids", trabajadorIds],
    queryFn: () => fetchTrabajadoresPorIds(trabajadorIds),
    enabled: trabajadorIds.length > 0,
  });

  const semanasQuery = useQuery({
    queryKey: ["semanas-por-ids", semanaIds],
    queryFn: () => fetchSemanasPorIds(semanaIds),
    enabled: semanaIds.length > 0,
  });

  const periodosQuery = useQuery({
    queryKey: ["periodos-por-ids", periodoIds],
    queryFn: () => fetchPeriodosPorIds(periodoIds),
    enabled: periodoIds.length > 0,
  });

  const planillas: PlanillaPendiente[] = useMemo(() => {
    const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));
    const semanaPorId = new Map((semanasQuery.data ?? []).map((s) => [s.id, s]));
    const periodoPorId = new Map((periodosQuery.data ?? []).map((p) => [p.id, p]));

    return (planillasQuery.data ?? []).map((planilla) => {
      const trabajador = trabajadorPorId.get(planilla.trabajador_id);
      const semana = semanaPorId.get(planilla.semana_id);
      const periodo = periodoPorId.get(planilla.periodo_id);
      const nombre = [trabajador?.nombres, trabajador?.apellidos].filter(Boolean).join(" ");

      return {
        id: planilla.id,
        trabajadorNombre: nombre || trabajador?.correo_corporativo || "Trabajador",
        semanaNumero: semana?.numero_semana ?? 0,
        semanaFechaInicio: semana?.fecha_inicio ?? "",
        semanaFechaFin: semana?.fecha_fin ?? "",
        periodoNombre: periodo?.nombre ?? "",
        totalOrdinarias: Number(planilla.total_ordinarias),
        totalExtraordinarias: Number(planilla.total_extraordinarias),
        totalAusencias: Number(planilla.total_ausencias),
        enviadaEn: planilla.enviada_en,
      };
    });
  }, [planillasQuery.data, trabajadoresQuery.data, semanasQuery.data, periodosQuery.data]);

  return {
    planillas,
    isLoading:
      planillasQuery.isLoading || trabajadoresQuery.isFetching || semanasQuery.isFetching || periodosQuery.isFetching,
  };
}

function buildColumnasDesdeRegistros(
  registros: RegistroHoras[],
  proyectos: { id: string; codigo: string; nombre: string }[],
  tipos: { id: string; codigo: string; nombre: string; categoria: string; es_hora_extra: boolean }[],
): ColumnaRegistro[] {
  const proyectoPorId = new Map(proyectos.map((p) => [p.id, p]));
  const tipoPorId = new Map(tipos.map((t) => [t.id, t]));
  const vistos = new Set<string>();
  const columnas: ColumnaRegistro[] = [];

  for (const registro of registros) {
    const tipo = tipoPorId.get(registro.tipo_registro_id);
    if (!tipo) continue;

    const columnaId = registro.proyecto_id ?? tipo.codigo;
    if (vistos.has(columnaId)) continue;
    vistos.add(columnaId);

    const proyecto = registro.proyecto_id ? proyectoPorId.get(registro.proyecto_id) : undefined;

    columnas.push({
      id: columnaId,
      tipoRegistroId: tipo.id,
      proyectoId: registro.proyecto_id,
      codigo: proyecto?.codigo ?? tipo.codigo,
      etiqueta: proyecto?.nombre ?? tipo.nombre,
      categoria: tipo.categoria,
      esHoraExtra: tipo.es_hora_extra,
    });
  }

  return columnas;
}

export function usePlanillaDetalle(planillaId: string | null, semanaFechaInicio?: string, semanaFechaFin?: string) {
  const registrosQuery = useQuery({
    queryKey: ["registros-planilla-detalle", planillaId],
    queryFn: () => fetchRegistrosDePlanilla(planillaId as string),
    enabled: Boolean(planillaId),
  });

  const historialQuery = useQuery({
    queryKey: ["historial-aprobaciones", planillaId],
    queryFn: () => fetchHistorialAprobaciones(planillaId as string),
    enabled: Boolean(planillaId),
  });

  const proyectosQuery = useQuery({ queryKey: ["proyectos-activos"], queryFn: fetchProyectosActivos });
  const tiposQuery = useQuery({ queryKey: ["tipos-registro-activos"], queryFn: fetchTiposRegistroActivos });

  const columnas = useMemo(
    () =>
      buildColumnasDesdeRegistros(registrosQuery.data ?? [], proyectosQuery.data ?? [], tiposQuery.data ?? []),
    [registrosQuery.data, proyectosQuery.data, tiposQuery.data],
  );

  const hours: HoursByDateAndColumn = useMemo(() => {
    const map: HoursByDateAndColumn = {};
    for (const registro of registrosQuery.data ?? []) {
      const columnaId = registro.proyecto_id ?? columnas.find((c) => c.tipoRegistroId === registro.tipo_registro_id)?.id;
      if (!columnaId) continue;
      map[registro.fecha] = { ...map[registro.fecha], [columnaId]: Number(registro.horas) };
    }
    return map;
  }, [registrosQuery.data, columnas]);

  const days = useMemo(
    () => (semanaFechaInicio && semanaFechaFin ? createWeekDays(semanaFechaInicio, semanaFechaFin) : []),
    [semanaFechaInicio, semanaFechaFin],
  );

  return {
    isLoading: registrosQuery.isLoading || proyectosQuery.isLoading || tiposQuery.isLoading,
    days,
    columnas,
    hours,
    historial: historialQuery.data ?? [],
    getDayTotal: (date: string) => getDayTotal(hours, columnas, date),
    getColumnTotal: (columnId: string) =>
      hours && columnId
        ? Object.values(hours).reduce((total, day) => total + Number(day[columnId] || 0), 0)
        : 0,
    weekTotal: getWeekTotal(days, hours, columnas),
  };
}

export function useAprobarPlanilla(administradorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planillaId: string) => aprobarPlanilla(planillaId, administradorId as string),
    onSuccess: () => {
      toast.success("Planilla aprobada.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-enviadas"] });
    },
    onError: () => toast.error("No fue posible aprobar la planilla."),
  });
}

export function useDevolverPlanilla(administradorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planillaId, comentario }: { planillaId: string; comentario: string }) =>
      devolverPlanilla(planillaId, administradorId as string, comentario),
    onSuccess: () => {
      toast.success("Planilla devuelta al trabajador.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-enviadas"] });
    },
    onError: () => toast.error("No fue posible devolver la planilla."),
  });
}
