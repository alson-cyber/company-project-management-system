import { describe, expect, test } from "vitest";
import { isWithinAttachmentLimit } from "@/server/config";

describe("attachment policy", () => {
  const policy = { maxBytes: 25 * 1024 * 1024 };

  test("accepts a file at the configured limit", () => {
    expect(isWithinAttachmentLimit(policy, 25 * 1024 * 1024)).toBe(true);
  });

  test("rejects a file over the configured limit", () => {
    expect(isWithinAttachmentLimit(policy, 25 * 1024 * 1024 + 1)).toBe(false);
  });
});
