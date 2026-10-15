import { describe, expect, test } from "vitest";
import {
  executableIssues,
  progressOfIssue,
  progressOfProject,
  type ProgressIssue,
} from "@/modules/issues/issue.progress";

function item(partial: Partial<ProgressIssue> & Pick<ProgressIssue, "id" | "type">): ProgressIssue {
  return {
    parentId: null,
    status: "TO_DO",
    archivedAt: null,
    ...partial,
  };
}

describe("executable work", () => {
  test("a Task without Sub-tasks is executable; a Task with Sub-tasks is not", () => {
    const issues: ProgressIssue[] = [
      item({ id: "epic", type: "EPIC" }),
      item({ id: "story", type: "USER_STORY", parentId: "epic" }),
      item({ id: "task-leaf", type: "TASK", parentId: "story", status: "DONE" }),
      item({ id: "task-parent", type: "TASK", parentId: "story", status: "DONE" }),
      item({ id: "sub-1", type: "SUB_TASK", parentId: "task-parent", status: "TO_DO" }),
      item({ id: "sub-2", type: "SUB_TASK", parentId: "task-parent", status: "DONE" }),
    ];

    const executable = executableIssues(issues).map((row) => row.id).sort();
    expect(executable).toEqual(["sub-1", "sub-2", "task-leaf"]);

    const story = progressOfIssue("story", issues);
    expect(story).toEqual({ done: 2, total: 3, percent: 67 });

    const project = progressOfProject(issues);
    expect(project).toEqual({ done: 2, total: 3, percent: 67 });
  });

  test("archived Sub-tasks drop out, returning the parent Task to executable work", () => {
    const issues: ProgressIssue[] = [
      item({ id: "task", type: "TASK", status: "IN_PROGRESS" }),
      item({ id: "sub", type: "SUB_TASK", parentId: "task", status: "DONE", archivedAt: new Date() }),
    ];
    expect(progressOfProject(issues)).toEqual({ done: 0, total: 1, percent: 0 });
  });

  test("empty containers report 0 rather than inventing a percentage", () => {
    const issues: ProgressIssue[] = [item({ id: "epic", type: "EPIC", status: "DONE" })];
    expect(progressOfIssue("epic", issues)).toEqual({ done: 0, total: 0, percent: 0 });
  });
});
