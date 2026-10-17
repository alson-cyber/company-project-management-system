import { describe, expect, test } from "vitest";
import { formatDate, formatDateTime } from "@/components/ui/format";

describe("date display", () => {
  test("keeps a calendar date on its UTC day", () => {
    expect(formatDate("2026-10-17T00:00:00.000Z")).toBe("17 Oct 2026");
  });

  test("shows clock times in UTC", () => {
    expect(formatDateTime("2026-10-17T21:39:00.000Z")).toContain("21:39");
    expect(formatDateTime("2026-10-17T21:39:00.000Z")).toContain("17 Oct 2026");
  });
});
