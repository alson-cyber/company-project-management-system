import { describe, expect, test } from "vitest";
import type { IssueListItem } from "@/modules/issues/issue.queries";
import { filterIssueTree, visibleIssueRows, type IssueTreeFilter } from "@/modules/issues/issue-tree.filter";

function node(partial: Partial<IssueListItem> & Pick<IssueListItem, "id" | "key" | "title" | "type">): IssueListItem {
  return {
    number: 1,
    status: "TO_DO",
    priority: "MEDIUM",
    parentId: null,
    assignee: null,
    dueDate: null,
    overdue: false,
    progress: { done: 0, total: 0, percent: 0 },
    allowedChildType: null,
    children: [],
    ...partial,
  };
}

const tree: IssueListItem[] = [
  node({
    id: "epic",
    key: "AQUA-1",
    title: "Guest booking experience",
    type: "EPIC",
    children: [
      node({
        id: "story",
        key: "AQUA-2",
        title: "Streamline guest booking flow",
        type: "USER_STORY",
        parentId: "epic",
        children: [
          node({
            id: "task",
            key: "AQUA-6",
            title: "Implement availability API",
            type: "TASK",
            parentId: "story",
            status: "IN_PROGRESS",
            assignee: { id: "alex", name: "Alex Noor" },
            children: [
              node({
                id: "sub",
                key: "AQUA-8",
                title: "Cache daily availability",
                type: "SUB_TASK",
                parentId: "task",
              }),
            ],
          }),
        ],
      }),
      node({
        id: "other",
        key: "AQUA-10",
        title: "Let guests cancel within policy",
        type: "USER_STORY",
        parentId: "epic",
      }),
    ],
  }),
];

const none: IssueTreeFilter = { query: "", type: "", status: "", priority: "", assigneeId: "" };

describe("filterIssueTree", () => {
  test("a matching sub-task keeps its ancestors and drops unrelated branches", () => {
    const filtered = filterIssueTree(tree, { ...none, query: "cache daily" });
    expect(filtered.map((row) => row.key)).toEqual(["AQUA-1"]);
    const story = filtered[0]?.children[0];
    expect(story?.key).toBe("AQUA-2");
    expect(story?.children.map((row) => row.key)).toEqual(["AQUA-6"]);
    expect(story?.children[0]?.children.map((row) => row.key)).toEqual(["AQUA-8"]);
    expect(filtered[0]?.children.some((row) => row.key === "AQUA-10")).toBe(false);
  });

  test("search matches issue keys", () => {
    const filtered = filterIssueTree(tree, { ...none, query: "aqua-10" });
    expect(filtered[0]?.children.map((row) => row.key)).toEqual(["AQUA-10"]);
  });

  test("assignee filter keeps hierarchy context", () => {
    const filtered = filterIssueTree(tree, { ...none, assigneeId: "alex" });
    expect(filtered[0]?.children[0]?.children[0]?.key).toBe("AQUA-6");
  });
});

describe("visibleIssueRows", () => {
  test("collapsed parents hide descendants", () => {
    const rows = visibleIssueRows(tree, (id) => id !== "epic");
    expect(rows.map((row) => row.node.key)).toEqual(["AQUA-1"]);
  });
});
