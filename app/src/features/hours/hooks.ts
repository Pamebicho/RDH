import { useEffect, useMemo, useReducer, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RegistroHoras, Semana } from "@/types/database.types";
import {
  ensurePlanilla,
  fetchFeriados,
  fetchHorasEsperadasPorDia,
  fetchPeriodos,
  fetchProyectosActivos,
  fetchRegistros,
  fetchSemanas,
  fetchTiposRegistroActivos,
  submitPlanilla,
  upsertRegistros,
  type RegistroUpsert,
} from "./api";
import {
  buildCsvRows,
  createWeekDays,
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
 * Columnas de la tabla semanal: los centros de costo son fijos para todos los trabajadores en
 * todos los períodos (no hay selección por trabajador/período), más un tipo de registro sin
 * proyecto por cada tipo que no lo requiera (extraordinarias, vacaciones, licencia, etc.).
 */
export function useColumnas() {
  const proyectosQuery = useQuery({ queryKey: ["proyectos-activos"], queryFn: fetchProyectosActivos });
  const tiposQuery = useQuery({ queryKey: ["tipos-registro-activos"], queryFn: fetchTiposRegistroActivos });

  const columnas = useMemo<ColumnaRegistro[]>(() => {
    const tipoOrd = tiposQuery.data?.find((tipo) => tipo.codigo === "ORD");

    const columnasProyecto: ColumnaRegistro[] = tipoOrd
      ? (proyectosQuery.data ?? []).map((proyecto) => ({
          id: proyecto.id,
          tipoRegistroId: tipoOrd.id,
          proyectoId: proyecto.id,
          codigo: proyecto.codigo,
          etiqueta: proyecto.nombre,
          categoria: tipoOrd.categoria,
          esHoraExtra: tipoOrd.es_hora_extra,
        }))
      : [];

    const columnasSinProyecto: ColumnaRegistro[] = (tiposQuery.data ?? [])
      .filter((tipo) => !tipo.requiere_proyecto)
      .map((tipo) => ({
        id: tipo.codigo,
        tipoRegistroId: tipo.id,
        proyectoId: null,
        codigo: tipo.codigo,
        etiqueta: tipo.nombre,
        categoria: tipo.categoria,
        esHoraExtra: tipo.es_hora_extra,
      }));

    return [...columnasProyecto, ...columnasSinProyecto];
  }, [proyectosQuery.data, tiposQuery.data]);

  return {
    columnas,
    isLoading: proyectosQuery.isLoading || tiposQuery.isLoading,
  };
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
  const days = useMemo(() => createWeekDays(semana.fecha_inicio, semana.fecha_fin), [semana.fecha_inicio, semana.fecha_fin]);

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

  const feriadosQuery = useQuery({
    queryKey: ["feriados", semana.fecha_inicio, semana.fecha_fin],
    queryFn: () => fetchFeriados(semana.fecha_inicio, semana.fecha_fin),
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

  function exportCsv() {
    const rows = buildCsvRows(days, columns, draft.hours);
    const csv = rowsToCsv(rows);
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registro-horas-semana-${semana.numero_semana}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Se descargó un archivo CSV compatible con Microsoft Excel.");
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
    exportCsv,
  };
}
