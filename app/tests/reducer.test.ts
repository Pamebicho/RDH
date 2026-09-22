import { describe, expect, it } from "vitest";
import { applySetHour, initialWeekDraft, weekDraftReducer, type WeekDraft } from "@/features/hours/reducer";

const columnIds = ["ord", "hex"];

describe("weekDraftReducer", () => {
  it("loaded reemplaza las horas y limpia activeDate/dirty", () => {
    const draft: WeekDraft = { hours: { "2026-01-05": { ord: 8 } }, activeDate: "2026-01-05", dirty: true };

    const next = weekDraftReducer(draft, { type: "loaded", hours: { "2026-01-06": { ord: 4 } } });

    expect(next).toEqual({ hours: { "2026-01-06": { ord: 4 } }, activeDate: null, dirty: false });
  });

  it("set-hour guarda el valor, marca dirty y activeDate", () => {
    const next = weekDraftReducer(initialWeekDraft, {
      type: "set-hour",
      date: "2026-01-05",
      columnId: "ord",
      columnIds,
      value: 8,
    });

    expect(next.hours["2026-01-05"].ord).toBe(8);
    expect(next.dirty).toBe(true);
    expect(next.activeDate).toBe("2026-01-05");
  });

  it("set-active-date solo cambia activeDate", () => {
    const next = weekDraftReducer(initialWeekDraft, { type: "set-active-date", date: "2026-01-05" });
    expect(next).toEqual({ ...initialWeekDraft, activeDate: "2026-01-05" });
  });

  it("saved limpia dirty sin tocar las horas", () => {
    const draft: WeekDraft = { hours: { "2026-01-05": { ord: 8 } }, activeDate: "2026-01-05", dirty: true };
    const next = weekDraftReducer(draft, { type: "saved" });
    expect(next).toEqual({ ...draft, dirty: false });
  });

  it("reset vuelve al estado inicial", () => {
    const draft: WeekDraft = { hours: { "2026-01-05": { ord: 8 } }, activeDate: "2026-01-05", dirty: true };
    expect(weekDraftReducer(draft, { type: "reset" })).toEqual(initialWeekDraft);
  });
});

describe("applySetHour", () => {
  it("aplica el valor pedido cuando no excede el tope diario", () => {
    const result = applySetHour(initialWeekDraft, "2026-01-05", "ord", columnIds, 8);

    expect(result.appliedValue).toBe(8);
    expect(result.clamped).toBe(false);
    expect(result.draft.hours["2026-01-05"].ord).toBe(8);
  });

  it("recorta al tope diario (24h) considerando otras columnas del mismo día", () => {
    const draft: WeekDraft = { hours: { "2026-01-05": { hex: 20 } }, activeDate: null, dirty: false };

    const result = applySetHour(draft, "2026-01-05", "ord", columnIds, 10);

    expect(result.clamped).toBe(true);
    expect(result.appliedValue).toBe(4);
    expect(result.draft.hours["2026-01-05"]).toEqual({ hex: 20, ord: 4 });
  });

  it("valores negativos o no numéricos se tratan como 0", () => {
    const result = applySetHour(initialWeekDraft, "2026-01-05", "ord", columnIds, Number.NaN);
    expect(result.appliedValue).toBe(0);
    expect(result.clamped).toBe(false);
  });
});
