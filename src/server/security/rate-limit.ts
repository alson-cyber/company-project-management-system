interface Bucket {
  remaining: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitDecision {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window limiter kept in this process. It is a brake for one Node server,
 * not a distributed control. Put the same limits at the edge when more than one
 * instance serves traffic (docs/SECURITY.md).
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitDecision {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { remaining: limit - 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (current.remaining <= 0) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.remaining -= 1;
  return { ok: true, retryAfterSeconds: 0 };
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
