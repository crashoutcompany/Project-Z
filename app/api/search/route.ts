import { NextResponse } from "next/server";
import {
  executeSearch,
  parseQueryToFilter,
  validateQuery,
} from "@/lib/search";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";
import { withoutTags } from "@/lib/search/filter-tags";
import { isTag } from "@/lib/search/tags";

const MAX_LIMIT = 100;

// Search is debounced client-side (300ms), so a human typing rarely exceeds a
// few requests per second. This ceiling exists to stop unique-query flooding
// from burning LLM quota, not to throttle normal use.
const RATE_LIMIT = { limit: 60, windowMs: 60_000 };

function readBool(body: Record<string, unknown>, key: string): boolean {
  return body[key] === true;
}

/** A list of known tag names from the UI, deduplicated. */
function readTags(
  body: Record<string, unknown>,
  key: "tags" | "excludeTags",
): { ok: true; tags: string[] } | { ok: false; error: string } {
  const raw = body[key];
  if (raw === undefined) return { ok: true, tags: [] };
  if (!Array.isArray(raw) || raw.some((t) => typeof t !== "string")) {
    return { ok: false, error: `${key} must be an array of strings` };
  }
  const unknown = raw.filter((t) => !isTag(t));
  if (unknown.length) {
    return { ok: false, error: `Unknown tag: ${unknown[0]}` };
  }
  return { ok: true, tags: [...new Set(raw as string[])] };
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

  const tagsResult = readTags(payload, "tags");
  if (!tagsResult.ok) {
    return NextResponse.json({ error: tagsResult.error }, { status: 400 });
  }
  const { tags } = tagsResult;
  // Tags the user dismissed from the parsed query.
  const excludeResult = readTags(payload, "excludeTags");
  if (!excludeResult.ok) {
    return NextResponse.json({ error: excludeResult.error }, { status: 400 });
  }
  const excludeTags = excludeResult.tags;
  if (
    payload.tagMode !== undefined &&
    payload.tagMode !== "all" &&
    payload.tagMode !== "any"
  ) {
    return NextResponse.json(
      { error: 'tagMode must be "all" or "any"' },
      { status: 400 },
    );
  }
  const tagMode = payload.tagMode === "any" ? "any" : "all";

  const query = typeof payload.query === "string" ? payload.query : null;
  // A tag-only search (picked in the UI, nothing typed) needs no query.
  const tagOnly = tags.length > 0 && !query?.trim();
  if (query === null && !tagOnly) {
    return NextResponse.json(
      { error: "Missing string field: query" },
      { status: 400 },
    );
  }

  const validated = tagOnly ? null : validateQuery(query ?? "");
  if (validated && !validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const limitRaw =
    typeof payload.limit === "number" && Number.isFinite(payload.limit)
      ? payload.limit
      : 60;
  const limit = Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIMIT);
  const tradeableOnly = readBool(payload, "tradeableOnly");

  try {
    const parsed = validated
      ? await parseQueryToFilter(validated.normalized)
      : { filter: { surface: "any" as const }, cached: false, source: "tags" };
    const filter = withoutTags(parsed.filter, excludeTags);
    const result = await executeSearch(filter, {
      limit,
      tradeableOnly,
      ...(tags.length ? { tags, tagMode } : {}),
    });

    return NextResponse.json({
      query: validated?.normalized ?? "",
      tags,
      tagMode,
      filter,
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
