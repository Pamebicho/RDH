/** "PAMELA GUTIERREZ" o "pamela gutierrez" -> "Pamela Gutierrez". Respeta guiones (María-José). */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es")
    .replace(/(^|[\s-])(\p{L})/gu, (_match, separator: string, letter: string) => separator + letter.toLocaleUpperCase("es"));
}
