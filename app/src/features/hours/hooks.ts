import { useEffect, useMemo, useReducer, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import type { CostCenter as ApiCostCenter, DailyNote, TimeEntry } from "@/types/database.types";
import {
  ensurePeriod,
  fetchCostCenters,
  fetchDailyNotes,
  fetchPeriod,
  fetchPeriodDefinitions,
  fetchSelectedCenterIds,
  fetchTimeEntries,
  submitPeriod,
  updateSelectedCenterIds,
  upsertDailyNotes,
  upsertTimeEntries,
} from "./api";
import {
  buildCsvRows,
  createMonthDays,
  findPreviousEditableDate,
  formatHours,
  getColumnTotal,
  getDayTotal,
  getPreviousPeriod,
  getRegisteredHours,
  MAX_DAILY_HOURS,
  roundHours,
  rowsToCsv,
  type CostCenter,
  type DayInfo,
  type HoursByDateAndCenter,
  type ObservationsByDate,
} from "./domain";
import { applySetHour, hoursDraftReducer, initialHoursDraft, type DaySnapshot } from "./reducer";

export function usePeriodDefinitions() {
  return useQuery({ queryKey: ["period-definitions"], queryFn: fetchPeriodDefinitions });
}

export function useCostCenters() {
  return useQuery({ queryKey: ["cost-centers"], queryFn: fetchCostCenters });
}

function toHoursMap(entries: TimeEntry[]): HoursByDateAndCenter {
  const map: HoursByDateAndCenter = {};
  for (const entry of entries) {
    map[entry.entry_date] = { ...map[entry.entry_date], [entry.cost_center_id]: Number(entry.hours) };
  }
  return map;
}

function toObservationsMap(notes: DailyNote[]): ObservationsByDate {
  return Object.fromEntries(notes.map((note) => [note.entry_date, note.observation]));
}

export function useHoursRegister(period: string) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const periodQuery = useQuery({
    queryKey: ["period", userId, period],
    queryFn: () => ensurePeriod(userId as string, period),
    enabled: Boolean(userId),
  });

  const periodId = periodQuery.data?.id;

  const definitionsQuery = usePeriodDefinitions();
  const allCentersQuery = useCostCenters();

  const selectedIdsQuery = useQuery({
    queryKey: ["period-cost-centers", periodId],
    queryFn: () => fetchSelectedCenterIds(periodId as string),
    enabled: Boolean(periodId),
  });

  const entriesQuery = useQuery({
    queryKey: ["time-entries", periodId],
    queryFn: () => fetchTimeEntries(periodId as string),
    enabled: Boolean(periodId),
  });

  const notesQuery = useQuery({
    queryKey: ["daily-notes", periodId],
    queryFn: () => fetchDailyNotes(periodId as string),
    enabled: Boolean(periodId),
  });

  const [draft, dispatch] = useReducer(hoursDraftReducer, initialHoursDraft);
  const loadedForPeriodId = useRef<string | null>(null);

  const isReady =
    Boolean(periodId) &&
    entriesQuery.isSuccess &&
    notesQuery.isSuccess &&
    selectedIdsQuery.isSuccess;

  useEffect(() => {
    if (!isReady || !periodId || loadedForPeriodId.current === periodId) {
      return;
    }

    loadedForPeriodId.current = periodId;
    dispatch({
      type: "loaded",
      hours: toHoursMap(entriesQuery.data ?? []),
      observations: toObservationsMap(notesQuery.data ?? []),
      selectedCenterIds: selectedIdsQuery.data ?? [],
    });
  }, [isReady, periodId, entriesQuery.data, notesQuery.data, selectedIdsQuery.data]);

  useEffect(() => {
    loadedForPeriodId.current = null;
    dispatch({ type: "reset" });
  }, [period]);

  useEffect(() => {
    if (!draft.dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draft.dirty]);

  const days: DayInfo[] = useMemo(() => createMonthDays(period), [period]);

  const allCenters: ApiCostCenter[] = useMemo(() => allCentersQuery.data ?? [], [allCentersQuery.data]);
  const selectedCenters: CostCenter[] = useMemo(
    () => allCenters.filter((center) => draft.selectedCenterIds.includes(center.id)),
    [allCenters, draft.selectedCenterIds],
  );

  const periodDefinition = definitionsQuery.data?.find((definition) => definition.period === period);
  const expectedHours = periodDefinition?.expected_hours ?? 0;
  const registeredHours = getRegisteredHours(days, draft.hours, selectedCenters);
  const remainingHours = Math.max(0, roundHours(expectedHours - registeredHours));
  const progress =
    expectedHours > 0 ? Math.min(100, roundHours((registeredHours / expectedHours) * 100)) : 0;

  const status = periodQuery.data?.status ?? "editing";
  const isSubmitted = status === "submitted";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!periodId) return;

      const timeEntryRows = days.flatMap((day) =>
        selectedCenters.map((center) => ({
          period_id: periodId,
          entry_date: day.date,
          cost_center_id: center.id,
          hours: Number(draft.hours[day.date]?.[center.id] || 0),
        })),
      );

      const noteRows = days
        .filter((day) => (draft.observations[day.date] ?? "").length > 0)
        .map((day) => ({
          period_id: periodId,
          entry_date: day.date,
          observation: draft.observations[day.date] ?? "",
        }));

      await upsertTimeEntries(timeEntryRows);
      await upsertDailyNotes(noteRows);
    },
    onSuccess: () => {
      dispatch({ type: "saved" });
      toast.success("El registro quedó guardado en la base de datos.");
      void queryClient.invalidateQueries({ queryKey: ["time-entries", periodId] });
      void queryClient.invalidateQueries({ queryKey: ["daily-notes", periodId] });
    },
    onError: () => {
      toast.error("No fue posible guardar los cambios. Inténtalo nuevamente.");
    },
  });

  const applyCentersMutation = useMutation({
    mutationFn: async (centerIds: string[]) => {
      if (!periodId) return;
      await updateSelectedCenterIds(periodId, centerIds);
      return centerIds;
    },
    onSuccess: (centerIds) => {
      if (!centerIds) return;
      dispatch({ type: "apply-centers", centerIds });
      toast.success("La tabla fue actualizada con los centros seleccionados.");
    },
    onError: () => {
      toast.error("No fue posible actualizar los centros de costo.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!periodId) return;
      await saveMutation.mutateAsync();
      await submitPeriod(periodId);
    },
    onSuccess: () => {
      toast.success("El período fue enviado para aprobación y quedó bloqueado.");
      void queryClient.invalidateQueries({ queryKey: ["period", userId, period] });
    },
    onError: () => {
      toast.error("No fue posible enviar el período para aprobación.");
    },
  });

  function setHour(date: string, centerId: string, rawValue: number) {
    if (isSubmitted) return;

    const { clamped } = applySetHour(draft, date, centerId, rawValue);
    if (clamped) {
      toast.warning(`El total diario no puede superar ${formatHours(MAX_DAILY_HOURS)} horas.`);
    }

    dispatch({ type: "set-hour", date, centerId, value: rawValue });
  }

  function setObservation(date: string, value: string) {
    if (isSubmitted) return;
    dispatch({ type: "set-observation", date, value });
  }

  function setActiveDate(date: string | null) {
    dispatch({ type: "set-active-date", date });
  }

  function copyPreviousDay() {
    if (!draft.activeDate) {
      toast.warning("Selecciona primero un día de la tabla.");
      return;
    }

    const previousDate = findPreviousEditableDate(days, draft.activeDate);
    if (!previousDate) {
      toast.warning("No existe un día anterior disponible para copiar.");
      return;
    }

    const snapshot: DaySnapshot = {
      date: draft.activeDate,
      hours: draft.hours[previousDate] ?? {},
      observation: draft.observations[previousDate] ?? "",
    };

    dispatch({ type: "merge-days", days: [snapshot] });
    toast.success("Se copiaron las horas del día hábil anterior.");
  }

  function copyPreviousWeek() {
    if (!draft.activeDate) {
      toast.warning("Selecciona un día de la semana que deseas completar.");
      return;
    }

    const activeIndex = days.findIndex((day) => day.date === draft.activeDate);
    const snapshots: DaySnapshot[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const target = days[activeIndex + offset];
      const source = days[activeIndex + offset - 7];

      if (target && source && !target.weekend) {
        snapshots.push({
          date: target.date,
          hours: draft.hours[source.date] ?? {},
          observation: draft.observations[source.date] ?? "",
        });
      }
    }

    if (!snapshots.length) {
      toast.warning("No hay una semana anterior disponible dentro de este período.");
      return;
    }

    dispatch({ type: "merge-days", days: snapshots });
    toast.success(`Se copiaron ${snapshots.length} días desde la semana anterior.`);
  }

  async function copyPreviousMonth() {
    if (!userId) return;

    const previousPeriod = getPreviousPeriod(period);
    const previousPeriodRow = await fetchPeriod(userId, previousPeriod);

    if (!previousPeriodRow) {
      toast.warning("No existe un registro guardado del mes anterior para copiar.");
      return;
    }

    const [previousEntries, previousNotes] = await Promise.all([
      fetchTimeEntries(previousPeriodRow.id),
      fetchDailyNotes(previousPeriodRow.id),
    ]);

    const previousHours = toHoursMap(previousEntries);
    const previousObservations = toObservationsMap(previousNotes);
    const previousDays = createMonthDays(previousPeriod);

    const snapshots: DaySnapshot[] = days
      .map((day, index) => ({ day, previousDay: previousDays[index] }))
      .filter(({ day, previousDay }) => !day.weekend && previousDay)
      .map(({ day, previousDay }) => ({
        date: day.date,
        hours: previousHours[previousDay.date] ?? {},
        observation: previousObservations[previousDay.date] ?? "",
      }));

    if (!snapshots.length) {
      toast.warning("El mes anterior no tiene días hábiles equivalentes para copiar.");
      return;
    }

    dispatch({ type: "merge-days", days: snapshots });
    toast.success("Se copiaron los datos disponibles del mes anterior.");
  }

  function exportCsv() {
    const rows = buildCsvRows(days, selectedCenters, draft.hours, draft.observations);
    const csv = rowsToCsv(rows);
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `registro-horas-${period}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Se descargó un archivo CSV compatible con Microsoft Excel.");
  }

  return {
    isLoading: periodQuery.isLoading || allCentersQuery.isLoading || definitionsQuery.isLoading,
    days,
    allCenters,
    selectedCenters,
    selectedCenterIds: draft.selectedCenterIds,
    hours: draft.hours,
    observations: draft.observations,
    activeDate: draft.activeDate,
    dirty: draft.dirty,
    status,
    isSubmitted,
    periodDefinition,
    expectedHours,
    registeredHours,
    remainingHours,
    progress,
    getDayTotal: (date: string) => getDayTotal(draft.hours, selectedCenters, date),
    getColumnTotal: (centerId: string) => getColumnTotal(draft.hours, centerId),
    setHour,
    setObservation,
    setActiveDate,
    applyCenters: (centerIds: string[]) => applyCentersMutation.mutate(centerIds),
    isApplyingCenters: applyCentersMutation.isPending,
    copyPreviousDay,
    copyPreviousWeek,
    copyPreviousMonth,
    save: () => saveMutation.mutate(),
    isSaving: saveMutation.isPending,
    submit: () => submitMutation.mutate(),
    isSubmitting: submitMutation.isPending,
    exportCsv,
  };
}
