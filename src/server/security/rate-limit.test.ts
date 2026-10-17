import { describe, expect, test } from "vitest";
import { consumeRateLimit } from "@/server/security/rate-limit";

describe("in-process rate limit", () => {
  test("rejects once the window is exhausted", () => {
    const key = `unit-${crypto.randomUUID()}`;
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    expect(consumeRateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = consumeRateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
