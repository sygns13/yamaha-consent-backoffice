/** Fechas en hora de Lima, `dd/mm/aaaa HH:mm` (sección 8.7). La API envía ISO 8601 con offset (`-05:00`). */
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  // formatToParts: el separador entre fecha y hora de es-PE varía entre motores (", " o " ").
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    DATE_TIME_FORMAT.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
