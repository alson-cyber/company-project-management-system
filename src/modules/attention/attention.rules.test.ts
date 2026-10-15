import { describe, expect, test } from "vitest";
import {
  attentionRecipient,
  assignmentDedupe,
  describeAttention,
  filterMyWork,
  type MyWorkIssue,
} from "@/modules/attention/attention.rules";

const at = new Date("2026-10-15T12:00:00.000Z");

function issue(overrides: Partial<MyWorkIssue>): MyWorkIssue {
  return {
    id: "1",
    key: "AQUA-6",
    number: 6,
    title: "Implement availability API",
    projectId: "aqua",
    projectKey: "AQUA",
    projectName: "AquaDesk",
    type: "TASK",
    status: "IN_PROGRESS",
    priority: "HIGHEST",
    dueDate: "2026-10-10",
    updatedAt: "2026-10-14T00:00:00.000Z",
    assigneeId: "alex",
    completedById: null,
    completedAt: null,
    context: "Streamline guest booking flow",
    ...overrides,
  };
}

const base = { projectId: "", status: "", type: "", priority: "", due: "" as const, sort: "due" as const };

describe("my work rules", () => {
  const rows = [
    issue({}),
    issue({
      id: "2",
      key: "AQUA-14",
      number: 14,
      title: "Build roster query",
      status: "IN_REVIEW",
      priority: "HIGH",
      dueDate: "2026-10-20",
    }),
    issue({
      id: "3",
      key: "AQUA-3",
      number: 3,
      title: "Design booking wizard",
      status: "DONE",
      assigneeId: "sarah",
      completedById: "mika",
      completedAt: "2026-10-12T08:00:00.000Z",
      dueDate: "2026-09-30",
    }),
  ];

  test("overdue is open assigned work due before today", () => {
    const overdue = filterMyWork(rows, "alex", { ...base, view: "overdue" }, "UTC", at);
    expect(overdue.map((row) => row.key)).toEqual(["AQUA-6"]);
  });

  test("due soon is the next 7 days and excludes overdue work", () => {
    const soon = filterMyWork(rows, "alex", { ...base, view: "soon" }, "UTC", at);
    expect(soon.map((row) => row.key)).toEqual(["AQUA-14"]);
  });

  test("in progress and in review are separate views", () => {
    expect(filterMyWork(rows, "alex", { ...base, view: "progress" }, "UTC", at).map((row) => row.key)).toEqual(["AQUA-6"]);
    expect(filterMyWork(rows, "alex", { ...base, view: "review" }, "UTC", at).map((row) => row.key)).toEqual(["AQUA-14"]);
  });

  test("completed recently follows the person who completed it", () => {
    expect(filterMyWork(rows, "mika", { ...base, view: "completed" }, "UTC", at).map((row) => row.key)).toEqual(["AQUA-3"]);
    expect(filterMyWork(rows, "alex", { ...base, view: "completed" }, "UTC", at)).toEqual([]);
    expect(filterMyWork(rows, "sarah", { ...base, view: "assigned" }, "UTC", at)).toEqual([]);
  });
});

describe("inbox wording", () => {
  test("describes attention without treating it as audit history", () => {
    expect(
      describeAttention({
        type: "ISSUE_ASSIGNED",
        actorName: "Sarah Kim",
        issueKey: "AQUA-6",
        projectName: "AquaDesk",
        metadata: {},
      }),
    ).toBe("Sarah Kim assigned AQUA-6 to you");
    expect(
      describeAttention({
        type: "ISSUE_OVERDUE",
        actorName: null,
        issueKey: "AQUA-13",
        projectName: "AquaDesk",
        metadata: { dueDate: "2026-10-01" },
      }),
    ).toBe("AQUA-13 is overdue");
  });

  test("does not notify the actor, and assignment keys stay unique per change", () => {
    expect(attentionRecipient("sarah", "sarah")).toBe(false);
    expect(attentionRecipient("sarah", "alex")).toBe(true);
    expect(attentionRecipient(null, "alex")).toBe(true);
    expect(assignmentDedupe("issue", "a")).not.toBe(assignmentDedupe("issue", "b"));
  });
});
