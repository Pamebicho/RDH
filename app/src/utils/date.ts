/** Convierte una fecha ISO 'YYYY-MM-DD' a formato chileno 'DD/MM/YYYY'. */
export function formatDateCl(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}
