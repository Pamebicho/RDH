import type { Periodo } from "@/types/database.types";

/** Convierte una fecha ISO 'YYYY-MM-DD' a formato chileno 'DD/MM/YYYY'. */
export function formatDateCl(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Convierte una fecha ISO 'YYYY-MM-DD' a Date en hora local (evita el corrimiento de zona horaria de `new Date(iso)`). */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function diasRestantes(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = parseIsoDate(fechaFin);
  const diffMs = fin.getTime() - hoy.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** El período que contiene la fecha de hoy, o el primero de la lista si ninguno la contiene. */
export function encontrarPeriodoActual(periodos: Periodo[]): Periodo | undefined {
  const hoyIso = new Date().toISOString().slice(0, 10);
  return (
    periodos.find((periodo) => periodo.fecha_inicio <= hoyIso && hoyIso <= periodo.fecha_fin) ?? periodos[0]
  );
}
