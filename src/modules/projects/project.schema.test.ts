import { describe, expect, test } from "vitest";
import { createProjectSchema, projectKeySchema } from "@/modules/projects/project.schema";

describe("projectKeySchema", () => {
  test.each(["AQUA", "SV", "PMS", "A1", "ABCDEFGHIJ"])("accepts %s", (key) => {
    expect(projectKeySchema.parse(key)).toBe(key);
  });

  test("uppercases lowercase input", () => {
    expect(projectKeySchema.parse("aqua")).toBe("AQUA");
  });

  test.each(["", "A", "1A", "aqua-1", "VERYLONGKEYZ", "sv!", " A"])("rejects %j", (key) => {
    expect(() => projectKeySchema.parse(key)).toThrow();
  });
});

describe("createProjectSchema", () => {
  const valid = {
    key: "AQUA",
    name: "AquaDesk",
    leadUserId: "user-1",
  };

  test("accepts a minimal valid payload", () => {
    const parsed = createProjectSchema.parse(valid);
    expect(parsed.status).toBe("PLANNING");
    expect(parsed.description).toBeUndefined();
  });

  test("rejects a blank name", () => {
    const result = createProjectSchema.safeParse({ ...valid, name: " " });
    expect(result.success).toBe(false);
  });

  test("rejects an invalid key", () => {
    const result = createProjectSchema.safeParse({ ...valid, key: "1A" });
    expect(result.success).toBe(false);
  });
});
