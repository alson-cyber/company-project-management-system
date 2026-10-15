import { describe, expect, test } from "vitest";
import { reconcileDraft } from "@/lib/draft-text";

describe("reconcileDraft", () => {
  test("keeps unsaved text when an unrelated server value arrives for the same field", () => {
    const dirty = { key: "issue-1:description", value: "Draft that is not saved", dirty: true };
    expect(reconcileDraft(dirty, "Saved description", "issue-1:description")).toBe(dirty);
  });

  test("follows the server when the field is clean", () => {
    const clean = { key: "issue-1:description", value: "Old", dirty: false };
    expect(reconcileDraft(clean, "Saved description", "issue-1:description")).toEqual({
      key: "issue-1:description",
      value: "Saved description",
      dirty: false,
    });
  });

  test("replaces the draft when the issue changes", () => {
    const dirty = { key: "issue-1:description", value: "Draft", dirty: true };
    expect(reconcileDraft(dirty, "Other issue", "issue-2:description")).toEqual({
      key: "issue-2:description",
      value: "Other issue",
      dirty: false,
    });
  });
});
