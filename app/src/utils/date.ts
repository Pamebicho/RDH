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

/** Fecha de hoy en formato ISO 'YYYY-MM-DD', calculada en hora local (no UTC). */
function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/**
 * El período del mes en curso: el que contiene la fecha de hoy. Si ninguno la contiene, se
 * prefiere el último período ya iniciado (el pasado más reciente) antes que uno futuro, y solo
 * si todos son futuros se toma el más próximo a comenzar.
 */
export function encontrarPeriodoActual(periodos: Periodo[]): Periodo | undefined {
  if (!periodos.length) return undefined;
  const hoy = hoyIso();

  const vigente = periodos.find((periodo) => periodo.fecha_inicio <= hoy && hoy <= periodo.fecha_fin);
  if (vigente) return vigente;

  const iniciados = periodos.filter((periodo) => periodo.fecha_inicio <= hoy);
  if (iniciados.length) {
    return iniciados.reduce((masReciente, periodo) =>
      periodo.fecha_inicio > masReciente.fecha_inicio ? periodo : masReciente,
    );
  }

  return periodos.reduce((masProximo, periodo) =>
    periodo.fecha_inicio < masProximo.fecha_inicio ? periodo : masProximo,
  );
}
