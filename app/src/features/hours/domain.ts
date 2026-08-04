// Lógica pura del registro de horas: sin acceso a red ni al DOM, 100% testeable.
// Traducción directa de la lógica validada en src/js/modules/registro-horas.js del prototipo.

export const MAX_DAILY_HOURS = 24;

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export interface DayInfo {
  date: string;
  label: string;
  weekend: boolean;
}

export interface CostCenter {
  id: string;
  name: string;
}

/** horas[fecha][centroId] = horas cargadas ese día en ese centro */
export type HoursByDateAndCenter = Record<string, Record<string, number>>;
/** observaciones[fecha] = texto de observación de ese día */
export type ObservationsByDate = Record<string, string>;

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

export function createMonthDays(period: string): DayInfo[] {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();

    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: `${String(day).padStart(2, "0")} ${WEEKDAYS[weekday]}`,
      weekend: weekday === 0 || weekday === 6,
    };
  });
}

export function getDayTotal(
  hours: HoursByDateAndCenter,
  centers: CostCenter[],
  date: string,
): number {
  const dayHours = hours[date] ?? {};
  return roundHours(centers.reduce((total, center) => total + Number(dayHours[center.id] || 0), 0));
}

export function getColumnTotal(hours: HoursByDateAndCenter, centerId: string): number {
  return roundHours(
    Object.values(hours).reduce((total, dayHours) => total + Number(dayHours[centerId] || 0), 0),
  );
}

export function getRegisteredHours(
  days: DayInfo[],
  hours: HoursByDateAndCenter,
  centers: CostCenter[],
): number {
  return roundHours(days.reduce((total, day) => total + getDayTotal(hours, centers, day.date), 0));
}

/**
 * Calcula el máximo permitido para un input de horas sin exceder el tope diario,
 * dado lo ya cargado en los otros centros seleccionados ese mismo día.
 */
export function getMaxForInput(
  hours: HoursByDateAndCenter,
  selectedCenterIds: string[],
  date: string,
  centerId: string,
): number {
  const dayHours = hours[date] ?? {};
  const otherHours = selectedCenterIds
    .filter((id) => id !== centerId)
    .reduce((total, id) => total + Number(dayHours[id] || 0), 0);

  return Math.max(0, roundHours(MAX_DAILY_HOURS - otherHours));
}

export function findPreviousEditableDate(days: DayInfo[], date: string): string | null {
  const currentIndex = days.findIndex((day) => day.date === date);

  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (!days[index].weekend) {
      return days[index].date;
    }
  }

  return null;
}

export function getPreviousPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const previous = new Date(year, month - 2, 1);
  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
}

export function buildCsvRows(
  days: DayInfo[],
  centers: CostCenter[],
  hours: HoursByDateAndCenter,
  observations: ObservationsByDate,
): string[][] {
  const header = [
    "Día",
    ...centers.map((center) => `${center.id} - ${center.name}`),
    "Total diario",
    "Observaciones",
  ];

  const rows = days.map((day) => [
    day.label,
    ...centers.map((center) => Number(hours[day.date]?.[center.id] || 0).toString().replace(".", ",")),
    formatHours(getDayTotal(hours, centers, day.date)),
    observations[day.date] || "",
  ]);

  const totalsRow = [
    "TOTAL",
    ...centers.map((center) => formatHours(getColumnTotal(hours, center.id))),
    formatHours(getRegisteredHours(days, hours, centers)),
    "",
  ];

  return [header, ...rows, totalsRow];
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\r\n");
}
