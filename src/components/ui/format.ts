const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Calendar dates (stored as DATE) are formatted in UTC so they never shift by a day. */
export function formatDate(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "—";
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}
