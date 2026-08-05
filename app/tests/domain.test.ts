import { describe, expect, it } from "vitest";
import {
  buildCsvRows,
  createWeekDays,
  formatHours,
  formatPercent,
  getColumnTotal,
  getDayTotal,
  getExpectedHoursForDay,
  getMaxForInput,
  getTotalesPorCategoria,
  getWeekExpectedHours,
  getWeekTotal,
  rowsToCsv,
  roundHours,
  type ColumnaRegistro,
  type HoursByDateAndColumn,
} from "@/features/hours/domain";

const columns: ColumnaRegistro[] = [
  {
    id: "proyecto-a",
    tipoRegistroId: "tipo-ord",
    proyectoId: "proyecto-a",
    codigo: "20-013",
    etiqueta: "Gestión Operaciones",
    categoria: "TRABAJO",
    esHoraExtra: false,
  },
  {
    id: "HEX",
    tipoRegistroId: "tipo-hex",
    proyectoId: null,
    codigo: "HEX",
    etiqueta: "Horas extraordinarias",
    categoria: "TRABAJO",
    esHoraExtra: true,
  },
  {
    id: "VAC",
    tipoRegistroId: "tipo-vac",
    proyectoId: null,
    codigo: "VAC",
    etiqueta: "Vacaciones",
    categoria: "AUSENCIA",
    esHoraExtra: false,
  },
];

const horasEsperadasPorDia = { 1: 8.5, 2: 8.5, 3: 8.5, 4: 8.5, 5: 6, 6: 0, 7: 0 };

describe("createWeekDays", () => {
  it("genera los 7 días entre fechaInicio y fechaFin marcando fines de semana", () => {
    // 2026-07-27 es lunes; 2026-08-02 es domingo.
    const days = createWeekDays("2026-07-27", "2026-08-02");

    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: "2026-07-27", label: "27 Lun", weekend: false });
    expect(days[5]).toEqual({ date: "2026-08-01", label: "01 Sáb", weekend: true });
    expect(days[6]).toEqual({ date: "2026-08-02", label: "02 Dom", weekend: true });
  });
});

describe("getExpectedHoursForDay", () => {
  it("usa las horas esperadas del día de la semana (1=lunes..7=domingo)", () => {
    expect(getExpectedHoursForDay(horasEsperadasPorDia, "2026-07-27", new Set())).toBe(8.5); // lunes
    expect(getExpectedHoursForDay(horasEsperadasPorDia, "2026-07-31", new Set())).toBe(6); // viernes
    expect(getExpectedHoursForDay(horasEsperadasPorDia, "2026-08-01", new Set())).toBe(0); // sábado
  });

  it("retorna 0 si la fecha es feriado, sin importar el día de la semana", () => {
    expect(getExpectedHoursForDay(horasEsperadasPorDia, "2026-07-27", new Set(["2026-07-27"]))).toBe(0);
  });
});

describe("getWeekExpectedHours", () => {
  it("suma las horas esperadas de todos los días de la semana", () => {
    const days = createWeekDays("2026-07-27", "2026-08-02");
    // lun-jue 8.5*4 + vie 6 + sáb/dom 0 = 40
    expect(getWeekExpectedHours(days, horasEsperadasPorDia, new Set())).toBe(40);
  });
});

describe("totales de horas", () => {
  const hours: HoursByDateAndColumn = {
    "2026-07-27": { "proyecto-a": 6, HEX: 2 },
    "2026-07-28": { "proyecto-a": 8 },
    "2026-07-29": { VAC: 8 },
  };

  it("suma las horas del día entre todas las columnas", () => {
    expect(getDayTotal(hours, columns, "2026-07-27")).toBe(8);
    expect(getDayTotal(hours, columns, "2026-07-30")).toBe(0);
  });

  it("suma el total de una columna en toda la semana", () => {
    expect(getColumnTotal(hours, "proyecto-a")).toBe(14);
    expect(getColumnTotal(hours, "VAC")).toBe(8);
  });

  it("suma el total registrado en todos los días de la semana", () => {
    const days = createWeekDays("2026-07-27", "2026-08-02");
    expect(getWeekTotal(days, hours, columns)).toBe(24);
  });

  it("clasifica los totales en ordinarias/extraordinarias/ausencias según la columna", () => {
    expect(getTotalesPorCategoria(hours, columns)).toEqual({
      ordinarias: 14,
      extraordinarias: 2,
      ausencias: 8,
    });
  });
});

describe("getMaxForInput", () => {
  const columnIds = columns.map((col) => col.id);

  it("limita el máximo permitido para no superar las 24h/día entre todas las columnas", () => {
    const hours: HoursByDateAndColumn = { "2026-07-27": { "proyecto-a": 20 } };
    expect(getMaxForInput(hours, columnIds, "2026-07-27", "HEX")).toBe(4);
  });

  it("nunca retorna un máximo negativo", () => {
    const hours: HoursByDateAndColumn = { "2026-07-27": { "proyecto-a": 30 } };
    expect(getMaxForInput(hours, columnIds, "2026-07-27", "HEX")).toBe(0);
  });
});

describe("formatHours / formatPercent / roundHours", () => {
  it("formatea con coma decimal y un dígito, estilo es-CL", () => {
    expect(formatHours(7.5)).toBe("7,5");
    expect(formatHours(0)).toBe("0,0");
    expect(formatPercent(45.666)).toBe("45,7%");
  });

  it("redondea a dos decimales evitando errores de punto flotante", () => {
    expect(roundHours(0.1 + 0.2)).toBe(0.3);
  });
});

describe("buildCsvRows / rowsToCsv", () => {
  it("arma filas con encabezado, días y totales, y las serializa separadas por punto y coma", () => {
    const days = createWeekDays("2026-07-27", "2026-07-28");
    const hours: HoursByDateAndColumn = { "2026-07-27": { "proyecto-a": 8 } };
    const rows = buildCsvRows(days, [columns[0]], hours);

    expect(rows[0]).toEqual(["Día", "20-013 - Gestión Operaciones", "Total diario"]);
    expect(rows[1]).toEqual(["27 Lun", "8", "8,0"]);

    const csv = rowsToCsv([["Día", 'Centro "A"']]);
    expect(csv).toBe('"Día";"Centro ""A"""');
  });
});
