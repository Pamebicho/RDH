import { useEffect, useMemo, useReducer, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchRegistrosPorPlanillas } from "@/features/home/api";
import type { Periodo, PlanillaEstado, RegistroHoras, Semana } from "@/types/database.types";
import {
  ensurePlanilla,
  fetchFeriados,
  fetchHorasEsperadasPorDia,
  fetchPeriodos,
  fetchProyectosActivos,
  fetchProyectosSeleccionadosIds,
  fetchRegistrosPeriodo,
  fetchSemanas,
  fetchTiposRegistroActivos,
  fetchUltimaDevolucion,
  submitPlanilla,
  updateProyectosSeleccionados,
  upsertRegistros,
  type RegistroUpsert,
} from "./api";
import {
  buildCsvRowsPeriodo,
  createWeekDays,
  FIXED_COST_CENTER_CODES,
  formatHours,
  getColumnTotal,
  getDayTotal,
  getTotalesPorCategoria,
  getWeekExpectedHours,
  getWeekTotal,
  MAX_DAILY_HOURS,
  rowsToCsv,
  type ColumnaRegistro,
  type HoursByDateAndColumn,
} from "./domain";
import { applySetHour, initialWeekDraft, weekDraftReducer } from "./reducer";

export function usePeriodos() {
  return useQuery({ queryKey: ["periodos"], queryFn: fetchPeriodos });
}

export function useSemanas(periodoId: string | undefined) {
  return useQuery({
    queryKey: ["semanas", periodoId],
    queryFn: () => fetchSemanas(periodoId as string),
    enabled: Boolean(periodoId),
  });
}

/**
 * Centros de costo (proyectos) que el trabajador eligió explícitamente para este período.
 * Si no ha elegido ninguno (caso por defecto) queda una lista vacía y `useColumnas` cae en
 * mostrar todos los proyectos activos, que hoy son los 5 fijos.
 */
export function useProyectosSeleccionados(trabajadorId: string | undefined, periodoId: string | undefined) {
  return useQuery({
    queryKey: ["proyectos-seleccionados", trabajadorId, periodoId],
    queryFn: () => fetchProyectosSeleccionadosIds(trabajadorId as string, periodoId as string),
    enabled: Boolean(trabajadorId && periodoId),
  });
}

export function useUpdateProyectosSeleccionados(trabajadorId: string | undefined, periodoId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (proyectoIds: string[]) =>
      updateProyectosSeleccionados(trabajadorId as string, periodoId as string, proyectoIds),
    onSuccess: () => {
      toast.success("Centros de costo actualizados.");
      void queryClient.invalidateQueries({ queryKey: ["proyectos-seleccionados", trabajadorId, periodoId] });
    },
    onError: () => {
      toast.error("No fue posible actualizar los centros de costo.");
    },
  });
}

/**
 * Columnas de la tabla semanal: solo centros de costo (proyectos), sin columnas de tipos de
 * registro (horas extra, vacaciones, licencia, permiso, ausencia). Los 5 centros de costo fijos
 * (`FIXED_COST_CENTER_CODES`) siempre están presentes; el resto de proyectos activos solo
 * aparece si el trabajador los eligió explícitamente para este período.
 */
export function useColumnas(proyectosSeleccionadosIds?: string[]) {
  const proyectosQuery = useQuery({ queryKey: ["proyectos-activos"], queryFn: fetchProyectosActivos });
  const tiposQuery = useQuery({ queryKey: ["tipos-registro-activos"], queryFn: fetchTiposRegistroActivos });

  const columnas = useMemo<ColumnaRegistro[]>(() => {
    const tipoOrd = tiposQuery.data?.find((tipo) => tipo.codigo === "ORD");
    if (!tipoOrd) return [];

    const proyectosBase = proyectosQuery.data ?? [];
    const fijos = proyectosBase.filter((proyecto) =>
      (FIXED_COST_CENTER_CODES as readonly string[]).includes(proyecto.codigo),
    );
    const seleccionadosExtra = proyectosBase.filter(
      (proyecto) =>
        !(FIXED_COST_CENTER_CODES as readonly string[]).includes(proyecto.codigo) &&
        (proyectosSeleccionadosIds ?? []).includes(proyecto.id),
    );

    return [...fijos, ...seleccionadosExtra].map((proyecto) => ({
      id: proyecto.id,
      tipoRegistroId: tipoOrd.id,
      proyectoId: proyecto.id,
      codigo: proyecto.codigo,
      etiqueta: proyecto.nombre,
      categoria: tipoOrd.categoria,
      esHoraExtra: tipoOrd.es_hora_extra,
    }));
  }, [proyectosQuery.data, tiposQuery.data, proyectosSeleccionadosIds]);

  return {
    columnas,
    proyectosDisponibles: proyectosQuery.data ?? [],
    isLoading: proyectosQuery.isLoading || tiposQuery.isLoading,
    refetchProyectos: proyectosQuery.refetch,
  };
}

/** Exporta a CSV TODAS las semanas de un período, tengan o no horas cargadas. */
export function useExportarPeriodo(
  trabajadorId: string | undefined,
  periodo: Periodo | undefined,
  semanas: Semana[],
  columns: ColumnaRegistro[],
) {
  return useMutation({
    mutationFn: async () => {
      if (!trabajadorId || !periodo) return;

      const registros = await fetchRegistrosPeriodo(trabajadorId, periodo.fecha_inicio, periodo.fecha_fin);
      const hours = mapRegistrosToHours(registros, columns);
      const semanasConDias = semanas.map((semana) => ({
        numeroSemana: semana.numero_semana,
        days: createWeekDays(semana.fecha_inicio, semana.fecha_fin),
      }));

      const csv = rowsToCsv(buildCsvRowsPeriodo(semanasConDias, columns, hours));
      const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `registro-horas-${periodo.nombre.replaceAll(" ", "-").toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("Se descargó el período completo en un archivo CSV compatible con Microsoft Excel.");
    },
    onError: () => {
      toast.error("No fue posible exportar el período.");
    },
  });
}

function mapRegistrosToHours(registros: RegistroHoras[], columns: ColumnaRegistro[]): HoursByDateAndColumn {
  const columnaPorProyecto = new Map(
    columns.filter((columna) => columna.proyectoId).map((columna) => [columna.proyectoId as string, columna.id]),
  );
  const columnaPorTipoRegistro = new Map(
    columns.filter((columna) => !columna.proyectoId).map((columna) => [columna.tipoRegistroId, columna.id]),
  );

  const hours: HoursByDateAndColumn = {};

  for (const registro of registros) {
    const columnId = registro.proyecto_id
      ? columnaPorProyecto.get(registro.proyecto_id)
      : columnaPorTipoRegistro.get(registro.tipo_registro_id);

    if (!columnId) continue;

    hours[registro.fecha] = { ...hours[registro.fecha], [columnId]: Number(registro.horas) };
  }

  return hours;
}

function derivarEstadoPeriodo(estados: PlanillaEstado[]): PlanillaEstado {
  if (!estados.length) return "BORRADOR";
  if (estados.some((estado) => estado === "DEVUELTA")) return "DEVUELTA";
  if (estados.every((estado) => estado === "BORRADOR")) return "BORRADOR";
  if (estados.every((estado) => estado === "APROBADA")) return "APROBADA";
  return "ENVIADA";
}

/**
 * Estado y acciones de la tabla de TODO el período (mes completo, ciclo 25 al 24) para el
 * trabajador actual. Por debajo sigue existiendo una `planilla_semanal` por cada semana del
 * período (así el esquema y las políticas RLS no cambian), pero Guardar/Enviar operan sobre
 * todas esas semanas a la vez.
 */
export function usePeriodoPlanilla(
  trabajadorId: string | undefined,
  periodo: Periodo | undefined,
  semanas: Semana[],
  columns: ColumnaRegistro[],
) {
  const queryClient = useQueryClient();

  const feriadosQuery = useQuery({
    queryKey: ["feriados", periodo?.fecha_inicio, periodo?.fecha_fin],
    queryFn: () => fetchFeriados((periodo as Periodo).fecha_inicio, (periodo as Periodo).fecha_fin),
    enabled: Boolean(periodo),
  });

  const days = useMemo(
    () => (periodo ? createWeekDays(periodo.fecha_inicio, periodo.fecha_fin, feriadosQuery.data) : []),
    [periodo, feriadosQuery.data],
  );

  const semanaIds = useMemo(() => semanas.map((semana) => semana.id), [semanas]);

  const planillasQuery = useQuery({
    queryKey: ["planillas-periodo", trabajadorId, semanaIds],
    queryFn: () =>
      Promise.all(semanas.map((semana) => ensurePlanilla(trabajadorId as string, semana.id, semana.periodo_id))),
    enabled: Boolean(trabajadorId) && semanas.length > 0,
  });

  const planillaIdPorSemanaId = new Map((planillasQuery.data ?? []).map((p) => [p.semana_id, p.id]));
  const planillaIds = (planillasQuery.data ?? []).map((p) => p.id);

  function planillaIdParaFecha(fecha: string): string | undefined {
    const semana = semanas.find((s) => s.fecha_inicio <= fecha && fecha <= s.fecha_fin);
    return semana ? planillaIdPorSemanaId.get(semana.id) : undefined;
  }

  const estadoPeriodo = derivarEstadoPeriodo((planillasQuery.data ?? []).map((p) => p.estado));
  const isSubmitted = estadoPeriodo !== "BORRADOR" && estadoPeriodo !== "DEVUELTA";

  const devolucionQuery = useQuery({
    queryKey: ["ultima-devolucion", planillaIds],
    queryFn: () => fetchUltimaDevolucion(planillaIds),
    enabled: estadoPeriodo === "DEVUELTA" && planillaIds.length > 0,
  });

  const registrosQuery = useQuery({
    queryKey: ["registros-periodo", planillaIds],
    queryFn: () => fetchRegistrosPorPlanillas(planillaIds),
    enabled: planillasQuery.isSuccess && planillaIds.length > 0,
  });

  const horasEsperadasQuery = useQuery({
    queryKey: ["horas-esperadas", trabajadorId, periodo?.fecha_inicio],
    queryFn: () => fetchHorasEsperadasPorDia(trabajadorId as string, (periodo as Periodo).fecha_inicio),
    enabled: Boolean(trabajadorId) && Boolean(periodo),
  });

  const [draft, dispatch] = useReducer(weekDraftReducer, initialWeekDraft);
  const loadedForPeriodoId = useRef<string | null>(null);

  const isReady = Boolean(periodo) && planillasQuery.isSuccess && registrosQuery.isSuccess;

  useEffect(() => {
    if (!isReady || !periodo || loadedForPeriodoId.current === periodo.id) return;

    loadedForPeriodoId.current = periodo.id;
    dispatch({ type: "loaded", hours: mapRegistrosToHours(registrosQuery.data ?? [], columns) });
    // Las columnas pueden cambiar cuando el trabajador ajusta sus proyectos seleccionados;
    // no queremos recargar el borrador cada vez que eso pase, solo al cambiar de período.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, periodo, registrosQuery.data]);

  const columnIds = useMemo(() => columns.map((columna) => columna.id), [columns]);

  const expectedHours = getWeekExpectedHours(days, horasEsperadasQuery.data ?? {}, feriadosQuery.data ?? new Set());
  const registeredHours = getWeekTotal(days, draft.hours, columns);
  const totales = getTotalesPorCategoria(draft.hours, columns);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!trabajadorId || !planillasQuery.data?.length) return;

      const rows: RegistroUpsert[] = days.flatMap((day) => {
        const planillaId = planillaIdParaFecha(day.date);
        if (!planillaId) return [];
        return columns.map((columna) => ({
          planilla_semanal_id: planillaId,
          trabajador_id: trabajadorId,
          fecha: day.date,
          proyecto_id: columna.proyectoId,
          tipo_registro_id: columna.tipoRegistroId,
          horas: Number(draft.hours[day.date]?.[columna.id] || 0),
        }));
      });

      await upsertRegistros(rows);
    },
    onSuccess: () => {
      dispatch({ type: "saved" });
      toast.success("Cambios guardados.");
      void queryClient.invalidateQueries({ queryKey: ["registros-periodo", planillaIds] });
    },
    onError: () => {
      toast.error("No fue posible guardar los cambios del período.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!planillasQuery.data?.length) return;
      await saveMutation.mutateAsync();

      await Promise.all(
        planillasQuery.data.map((planilla) => {
          const semana = semanas.find((s) => s.id === planilla.semana_id);
          if (!semana) return Promise.resolve();

          const hoursSemana: HoursByDateAndColumn = {};
          for (const day of days) {
            if (day.date >= semana.fecha_inicio && day.date <= semana.fecha_fin && draft.hours[day.date]) {
              hoursSemana[day.date] = draft.hours[day.date];
            }
          }
          return submitPlanilla(planilla.id, getTotalesPorCategoria(hoursSemana, columns));
        }),
      );
    },
    onSuccess: () => {
      toast.success("Período enviado para aprobación.");
      void queryClient.invalidateQueries({ queryKey: ["planillas-periodo", trabajadorId, semanaIds] });
    },
    onError: () => {
      toast.error("No fue posible enviar el período para aprobación.");
    },
  });

  function setHour(date: string, columnId: string, rawValue: number) {
    if (isSubmitted) return;

    const { clamped } = applySetHour(draft, date, columnId, columnIds, rawValue);
    if (clamped) {
      toast.warning(`El total diario no puede superar ${formatHours(MAX_DAILY_HOURS)} horas.`);
    }

    dispatch({ type: "set-hour", date, columnId, columnIds, value: rawValue });
  }

  function setActiveDate(date: string | null) {
    dispatch({ type: "set-active-date", date });
  }

  return {
    isLoading: planillasQuery.isLoading || registrosQuery.isLoading || horasEsperadasQuery.isLoading,
    days,
    estado: estadoPeriodo,
    isSubmitted,
    comentarioDevolucion: estadoPeriodo === "DEVUELTA" ? (devolucionQuery.data?.comentario ?? null) : null,
    hours: draft.hours,
    activeDate: draft.activeDate,
    dirty: draft.dirty,
    expectedHours,
    registeredHours,
    remainingHours: Math.max(0, expectedHours - registeredHours),
    totales,
    getDayTotal: (date: string) => getDayTotal(draft.hours, columns, date),
    getColumnTotal: (columnId: string) => getColumnTotal(draft.hours, columnId),
    setHour,
    setActiveDate,
    save: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    submit: () => submitMutation.mutate(),
    isSubmitting: submitMutation.isPending,
  };
}
