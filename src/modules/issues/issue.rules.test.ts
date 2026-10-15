import { describe, expect, test } from "vitest";
import { CHILD_TYPE_FOR, REQUIRED_PARENT_TYPE } from "@/modules/issues/issue.constants";
import {
  parentViolation,
  typeChangeViolation,
  wouldCreateCycle,
  storyFieldViolation,
} from "@/modules/issues/issue.rules";
import type { ParentRef } from "@/modules/issues/issue.rules";

const aqua = "project-aqua";
const other = "project-other";

function parent(overrides: Partial<ParentRef> & Pick<ParentRef, "id" | "type">): ParentRef {
  return { projectId: aqua, archivedAt: null, ...overrides };
}

describe("legal hierarchy", () => {
  test("Epic has no issue parent", () => {
    expect(parentViolation("EPIC", null, aqua)).toBeNull();
    expect(parentViolation("EPIC", parent({ id: "e1", type: "EPIC" }), aqua)).toMatch(/directly under a project/i);
  });

  test("User Story sits under an Epic in the same project", () => {
    expect(parentViolation("USER_STORY", parent({ id: "e1", type: "EPIC" }), aqua)).toBeNull();
    expect(parentViolation("USER_STORY", null, aqua)).toMatch(/Epic/);
    expect(parentViolation("USER_STORY", parent({ id: "t1", type: "TASK" }), aqua)).toMatch(/Epic/);
  });

  test("Task sits under a User Story", () => {
    expect(parentViolation("TASK", parent({ id: "s1", type: "USER_STORY" }), aqua)).toBeNull();
    expect(parentViolation("TASK", null, aqua)).toMatch(/User Story/);
    expect(parentViolation("TASK", parent({ id: "e1", type: "EPIC" }), aqua)).toMatch(/User Story/);
  });

  test("Sub-task sits under a Task and cannot have children", () => {
    expect(parentViolation("SUB_TASK", parent({ id: "t1", type: "TASK" }), aqua)).toBeNull();
    expect(parentViolation("SUB_TASK", parent({ id: "s1", type: "USER_STORY" }), aqua)).toMatch(/Task/);
    expect(CHILD_TYPE_FOR.SUB_TASK).toBeNull();
  });

  test("cross-project parents are rejected", () => {
    expect(parentViolation("USER_STORY", parent({ id: "e1", type: "EPIC", projectId: other }), aqua)).toMatch(
      /same project/,
    );
  });

  test("the required-parent table matches the product hierarchy", () => {
    expect(REQUIRED_PARENT_TYPE).toEqual({
      EPIC: null,
      USER_STORY: "EPIC",
      TASK: "USER_STORY",
      SUB_TASK: "TASK",
    });
  });
});

describe("type change", () => {
  test("rejects a type that would orphan or mis-parent children", () => {
    expect(
      typeChangeViolation("TASK", parent({ id: "s1", type: "USER_STORY" }), aqua, [{ type: "USER_STORY" }]),
    ).toMatch(/children/);
    expect(typeChangeViolation("SUB_TASK", parent({ id: "t1", type: "TASK" }), aqua, [{ type: "SUB_TASK" }])).toMatch(
      /cannot have children/i,
    );
  });

  test("allows a type change that remains valid for parent and children", () => {
    expect(typeChangeViolation("EPIC", null, aqua, [{ type: "USER_STORY" }])).toBeNull();
  });
});

describe("cycles", () => {
  test("rejects a parent that is the issue itself or an ancestor walk back to it", () => {
    const tree = new Map<string, string | null>([
      ["epic", null],
      ["story", "epic"],
      ["task", "story"],
    ]);
    expect(wouldCreateCycle("epic", "epic", (id) => tree.get(id) ?? null)).toBe(true);
    expect(wouldCreateCycle("epic", "task", (id) => tree.get(id) ?? null)).toBe(true);
    expect(wouldCreateCycle("task", "story", (id) => tree.get(id) ?? null)).toBe(false);
  });
});

describe("user story fields", () => {
  test("does not invent missing story content", () => {
    expect(storyFieldViolation("", "goal", "benefit")).toMatch(/does not fill/);
    expect(storyFieldViolation("guest", "book", "save time")).toBeNull();
  });
});
