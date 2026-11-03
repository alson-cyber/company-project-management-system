import { describe, expect, test } from "vitest";
import type { MyWorkIssue } from "@/modules/attention/attention.rules";
import { describeToday, todayFocus, todaySummary } from "@/modules/attention/today";

const at = new Date("2026-10-15T12:00:00.000Z");

function issue(overrides: Partial<MyWorkIssue>): MyWorkIssue {
  return {
    id: "1",
    key: "AQUA-1",
    number: 1,
    title: "Work",
    projectId: "aqua",
    projectKey: "AQUA",
    projectName: "AquaDesk",
    type: "TASK",
    status: "TO_DO",
    priority: "MEDIUM",
    dueDate: null,
    updatedAt: "2026-10-14T00:00:00.000Z",
    assigneeId: "me",
    completedById: null,
    completedAt: null,
    context: null,
    ...overrides,
  };
}

describe("today focus", () => {
  const rows = [
    issue({ id: "review", status: "IN_REVIEW" }),
    issue({ id: "progress", status: "IN_PROGRESS" }),
    issue({ id: "soon", dueDate: "2026-10-18" }),
    issue({ id: "overdue", dueDate: "2026-10-10", status: "IN_PROGRESS" }),
    issue({ id: "someone-else", assigneeId: "other", dueDate: "2026-10-01" }),
  ];

  test("orders overdue, due soon, in progress, then review, without repeats", () => {
    const items = todayFocus(rows, "me", "UTC", 5, at);
    expect(items.map((item) => [item.issue.id, item.reason])).toEqual([
      ["overdue", "overdue"],
      ["soon", "soon"],
      ["progress", "progress"],
      ["review", "review"],
    ]);
  });

  test("respects the limit", () => {
    expect(todayFocus(rows, "me", "UTC", 2, at)).toHaveLength(2);
  });

  test("summarises in one sentence", () => {
    expect(describeToday(todaySummary(rows, "me", "UTC", at))).toBe(
      "1 item overdue, 1 due soon, 2 in progress and 1 in review.",
    );
  });

  test("says when everything is clear", () => {
    expect(describeToday({ overdue: 0, dueSoon: 0, inProgress: 0, inReview: 0, completedRecently: 3 })).toBe(
      "You're all caught up, with 3 items finished in the last 14 days.",
    );
  });
});
