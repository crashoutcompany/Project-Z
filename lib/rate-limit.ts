/**
 * Fixed-window rate limiter for API routes that fan out to paid upstreams
 * (e.g. the LLM behind /api/search).
 *
 * Backed by the same store as the auth limiter: Upstash Redis when
 * UPSTASH_REDIS_REST_* (or KV_REST_API_*) is set, so limits are global across
 * instances, and in-memory otherwise (local, CI), or whenever Redis errors.
 */
import {
  createAuthRateLimitStore,
  rateLimitPrefixFromAppName,
  type RateLimitStore,
} from "@/lib/auth/rate-limit";
import { APP_NAME } from "@/lib/auth/config";

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets. */
  retryAfterSec: number;
};

let store: RateLimitStore | undefined;

function getStore(): RateLimitStore {
  return (store ??= createAuthRateLimitStore({
    env: process.env,
    appSlug: rateLimitPrefixFromAppName(APP_NAME),
    // Only used to hash storage keys, so a missing secret (local, CI) is fine.
    secret: process.env.BETTER_AUTH_SECRET?.trim() || "local-rate-limit",
  }));
}

export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateLimitResult> {
  const decision = await getStore().consume(`api-rl:${key}`, {
    max: opts.limit,
    window: Math.max(1, Math.ceil(opts.windowMs / 1000)),
  });
  return {
    ok: decision.allowed,
    retryAfterSec: decision.retryAfter ?? 0,
  };
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
