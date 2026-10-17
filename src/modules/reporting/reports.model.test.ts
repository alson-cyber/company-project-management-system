import { describe, expect, test } from "vitest";
import { parseReportFilters } from "@/modules/reporting/reports.model";

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

  test("rejects a calendar date that does not exist", () => {
    const filters = parseReportFilters({ range: "custom", from: "2026-02-31", to: "2026-10-17" }, "2026-10-17");
    expect(filters.from).not.toBe("2026-02-31");
  });
});
