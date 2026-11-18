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

const LIMA_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en Lima, `AAAA-MM-DD` (los filtros de la bitácora se interpretan en esa zona, sección 6.8). */
export function limaToday(now: Date = new Date()): string {
  const part = (type: Intl.DateTimeFormatPartTypes) => LIMA_DATE_FORMAT.formatToParts(now).find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Suma días a una fecha `AAAA-MM-DD` (calendario, sin horas). */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** `AAAA-MM-DD` válido. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  // formatToParts: el separador entre fecha y hora de es-PE varía entre motores (", " o " ").
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    DATE_TIME_FORMAT.formatToParts(date).find((p) => p.type === type)?.value ?? "";
  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
