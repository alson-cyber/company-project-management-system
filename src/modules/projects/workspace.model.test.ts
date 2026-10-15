import { describe, expect, test } from "vitest";
import type { WorkspaceIssue } from "@/modules/projects/workspace.model";
import {
  boardCards,
  filterBoardCards,
  groupBoardCards,
  memberFacts,
  overviewSignals,
  plannedRangeError,
  timelineMark,
  timelineRows,
  timelineWindow,
  visibleTimelineRows,
} from "@/modules/projects/workspace.model";

function issue(overrides: Partial<WorkspaceIssue> & Pick<WorkspaceIssue, "id" | "type" | "title">): WorkspaceIssue {
  return {
    key: overrides.key ?? overrides.id.toUpperCase(),
    number: overrides.number ?? 1,
    status: "TO_DO",
    priority: "MEDIUM",
    parentId: null,
    assigneeId: null,
    assigneeName: null,
    dueDate: null,
    plannedStartDate: null,
    overdue: false,
    completedAt: null,
    completedById: null,
    createdById: "creator",
    labels: [],
    progress: { done: 0, total: 0, percent: 0 },
    ...overrides,
  };
}

const tree: WorkspaceIssue[] = [
  issue({ id: "epic", key: "AQUA-1", number: 1, type: "EPIC", title: "Guest booking experience", status: "IN_PROGRESS" }),
  issue({
    id: "story",
    key: "AQUA-2",
    number: 2,
    type: "USER_STORY",
    title: "Streamline guest booking flow",
    parentId: "epic",
    status: "IN_PROGRESS",
    dueDate: "2026-11-20",
    plannedStartDate: "2026-09-15",
  }),
  issue({
    id: "task",
    key: "AQUA-6",
    number: 6,
    type: "TASK",
    title: "Implement availability API",
    parentId: "story",
    status: "IN_PROGRESS",
    priority: "HIGHEST",
    assigneeId: "alex",
    assigneeName: "Alex",
    dueDate: "2026-10-10",
    plannedStartDate: "2026-10-01",
    overdue: true,
    labels: ["api"],
  }),
  issue({
    id: "sub",
    key: "AQUA-8",
    number: 8,
    type: "SUB_TASK",
    title: "Cache daily availability",
    parentId: "task",
    assigneeId: "alex",
    assigneeName: "Alex",
    labels: ["api"],
  }),
  issue({
    id: "done",
    key: "AQUA-3",
    number: 3,
    type: "TASK",
    title: "Design booking wizard",
    parentId: "story",
    status: "DONE",
    assigneeId: "alex",
    assigneeName: "Alex",
    completedAt: "2026-09-30T00:00:00.000Z",
    completedById: "mika",
  }),
];

describe("board cards", () => {
  test("includes tasks and sub-tasks once and leaves epics and stories off the board", () => {
    const cards = boardCards(tree);
    expect(cards.map((card) => card.type).sort()).toEqual(["SUB_TASK", "TASK", "TASK"]);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.find((card) => card.id === "sub")).toMatchObject({
      parentTitle: "Implement availability API",
      storyTitle: "Streamline guest booking flow",
      epicTitle: "Guest booking experience",
    });
  });

  test("groups each card under one story or one epic", () => {
    const cards = boardCards(tree);
    const byStory = groupBoardCards(cards, "story");
    const byEpic = groupBoardCards(cards, "epic");
    expect(byStory).toHaveLength(1);
    expect(byStory[0]?.title).toBe("Streamline guest booking flow");
    expect(byStory[0]?.cards).toHaveLength(3);
    expect(byEpic[0]?.title).toBe("Guest booking experience");
    expect(byEpic.flatMap((group) => group.cards)).toHaveLength(cards.length);
  });

  test("filters by assignee, priority, type, and label", () => {
    const cards = boardCards(tree);
    expect(filterBoardCards(cards, { assigneeId: "alex", priority: "HIGHEST", type: "TASK", label: "api" }).map((card) => card.key)).toEqual([
      "AQUA-6",
    ]);
    expect(filterBoardCards(cards, { assigneeId: "unassigned", priority: "", type: "", label: "" })).toHaveLength(0);
  });
});

describe("overview signals", () => {
  test("uses executable progress and real overdue work", () => {
    const signals = overviewSignals(tree, { today: "2026-10-15", targetDate: "2026-10-20", projectStatus: "ACTIVE" });
    // Executable: the sub-task, the done task (no children), and not the task that has a sub-task.
    expect(signals.progress).toEqual({ done: 1, total: 2, percent: 50 });
    expect(signals.overdue.map((item) => item.key)).toEqual(["AQUA-6"]);
    expect(signals.highestOpenCount).toBe(1);
    expect(signals.targetApproaching).toBe(true);
    expect(signals.recentlyCompleted.map((item) => item.key)).toEqual(["AQUA-3"]);
  });
});

describe("timeline", () => {
  test("bars use planned dates and ignores issues with no plan dates", () => {
    const window = timelineWindow(["2026-10-01", "2026-10-10"], "2026-12-15", "2026-10-15");
    expect(window.months.map((month) => month.label)).toEqual(["Oct 2026", "Nov 2026", "Dec 2026"]);
    const dated = timelineMark(tree[2]!, window);
    expect(dated?.kind).toBe("bar");
    expect(timelineMark(tree[4]!, window)).toBeNull();
  });

  test("keeps hierarchy order and hides collapsed descendants", () => {
    const rows = timelineRows(tree);
    expect(rows.map((row) => row.issue.id)).toEqual(["epic", "story", "task", "sub", "done"]);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 3, 2]);
    const collapsed = visibleTimelineRows(rows, new Set(["story"]));
    expect(collapsed.map((row) => row.issue.id)).toEqual(["epic", "story"]);
  });
});

describe("planned dates", () => {
  test("rejects a start after the due date and allows a start on the due date", () => {
    expect(plannedRangeError("2026-10-11", "2026-10-10")).toMatch(/on or before/);
    expect(plannedRangeError("2026-10-10", "2026-10-10")).toBeNull();
    expect(plannedRangeError(null, "2026-10-10")).toBeNull();
  });
});

describe("member facts", () => {
  test("keeps completion with the person who completed the work after reassignment", () => {
    expect(memberFacts("mika", tree).completed.map((item) => item.key)).toEqual(["AQUA-3"]);
    expect(memberFacts("alex", tree).completed).toEqual([]);
    expect(memberFacts("alex", tree).openAssigned.map((item) => item.key).sort()).toEqual(["AQUA-6", "AQUA-8"]);
    expect(memberFacts("alex", tree).overdueAssigned.map((item) => item.key)).toEqual(["AQUA-6"]);
  });
});
