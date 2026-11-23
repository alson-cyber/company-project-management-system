import { describe, expect, test } from "vitest";
import { filtersForReport, parseReportFilters, resolveReportProject } from "@/modules/reporting/reports.model";

describe("report filters", () => {
  test("clamps a hostile custom range and drops malformed identifiers", () => {
    const filters = parseReportFilters(
      {
        range: "custom",
        from: "1990-01-01",
        to: "2026-10-17",
        project: "../etc",
        assignee: "not-a-uuid",
        actor: "also-bad",
        status: "SHIPPED",
      },
      "2026-10-17",
    );
    expect(filters.to).toBe("2026-10-17");
    expect(filters.from > "2025-01-01").toBe(true);
    expect(filters.projectKey).toBeNull();
    expect(filters.assigneeId).toBeNull();
    expect(filters.actorId).toBeNull();
    expect(filters.status).toBeNull();
  });

  test("drops filters a report does not use, and an unknown project key is not every project", () => {
    const parsed = parseReportFilters({ project: "ZZ", assignee: "11111111-1111-4111-8111-111111111111", status: "DONE" }, "2026-11-23");
    const progress = filtersForReport("progress", parsed);
    expect(progress.assigneeId).toBeNull();
    expect(progress.status).toBeNull();
    expect(resolveReportProject([{ key: "AQUA" }], "ZZ")).toBeNull();
    expect(resolveReportProject([{ key: "AQUA" }], null)).toBeUndefined();
  });

  test("rejects a calendar date that does not exist", () => {
    const filters = parseReportFilters({ range: "custom", from: "2026-02-31", to: "2026-10-17" }, "2026-10-17");
    expect(filters.from).not.toBe("2026-02-31");
  });
});
