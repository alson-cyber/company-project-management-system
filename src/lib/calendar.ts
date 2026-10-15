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

/** Adds calendar days to a YYYY-MM-DD string. The result stays a calendar date. */
export function addCalendarDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/** Calendar day of an instant in an IANA time zone, as YYYY-MM-DD. */
export function calendarDayInTimeZone(value: Date, timeZone: string): string {
  return todayInTimeZone(timeZone, value);
}

/**
 * Personal Due Soon window. Today through this many days later, inclusive.
 * Project Overview keeps its own 14-day planning list.
 */
export const PERSONAL_DUE_SOON_DAYS = 7;

/** Inclusive window for "completed recently" and "recently updated". */
export const COMPLETED_RECENT_DAYS = 14;
export const RECENTLY_UPDATED_DAYS = 14;

/**
 * Due soon = open work whose due date is today or within PERSONAL_DUE_SOON_DAYS,
 * in the company time zone. Overdue work is not also due soon.
 */
export function isDueSoon(
  dueDate: Date | null | undefined,
  status: IssueStatus,
  timeZone: string,
  at: Date = new Date(),
  days: number = PERSONAL_DUE_SOON_DAYS,
): boolean {
  if (!dueDate || status === "DONE") return false;
  const day = calendarDayUtc(dueDate);
  const today = todayInTimeZone(timeZone, at);
  if (day < today) return false;
  return day <= addCalendarDays(today, days);
}

/** Start of the completed-recently window: the first instant of (today - (days-1)). */
export function recentWindowStart(timeZone: string, days: number, at: Date = new Date()): Date {
  return parseCalendarDate(addCalendarDays(todayInTimeZone(timeZone, at), -(days - 1)));
}
