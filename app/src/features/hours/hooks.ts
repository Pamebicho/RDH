import { useEffect, useMemo, useReducer, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Periodo, RegistroHoras, Semana } from "@/types/database.types";
import {
  ensurePlanilla,
  fetchFeriados,
  fetchHorasEsperadasPorDia,
  fetchPeriodos,
  fetchProyectosActivos,
  fetchProyectosSeleccionadosIds,
  fetchRegistros,
  fetchRegistrosPeriodo,
  fetchSemanas,
  fetchTiposRegistroActivos,
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

/** Estado y acciones de la tabla de UNA semana (planilla semanal) para el trabajador actual. */
export function useWeekPlanilla(trabajadorId: string | undefined, semana: Semana, columns: ColumnaRegistro[]) {
  const queryClient = useQueryClient();

  const feriadosQuery = useQuery({
    queryKey: ["feriados", semana.fecha_inicio, semana.fecha_fin],
    queryFn: () => fetchFeriados(semana.fecha_inicio, semana.fecha_fin),
  });

  const days = useMemo(
    () => createWeekDays(semana.fecha_inicio, semana.fecha_fin, feriadosQuery.data),
    [semana.fecha_inicio, semana.fecha_fin, feriadosQuery.data],
  );

  const planillaQuery = useQuery({
    queryKey: ["planilla", trabajadorId, semana.id],
    queryFn: () => ensurePlanilla(trabajadorId as string, semana.id, semana.periodo_id),
    enabled: Boolean(trabajadorId),
  });

  const planillaId = planillaQuery.data?.id;
  const isSubmitted = (planillaQuery.data?.estado ?? "BORRADOR") !== "BORRADOR" && (planillaQuery.data?.estado ?? "BORRADOR") !== "DEVUELTA";

  const registrosQuery = useQuery({
    queryKey: ["registros", planillaId],
    queryFn: () => fetchRegistros(planillaId as string),
    enabled: Boolean(planillaId),
  });

  const horasEsperadasQuery = useQuery({
    queryKey: ["horas-esperadas", trabajadorId, semana.fecha_inicio],
    queryFn: () => fetchHorasEsperadasPorDia(trabajadorId as string, semana.fecha_inicio),
    enabled: Boolean(trabajadorId),
  });

  const [draft, dispatch] = useReducer(weekDraftReducer, initialWeekDraft);
  const loadedForPlanillaId = useRef<string | null>(null);

  const isReady = Boolean(planillaId) && registrosQuery.isSuccess;

  useEffect(() => {
    if (!isReady || !planillaId || loadedForPlanillaId.current === planillaId) return;

    loadedForPlanillaId.current = planillaId;
    dispatch({ type: "loaded", hours: mapRegistrosToHours(registrosQuery.data ?? [], columns) });
    // Las columnas pueden cambiar cuando el trabajador ajusta sus proyectos seleccionados;
    // no queremos recargar el borrador cada vez que eso pase, solo al cambiar de planilla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, planillaId, registrosQuery.data]);

  const columnIds = useMemo(() => columns.map((columna) => columna.id), [columns]);

  const expectedHours = getWeekExpectedHours(days, horasEsperadasQuery.data ?? {}, feriadosQuery.data ?? new Set());
  const registeredHours = getWeekTotal(days, draft.hours, columns);
  const totales = getTotalesPorCategoria(draft.hours, columns);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!planillaId || !trabajadorId) return;

      const rows: RegistroUpsert[] = days.flatMap((day) =>
        columns.map((columna) => ({
          planilla_semanal_id: planillaId,
          trabajador_id: trabajadorId,
          fecha: day.date,
          proyecto_id: columna.proyectoId,
          tipo_registro_id: columna.tipoRegistroId,
          horas: Number(draft.hours[day.date]?.[columna.id] || 0),
        })),
      );

      await upsertRegistros(rows);
    },
    onSuccess: () => {
      dispatch({ type: "saved" });
      toast.success(`Semana ${semana.numero_semana}: cambios guardados.`);
      void queryClient.invalidateQueries({ queryKey: ["registros", planillaId] });
    },
    onError: () => {
      toast.error("No fue posible guardar los cambios de esta semana.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!planillaId) return;
      await saveMutation.mutateAsync();
      await submitPlanilla(planillaId, totales);
    },
    onSuccess: () => {
      toast.success(`Semana ${semana.numero_semana} enviada para aprobación.`);
      void queryClient.invalidateQueries({ queryKey: ["planilla", trabajadorId, semana.id] });
    },
    onError: () => {
      toast.error("No fue posible enviar la semana para aprobación.");
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
    isLoading: planillaQuery.isLoading || registrosQuery.isLoading || horasEsperadasQuery.isLoading,
    days,
    estado: planillaQuery.data?.estado ?? "BORRADOR",
    isSubmitted,
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
