import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRegistrosPorPlanillas } from "@/features/home/api";
import { fetchProyectosActivos, fetchTiposRegistroActivos } from "@/features/hours/api";
import {
  createWeekDays,
  getColumnTotal,
  getDayTotal,
  getWeekTotal,
  type ColumnaRegistro,
  type HoursByDateAndColumn,
} from "@/features/hours/domain";
import type { RegistroHoras } from "@/types/database.types";
import {
  aprobarPlanilla,
  devolverPlanilla,
  fetchHistorialAprobacionesMultiple,
  fetchPeriodosPorIds,
  fetchPlanillasEnviadas,
  fetchTrabajadoresPorIds,
} from "./api";

export interface PeriodoPendiente {
  trabajadorId: string;
  trabajadorNombre: string;
  periodoId: string;
  periodoNombre: string;
  periodoFechaInicio: string;
  periodoFechaFin: string;
  planillaIds: string[];
  totalOrdinarias: number;
  totalExtraordinarias: number;
  totalAusencias: number;
  enviadaEn: string | null;
}

/** Agrupa las planillas semanales ENVIADA por trabajador+período: un solo período pendiente por trabajador. */
export function usePeriodosPendientes() {
  const planillasQuery = useQuery({ queryKey: ["planillas-enviadas"], queryFn: fetchPlanillasEnviadas });

  const trabajadorIds = useMemo(
    () => [...new Set((planillasQuery.data ?? []).map((planilla) => planilla.trabajador_id))],
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

  const periodosQuery = useQuery({
    queryKey: ["periodos-por-ids", periodoIds],
    queryFn: () => fetchPeriodosPorIds(periodoIds),
    enabled: periodoIds.length > 0,
  });

  const periodos: PeriodoPendiente[] = useMemo(() => {
    const trabajadorPorId = new Map((trabajadoresQuery.data ?? []).map((t) => [t.id, t]));
    const periodoPorId = new Map((periodosQuery.data ?? []).map((p) => [p.id, p]));
    const grupos = new Map<string, PeriodoPendiente>();

    for (const planilla of planillasQuery.data ?? []) {
      const clave = `${planilla.trabajador_id}|${planilla.periodo_id}`;
      const existente = grupos.get(clave);

      if (!existente) {
        const trabajador = trabajadorPorId.get(planilla.trabajador_id);
        const periodo = periodoPorId.get(planilla.periodo_id);
        const nombre = [trabajador?.nombres, trabajador?.apellidos].filter(Boolean).join(" ");

        grupos.set(clave, {
          trabajadorId: planilla.trabajador_id,
          trabajadorNombre: nombre || trabajador?.correo_corporativo || "Trabajador",
          periodoId: planilla.periodo_id,
          periodoNombre: periodo?.nombre ?? "",
          periodoFechaInicio: periodo?.fecha_inicio ?? "",
          periodoFechaFin: periodo?.fecha_fin ?? "",
          planillaIds: [planilla.id],
          totalOrdinarias: Number(planilla.total_ordinarias),
          totalExtraordinarias: Number(planilla.total_extraordinarias),
          totalAusencias: Number(planilla.total_ausencias),
          enviadaEn: planilla.enviada_en,
        });
        continue;
      }

      existente.planillaIds.push(planilla.id);
      existente.totalOrdinarias += Number(planilla.total_ordinarias);
      existente.totalExtraordinarias += Number(planilla.total_extraordinarias);
      existente.totalAusencias += Number(planilla.total_ausencias);
      if (planilla.enviada_en && (!existente.enviadaEn || planilla.enviada_en < existente.enviadaEn)) {
        existente.enviadaEn = planilla.enviada_en;
      }
    }

    return [...grupos.values()].sort((a, b) => a.trabajadorNombre.localeCompare(b.trabajadorNombre, "es"));
  }, [planillasQuery.data, trabajadoresQuery.data, periodosQuery.data]);

  return {
    periodos,
    isLoading:
      planillasQuery.isLoading || trabajadoresQuery.isFetching || periodosQuery.isFetching,
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

/** Detalle de TODAS las semanas (planillas) de un período pendiente, mostradas como una sola tabla. */
export function usePeriodoDetalle(planillaIds: string[], periodoFechaInicio?: string, periodoFechaFin?: string) {
  const registrosQuery = useQuery({
    queryKey: ["registros-periodo-detalle", planillaIds],
    queryFn: () => fetchRegistrosPorPlanillas(planillaIds),
    enabled: planillaIds.length > 0,
  });

  const historialQuery = useQuery({
    queryKey: ["historial-aprobaciones", planillaIds],
    queryFn: () => fetchHistorialAprobacionesMultiple(planillaIds),
    enabled: planillaIds.length > 0,
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
    () => (periodoFechaInicio && periodoFechaFin ? createWeekDays(periodoFechaInicio, periodoFechaFin) : []),
    [periodoFechaInicio, periodoFechaFin],
  );

  return {
    isLoading: registrosQuery.isLoading || proyectosQuery.isLoading || tiposQuery.isLoading,
    days,
    columnas,
    hours,
    historial: historialQuery.data ?? [],
    getDayTotal: (date: string) => getDayTotal(hours, columnas, date),
    getColumnTotal: (columnId: string) => getColumnTotal(hours, columnId),
    weekTotal: getWeekTotal(days, hours, columnas),
  };
}

/** Aprueba todas las semanas (planillas) del período de una vez. */
export function useAprobarPeriodo(administradorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planillaIds: string[]) =>
      Promise.all(planillaIds.map((planillaId) => aprobarPlanilla(planillaId, administradorId as string))),
    onSuccess: () => {
      toast.success("Período aprobado.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-enviadas"] });
    },
    onError: () => toast.error("No fue posible aprobar el período."),
  });
}

/** Devuelve todas las semanas (planillas) del período de una vez, con el mismo comentario. */
export function useDevolverPeriodo(administradorId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planillaIds, comentario }: { planillaIds: string[]; comentario: string }) =>
      Promise.all(
        planillaIds.map((planillaId) => devolverPlanilla(planillaId, administradorId as string, comentario)),
      ),
    onSuccess: () => {
      toast.success("Período devuelto al trabajador.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-enviadas"] });
    },
    onError: () => toast.error("No fue posible devolver el período."),
  });
}
