import { NextResponse } from "next/server";
import {
  executeSearch,
  parseQueryToFilter,
  validateQuery,
} from "@/lib/search";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";

const MAX_LIMIT = 100;

// Search is debounced client-side (300ms), so a human typing rarely exceeds a
// few requests per second. This ceiling exists to stop unique-query flooding
// from burning LLM quota, not to throttle normal use.
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

function readBool(body: Record<string, unknown>, key: string): boolean {
  return body[key] === true;
}

export async function POST(request: Request) {
  const rl = rateLimit(clientKeyFromRequest(request), RATE_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many search requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  const query = typeof payload.query === "string" ? payload.query : null;
  if (query === null) {
    return NextResponse.json(
      { error: "Missing string field: query" },
      { status: 400 },
    );
  }

  const validated = validateQuery(query);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const limitRaw =
    typeof payload.limit === "number" && Number.isFinite(payload.limit)
      ? payload.limit
      : 60;
  const limit = Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIMIT);
  const tradeableOnly = readBool(payload, "tradeableOnly");

  try {
    const parsed = await parseQueryToFilter(validated.normalized);
    const result = await executeSearch(parsed.filter, { limit, tradeableOnly });

    return NextResponse.json({
      query: validated.normalized,
      filter: parsed.filter,
      cached: parsed.cached,
      source: parsed.source,
      usedFallback: result.usedFallback,
      total: result.total,
      cards: result.cards,
    });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
