import { getMaxForInput, roundHours } from "./domain";
import type { HoursByDateAndColumn } from "./domain";

export interface WeekDraft {
  hours: HoursByDateAndColumn;
  activeDate: string | null;
  dirty: boolean;
}

export type WeekDraftAction =
  | { type: "loaded"; hours: HoursByDateAndColumn }
  | { type: "set-hour"; date: string; columnId: string; columnIds: string[]; value: number }
  | { type: "set-active-date"; date: string | null }
  | { type: "saved" }
  | { type: "reset" };

export const initialWeekDraft: WeekDraft = {
  hours: {},
  activeDate: null,
  dirty: false,
};

export interface SetHourResult {
  draft: WeekDraft;
  clamped: boolean;
  appliedValue: number;
}

/** Igual que dispatch({type:"set-hour",...}) pero informa si el valor fue recortado por el tope diario. */
export function applySetHour(
  draft: WeekDraft,
  date: string,
  columnId: string,
  columnIds: string[],
  rawValue: number,
): SetHourResult {
  const safeValue = Number.isFinite(rawValue) && rawValue >= 0 ? rawValue : 0;
  const maximum = getMaxForInput(draft.hours, columnIds, date, columnId);
  const appliedValue = roundHours(Math.min(safeValue, maximum));
  const clamped = safeValue > maximum;

  return {
    draft: {
      ...draft,
      hours: {
        ...draft.hours,
        [date]: { ...draft.hours[date], [columnId]: appliedValue },
      },
      activeDate: date,
      dirty: true,
    },
    clamped,
    appliedValue,
  };
}

export function weekDraftReducer(draft: WeekDraft, action: WeekDraftAction): WeekDraft {
  switch (action.type) {
    case "loaded":
      return { hours: action.hours, activeDate: null, dirty: false };

    case "set-hour":
      return applySetHour(draft, action.date, action.columnId, action.columnIds, action.value).draft;

    case "set-active-date":
      return { ...draft, activeDate: action.date };

    case "saved":
      return { ...draft, dirty: false };

    case "reset":
      return initialWeekDraft;

    default:
      return draft;
  }
}
