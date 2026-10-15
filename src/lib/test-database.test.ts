import { describe, expect, test } from "vitest";
import { assertIsolatedTestDatabase, databaseName } from "@/lib/test-database";

describe("e2e database isolation", () => {
  test("reads the database name", () => {
    expect(databaseName("postgresql://pms:pms@localhost:55432/pms_test")).toBe("pms_test");
  });

  test("accepts a dedicated test database", () => {
    expect(
      assertIsolatedTestDatabase(
        "postgresql://pms:pms@localhost:55432/pms_test",
        "postgresql://pms:pms@localhost:55432/pms_dev",
      ),
    ).toBe("pms_test");
  });

  test("rejects the development database", () => {
    expect(() =>
      assertIsolatedTestDatabase(
        "postgresql://pms:pms@localhost:55432/pms_dev",
        "postgresql://pms:pms@localhost:55432/pms_dev",
      ),
    ).toThrow(/_test/);
  });

  test("rejects when test and development URLs name the same database", () => {
    expect(() =>
      assertIsolatedTestDatabase(
        "postgresql://pms:pms@localhost:55432/pms_test",
        "postgresql://pms:other@localhost:55432/pms_test",
      ),
    ).toThrow(/same as the development/);
  });
});
