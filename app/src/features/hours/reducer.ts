import { getMaxForInput, roundHours } from "./domain";
import type { HoursByDateAndCenter, ObservationsByDate } from "./domain";

export interface HoursDraft {
  hours: HoursByDateAndCenter;
  observations: ObservationsByDate;
  selectedCenterIds: string[];
  activeDate: string | null;
  dirty: boolean;
}

export type HoursDraftAction =
  | {
      type: "loaded";
      hours: HoursByDateAndCenter;
      observations: ObservationsByDate;
      selectedCenterIds: string[];
    }
  | { type: "set-hour"; date: string; centerId: string; value: number }
  | { type: "set-observation"; date: string; value: string }
  | { type: "set-active-date"; date: string | null }
  | { type: "apply-centers"; centerIds: string[] }
  | { type: "merge-days"; days: DaySnapshot[] }
  | { type: "saved" }
  | { type: "reset" };

/** Foto de un día completo (horas por centro + observación) usada para copiar días. */
export interface DaySnapshot {
  date: string;
  hours: Record<string, number>;
  observation: string;
}

export const initialHoursDraft: HoursDraft = {
  hours: {},
  observations: {},
  selectedCenterIds: [],
  activeDate: null,
  dirty: false,
};

export interface SetHourResult {
  draft: HoursDraft;
  clamped: boolean;
  appliedValue: number;
}

/** Igual que dispatch({type:"set-hour",...}) pero informa si el valor fue recortado por el tope diario. */
export function applySetHour(
  draft: HoursDraft,
  date: string,
  centerId: string,
  rawValue: number,
): SetHourResult {
  const safeValue = Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : 0;
  const maximum = getMaxForInput(draft.hours, draft.selectedCenterIds, date, centerId);
  const appliedValue = roundHours(Math.min(safeValue, maximum));
  const clamped = safeValue > maximum;

  return {
    draft: {
      ...draft,
      hours: {
        ...draft.hours,
        [date]: { ...draft.hours[date], [centerId]: appliedValue },
      },
      activeDate: date,
      dirty: true,
    },
    clamped,
    appliedValue,
  };
}

export function hoursDraftReducer(draft: HoursDraft, action: HoursDraftAction): HoursDraft {
  switch (action.type) {
    case "loaded":
      return {
        hours: action.hours,
        observations: action.observations,
        selectedCenterIds: action.selectedCenterIds,
        activeDate: null,
        dirty: false,
      };

    case "set-hour":
      return applySetHour(draft, action.date, action.centerId, action.value).draft;

    case "set-observation":
      return {
        ...draft,
        observations: { ...draft.observations, [action.date]: action.value },
        activeDate: action.date,
        dirty: true,
      };

    case "set-active-date":
      return { ...draft, activeDate: action.date };

    case "apply-centers":
      return { ...draft, selectedCenterIds: action.centerIds, dirty: true };

    case "merge-days": {
      if (!action.days.length) return draft;

      const hours = { ...draft.hours };
      const observations = { ...draft.observations };

      for (const day of action.days) {
        hours[day.date] = Object.fromEntries(
          draft.selectedCenterIds.map((id) => [id, Number(day.hours[id] || 0)]),
        );
        observations[day.date] = day.observation || "";
      }

      return { ...draft, hours, observations, dirty: true };
    }

    case "saved":
      return { ...draft, dirty: false };

    case "reset":
      return initialHoursDraft;

    default:
      return draft;
  }
}
