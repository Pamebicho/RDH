// Lógica pura del registro de horas semanal: sin acceso a red ni al DOM, 100% testeable.

export const MAX_DAILY_HOURS = 24;

/**
 * Centros de costo que siempre están disponibles para todos los trabajadores, en todos los
 * períodos: no se pueden quitar desde el selector de "Centros de costo" (solo se pueden agregar
 * otros además de estos).
 */
export const FIXED_COST_CENTER_CODES = ["20-004", "20-009", "20-013", "20-015", "20-020"] as const;

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export interface DayInfo {
  date: string;
  label: string;
  weekend: boolean;
  feriado: boolean;
}

/** Una columna de la tabla semanal: un proyecto (horas ordinarias) o un tipo de registro sin proyecto. */
export interface ColumnaRegistro {
  id: string;
  tipoRegistroId: string;
  proyectoId: string | null;
  codigo: string;
  etiqueta: string;
  categoria: string;
  esHoraExtra: boolean;
}

/** horas[fecha][columna.id] = horas cargadas ese día en esa columna */
export type HoursByDateAndColumn = Record<string, Record<string, number>>;

/** horasEsperadasPorDia[1..7] = horas esperadas ese día de la semana (1 = lunes ... 7 = domingo) */
export type HorasEsperadasPorDia = Record<number, number>;

function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Convierte el día JS (0=domingo..6=sábado) a ISO (1=lunes..7=domingo). */
function diaSemanaIso(date: Date): number {
  const jsWeekday = date.getDay();
  return jsWeekday === 0 ? 7 : jsWeekday;
}

export function roundHours(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function formatHours(value: number): string {
  return Number(value || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatPercent(value: number): string {
  return `${Number(value || 0).toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

/** Genera los días (inclusive) entre fechaInicio y fechaFin de una semana. */
export function createWeekDays(
  fechaInicio: string,
  fechaFin: string,
  feriados: ReadonlySet<string> = new Set(),
): DayInfo[] {
  const start = parseIsoDate(fechaInicio);
  const end = parseIsoDate(fechaFin);
  const days: DayInfo[] = [];

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const weekday = cursor.getDay();
    const date = formatIsoDate(cursor);
    days.push({
      date,
      label: `${String(cursor.getDate()).padStart(2, "0")} ${WEEKDAYS[weekday]}`,
      weekend: weekday === 0 || weekday === 6,
      feriado: feriados.has(date),
    });
  }

  return days;
}

export function getExpectedHoursForDay(
  horasEsperadasPorDia: HorasEsperadasPorDia,
  date: string,
  feriados: ReadonlySet<string>,
): number {
  if (feriados.has(date)) return 0;
  return horasEsperadasPorDia[diaSemanaIso(parseIsoDate(date))] ?? 0;
}

export function getWeekExpectedHours(
  days: DayInfo[],
  horasEsperadasPorDia: HorasEsperadasPorDia,
  feriados: ReadonlySet<string>,
): number {
  return roundHours(
    days.reduce((total, day) => total + getExpectedHoursForDay(horasEsperadasPorDia, day.date, feriados), 0),
  );
}

export function getDayTotal(hours: HoursByDateAndColumn, columns: ColumnaRegistro[], date: string): number {
  const dayHours = hours[date] ?? {};
  return roundHours(columns.reduce((total, col) => total + Number(dayHours[col.id] || 0), 0));
}

export function getColumnTotal(hours: HoursByDateAndColumn, columnId: string): number {
  return roundHours(
    Object.values(hours).reduce((total, dayHours) => total + Number(dayHours[columnId] || 0), 0),
  );
}

export function getWeekTotal(days: DayInfo[], hours: HoursByDateAndColumn, columns: ColumnaRegistro[]): number {
  return roundHours(days.reduce((total, day) => total + getDayTotal(hours, columns, day.date), 0));
}

export interface TotalesPorCategoria {
  ordinarias: number;
  extraordinarias: number;
  ausencias: number;
}

export function getTotalesPorCategoria(
  hours: HoursByDateAndColumn,
  columns: ColumnaRegistro[],
): TotalesPorCategoria {
  let ordinarias = 0;
  let extraordinarias = 0;
  let ausencias = 0;

  for (const columna of columns) {
    const total = getColumnTotal(hours, columna.id);
    if (columna.esHoraExtra) {
      extraordinarias += total;
    } else if (columna.categoria === "AUSENCIA") {
      ausencias += total;
    } else {
      ordinarias += total;
    }
  }

  return {
    ordinarias: roundHours(ordinarias),
    extraordinarias: roundHours(extraordinarias),
    ausencias: roundHours(ausencias),
  };
}

/** Máximo permitido para una columna sin exceder el tope diario entre todas las columnas. */
export function getMaxForInput(
  hours: HoursByDateAndColumn,
  columnIds: string[],
  date: string,
  columnId: string,
): number {
  const dayHours = hours[date] ?? {};
  const otherHours = columnIds
    .filter((id) => id !== columnId)
    .reduce((total, id) => total + Number(dayHours[id] || 0), 0);

  return Math.max(0, roundHours(MAX_DAILY_HOURS - otherHours));
}

export function buildCsvRows(
  days: DayInfo[],
  columns: ColumnaRegistro[],
  hours: HoursByDateAndColumn,
): string[][] {
  const header = ["Día", ...columns.map((col) => `${col.codigo} - ${col.etiqueta}`), "Total diario"];

  const rows = days.map((day) => [
    day.label,
    ...columns.map((col) => Number(hours[day.date]?.[col.id] || 0).toString().replace(".", ",")),
    formatHours(getDayTotal(hours, columns, day.date)),
  ]);

  const totalsRow = [
    "TOTAL",
    ...columns.map((col) => formatHours(getColumnTotal(hours, col.id))),
    formatHours(getWeekTotal(days, hours, columns)),
  ];

  return [header, ...rows, totalsRow];
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\r\n");
}

export interface SemanaConDias {
  numeroSemana: number;
  days: DayInfo[];
}

/** Exporta TODO el período (todas sus semanas), aunque algunas no tengan horas cargadas. */
export function buildCsvRowsPeriodo(
  semanas: SemanaConDias[],
  columns: ColumnaRegistro[],
  hours: HoursByDateAndColumn,
): string[][] {
  const header = ["Semana", "Día", ...columns.map((col) => `${col.codigo} - ${col.etiqueta}`), "Total diario"];
  const rows: string[][] = [header];

  for (const semana of semanas) {
    for (const day of semana.days) {
      rows.push([
        `Semana ${semana.numeroSemana}`,
        day.label,
        ...columns.map((col) => Number(hours[day.date]?.[col.id] || 0).toString().replace(".", ",")),
        formatHours(getDayTotal(hours, columns, day.date)),
      ]);
    }

    rows.push([
      `Semana ${semana.numeroSemana}`,
      "TOTAL SEMANA",
      ...columns.map((col) =>
        formatHours(roundHours(semana.days.reduce((total, day) => total + Number(hours[day.date]?.[col.id] || 0), 0))),
      ),
      formatHours(getWeekTotal(semana.days, hours, columns)),
    ]);
  }

  const todosLosDias = semanas.flatMap((semana) => semana.days);
  rows.push([
    "TOTAL PERÍODO",
    "",
    ...columns.map((col) => formatHours(getColumnTotal(hours, col.id))),
    formatHours(getWeekTotal(todosLosDias, hours, columns)),
  ]);

  return rows;
}
