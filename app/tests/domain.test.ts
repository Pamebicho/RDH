import { describe, expect, it } from "vitest";
import {
  createMonthDays,
  findPreviousEditableDate,
  formatHours,
  formatPercent,
  getColumnTotal,
  getDayTotal,
  getMaxForInput,
  getPreviousPeriod,
  getRegisteredHours,
  rowsToCsv,
  roundHours,
  type CostCenter,
  type HoursByDateAndCenter,
} from "@/features/hours/domain";

const centers: CostCenter[] = [
  { id: "20-013", name: "Gestión Operaciones" },
  { id: "10-010", name: "Otros TI" },
];

describe("createMonthDays", () => {
  it("genera todos los días de julio 2026 marcando correctamente los fines de semana", () => {
    const days = createMonthDays("2026-07");

    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: "2026-07-01", label: "01 Mié", weekend: false });
    expect(days.find((day) => day.date === "2026-07-04")?.weekend).toBe(true); // sábado
    expect(days.find((day) => day.date === "2026-07-05")?.weekend).toBe(true); // domingo
  });
});

describe("totales de horas", () => {
  const hours: HoursByDateAndCenter = {
    "2026-07-01": { "20-013": 4, "10-010": 3.5 },
    "2026-07-02": { "20-013": 8 },
  };

  it("suma las horas del día entre los centros seleccionados", () => {
    expect(getDayTotal(hours, centers, "2026-07-01")).toBe(7.5);
    expect(getDayTotal(hours, centers, "2026-07-03")).toBe(0);
  });

  it("suma el total de una columna (centro) en todo el período", () => {
    expect(getColumnTotal(hours, "20-013")).toBe(12);
    expect(getColumnTotal(hours, "10-010")).toBe(3.5);
  });

  it("suma el total registrado en todos los días del período", () => {
    const days = createMonthDays("2026-07");
    expect(getRegisteredHours(days, hours, centers)).toBe(15.5);
  });
});

describe("getMaxForInput", () => {
  const centerIds = centers.map((center) => center.id);

  it("limita el máximo permitido para no superar las 24h/día entre todos los centros", () => {
    const hours: HoursByDateAndCenter = { "2026-07-01": { "20-013": 20 } };
    expect(getMaxForInput(hours, centerIds, "2026-07-01", "10-010")).toBe(4);
  });

  it("nunca retorna un máximo negativo", () => {
    const hours: HoursByDateAndCenter = { "2026-07-01": { "20-013": 30 } };
    expect(getMaxForInput(hours, centerIds, "2026-07-01", "10-010")).toBe(0);
  });
});

describe("findPreviousEditableDate", () => {
  it("salta los fines de semana al buscar el día hábil anterior", () => {
    const days = createMonthDays("2026-07");
    // 2026-07-06 es lunes; el hábil anterior es el viernes 2026-07-03
    expect(findPreviousEditableDate(days, "2026-07-06")).toBe("2026-07-03");
  });

  it("retorna null si no hay un día hábil anterior dentro del período", () => {
    const days = createMonthDays("2026-07");
    expect(findPreviousEditableDate(days, "2026-07-01")).toBeNull();
  });
});

describe("getPreviousPeriod", () => {
  it("retrocede un mes, incluyendo el cambio de año", () => {
    expect(getPreviousPeriod("2026-07")).toBe("2026-06");
    expect(getPreviousPeriod("2026-01")).toBe("2025-12");
  });
});

describe("formatHours / formatPercent", () => {
  it("formatea con coma decimal y un dígito, estilo es-CL", () => {
    expect(formatHours(7.5)).toBe("7,5");
    expect(formatHours(0)).toBe("0,0");
    expect(formatPercent(45.666)).toBe("45,7%");
  });
});

describe("roundHours", () => {
  it("redondea a dos decimales evitando errores de punto flotante", () => {
    expect(roundHours(0.1 + 0.2)).toBe(0.3);
  });
});

describe("rowsToCsv", () => {
  it("separa celdas con punto y coma y escapa comillas dobles", () => {
    const csv = rowsToCsv([["Día", 'Centro "A"'], ["01 Mié", "2,5"]]);
    expect(csv).toBe('"Día";"Centro ""A"""\r\n"01 Mié";"2,5"');
  });
});
