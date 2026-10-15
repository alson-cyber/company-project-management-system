import { describe, expect, test } from "vitest";
import { createIssueSchema } from "@/modules/issues/issue.schema";

describe("createIssueSchema", () => {
  const projectId = "00000000-0000-4000-8000-000000000001";
  const parentId = "00000000-0000-4000-8000-000000000002";

  test("requires a parent for non-epics and story fields for User Stories", () => {
    expect(createIssueSchema.safeParse({ projectId, type: "TASK", title: "Orphan" }).success).toBe(false);
    expect(createIssueSchema.safeParse({ projectId, type: "USER_STORY", parentId, title: "Story" }).success).toBe(
      false,
    );
    expect(
      createIssueSchema.safeParse({
        projectId,
        type: "USER_STORY",
        parentId,
        title: "Story",
        story: { asA: "guest", iWant: "book", soThat: "save time" },
      }).success,
    ).toBe(true);
  });

  test("rejects a planned start after the due date", () => {
    const result = createIssueSchema.safeParse({
      projectId,
      type: "EPIC",
      title: "Dated epic",
      plannedStartDate: "2026-11-02",
      dueDate: "2026-11-01",
    });
    expect(result.success).toBe(false);
  });

  test("rejects an Epic with a parent", () => {
    expect(createIssueSchema.safeParse({ projectId, type: "EPIC", parentId, title: "Epic" }).success).toBe(false);
    expect(createIssueSchema.safeParse({ projectId, type: "EPIC", title: "Epic" }).success).toBe(true);
  });
});
