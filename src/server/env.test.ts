import { describe, expect, test } from "vitest";
import { parseEnv } from "@/server/env";

const base = {
  DATABASE_URL: "postgresql://pms:pms@localhost:5432/pms_dev",
  BETTER_AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz012345",
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseEnv", () => {
  test("applies the 25 MB attachment default", () => {
    const env = parseEnv(base);
    expect(env.ATTACHMENT_MAX_BYTES).toBe(25 * 1024 * 1024);
    expect(env.STORAGE_DRIVER).toBe("local");
  });

  test("rejects a short auth secret", () => {
    expect(() => parseEnv({ ...base, BETTER_AUTH_SECRET: "too-short" })).toThrow(/BETTER_AUTH_SECRET/);
  });

  test("requires a complete OIDC set when any OIDC variable is present", () => {
    expect(() => parseEnv({ ...base, AUTH_OIDC_CLIENT_ID: "abc" })).toThrow(/AUTH_OIDC/);
  });

  test("requires S3 credentials when the S3 driver is selected", () => {
    expect(() => parseEnv({ ...base, STORAGE_DRIVER: "s3" })).toThrow(/S3_BUCKET/);
  });
});
