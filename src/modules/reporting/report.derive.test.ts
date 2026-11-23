import { describe, expect, test } from "vitest";
import { statusCounts } from "@/modules/reporting/report.derive";
import type { IssueFact } from "@/modules/reporting/portfolio.derive";

function fact(overrides: Partial<IssueFact> & Pick<IssueFact, "id" | "type" | "parentId">): IssueFact {
  return {
    projectId: "project",
    number: 1,
    title: overrides.id,
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    updatedDay: "2026-11-23",
    completedAt: null,
    completedById: null,
    ...overrides,
  };
}

describe("executable counts after filtering", () => {
  test("does not treat a parent task as executable when its sub-task was filtered out", () => {
    const parent = fact({ id: "task", type: "TASK", parentId: "story", status: "IN_PROGRESS" });
    const child = fact({ id: "sub", type: "SUB_TASK", parentId: "task", status: "DONE" });
    const scope = [parent, child];
    const filtered = [parent];
    expect(statusCounts(filtered, scope).IN_PROGRESS).toBe(0);
    expect(statusCounts(filtered).IN_PROGRESS).toBe(1);
  });
});
