import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  test("defaults to /start", () => {
    expect(safeRedirectPath(undefined)).toBe("/start");
    expect(safeRedirectPath("")).toBe("/start");
  });

  test("accepts same-origin relative paths", () => {
    expect(safeRedirectPath("/projects/AQUA")).toBe("/projects/AQUA");
    expect(safeRedirectPath("/executive?tab=log")).toBe("/executive?tab=log");
  });

  test("rejects open redirects and auth loops", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/start");
    expect(safeRedirectPath("//evil.example")).toBe("/start");
    expect(safeRedirectPath("/\\evil.example")).toBe("/start");
    expect(safeRedirectPath("/login")).toBe("/start");
    expect(safeRedirectPath("/api/auth/ok")).toBe("/start");
  });
});
