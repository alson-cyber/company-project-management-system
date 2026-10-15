import { describe, expect, test } from "vitest";
import { calendarDayUtc, isDueSoon, isOverdue, parseCalendarDate, todayInTimeZone } from "@/lib/calendar";

describe("calendar dates", () => {
  test("DATE values stay on their UTC calendar day", () => {
    const due = parseCalendarDate("2026-01-15");
    expect(calendarDayUtc(due)).toBe("2026-01-15");
  });

  test("overdue ignores Done work and uses the company time zone's today", () => {
    const due = parseCalendarDate("2026-01-01");
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(isOverdue(due, "TO_DO", "UTC", now)).toBe(true);
    expect(isOverdue(due, "DONE", "UTC", now)).toBe(false);
    expect(isOverdue(null, "TO_DO", "UTC", now)).toBe(false);
  });

  test("due soon is the next 7 days and excludes overdue and done work", () => {
    const now = new Date("2026-03-20T21:30:00.000Z");
    const due = parseCalendarDate("2026-03-20");
    expect(isDueSoon(due, "TO_DO", "UTC", now)).toBe(true);
    expect(isOverdue(due, "TO_DO", "UTC", now)).toBe(false);
    expect(isDueSoon(due, "DONE", "UTC", now)).toBe(false);
    expect(isOverdue(due, "TO_DO", "Pacific/Kiritimati", now)).toBe(true);
    expect(isDueSoon(due, "TO_DO", "Pacific/Kiritimati", now)).toBe(false);
    expect(isDueSoon(parseCalendarDate("2026-03-27"), "IN_PROGRESS", "UTC", now)).toBe(true);
    expect(isDueSoon(parseCalendarDate("2026-03-28"), "IN_PROGRESS", "UTC", now)).toBe(false);
  });

  test("todayInTimeZone uses the supplied IANA zone", () => {
    const instant = new Date("2026-03-20T21:30:00.000Z");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-03-20");
    expect(todayInTimeZone("Pacific/Kiritimati", instant)).toBe("2026-03-21");
  });
});
