const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Calendar dates (stored as DATE) are formatted in UTC so they never shift by a day. */
export function formatDate(value: Date | null | undefined): string {
  return value ? dateFormatter.format(value) : "—";
}

export function formatDateTime(value: Date | null | undefined): string {
  return value ? dateTimeFormatter.format(value) : "—";
}
