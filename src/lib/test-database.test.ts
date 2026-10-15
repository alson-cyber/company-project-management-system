import { describe, expect, test } from "vitest";
import { assertIsolatedTestDatabase } from "@/lib/test-database";

describe("e2e database isolation", () => {
  test("accepts a dedicated test database and refuses the development database", () => {
    expect(assertIsolatedTestDatabase("postgres://localhost/pms_test", "postgres://localhost/pms_dev")).toBe("pms_test");
    expect(() => assertIsolatedTestDatabase("postgres://localhost/pms_dev", "postgres://localhost/pms_dev")).toThrow(
      /_test/,
    );
    expect(() => assertIsolatedTestDatabase("postgres://localhost/pms_test", "postgres://localhost/pms_test")).toThrow(
      /same as the development/,
    );
  });
});
