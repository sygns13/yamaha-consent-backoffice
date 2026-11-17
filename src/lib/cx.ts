/** Une clases de Tailwind, omitiendo los valores vacíos. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
