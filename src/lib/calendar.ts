import type { IssueStatus } from "@/generated/prisma/enums";

/** Formats a DATE (UTC midnight) as YYYY-MM-DD without shifting the calendar day. */
export function calendarDayUtc(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Today's calendar date in an IANA time zone. */
export function todayInTimeZone(timeZone: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Overdue = due date is before today in the company time zone, and the issue is not Done.
 * Priority is not part of the definition (docs/PRODUCT-RULES.md §1.3).
 */
export function isOverdue(
  dueDate: Date | null | undefined,
  status: IssueStatus,
  timeZone: string,
  at: Date = new Date(),
): boolean {
  if (!dueDate || status === "DONE") return false;
  return calendarDayUtc(dueDate) < todayInTimeZone(timeZone, at);
}

export function parseCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
