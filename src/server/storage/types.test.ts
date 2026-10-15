import { describe, expect, test } from "vitest";
import { assertValidObjectKey } from "@/server/storage/types";

describe("assertValidObjectKey", () => {
  test("accepts opaque nested keys", () => {
    expect(() => assertValidObjectKey("attachments/project-id/uuid.bin")).not.toThrow();
  });

  test("rejects path traversal and empty segments", () => {
    expect(() => assertValidObjectKey("../secret")).toThrow();
    expect(() => assertValidObjectKey("a/../b")).toThrow();
    expect(() => assertValidObjectKey("/abs")).toThrow();
  });
});
