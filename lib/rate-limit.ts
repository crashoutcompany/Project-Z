/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Scope: best-effort abuse guard for public endpoints that fan out to paid
 * upstreams (e.g. the LLM behind /api/search). State lives in the function
 * instance, so limits are per-instance rather than global. Fluid Compute reuses
 * instances across requests, which makes this meaningfully effective, but it
 * is not a substitute for a shared store if strict global limits are needed.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSec: number;
};

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
  now = Date.now(),
): RateLimitResult {
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= MAX_TRACKED_KEYS) pruneExpired(now);
    bucket = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, opts.limit - bucket.count);
  return {
    ok: bucket.count <= opts.limit,
    remaining,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function pruneExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Still full of live keys: drop the oldest entries rather than grow unbounded.
  if (buckets.size >= MAX_TRACKED_KEYS) {
    let toDrop = Math.ceil(MAX_TRACKED_KEYS / 10);
    for (const key of buckets.keys()) {
      if (toDrop-- <= 0) break;
      buckets.delete(key);
    }
  }
}

/** Best-effort client identifier from proxy headers. */
export function clientKeyFromRequest(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "anonymous";
}
