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

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day, or null when the text is the wrong shape or not a date (2026-99-99). */
export function strictCalendarDay(value: string): string | null {
  if (!CALENDAR_DATE.test(value)) return null;
  const parsed = parseCalendarDate(value);
  if (Number.isNaN(parsed.getTime()) || calendarDayUtc(parsed) !== value) return null;
  return value;
}

/** Milliseconds to add to a UTC instant to reach the same clock reading in the zone. */
function zoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const hour = pick("hour") % 24;
  const asUtc = Date.UTC(pick("year"), pick("month") - 1, pick("day"), hour, pick("minute"), pick("second"));
  return asUtc - instant.getTime();
}

/** UTC instant when the company calendar day begins (local midnight). */
export function companyDayStart(day: string, timeZone: string): Date {
  const utcMidnight = parseCalendarDate(day);
  const start = new Date(utcMidnight.getTime() - zoneOffsetMs(timeZone, utcMidnight));
  const adjusted = zoneOffsetMs(timeZone, start);
  if (adjusted === zoneOffsetMs(timeZone, utcMidnight)) return start;
  return new Date(utcMidnight.getTime() - adjusted);
}

/** Half-open range [start, end) covering inclusive company calendar days. */
export function companyDayRange(from: string, toInclusive: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: companyDayStart(from, timeZone),
    end: companyDayStart(addCalendarDays(toInclusive, 1), timeZone),
  };
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
  return companyDayStart(addCalendarDays(todayInTimeZone(timeZone, at), -(days - 1)), timeZone);
}
