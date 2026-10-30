import { NextResponse } from "next/server";
import {
  executeSearch,
  parseQueryToFilter,
  validateQuery,
} from "@/lib/search";
import { clientKeyFromRequest, rateLimit } from "@/lib/rate-limit";
import { withoutTags } from "@/lib/search/filter-tags";
import { ENERGY_TYPES, isTag } from "@/lib/search/tags";

const MAX_LIMIT = 100;
// Matches the scan cap in executeSearch: nothing ranks beyond it.
const MAX_OFFSET = 2000;

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

/** Pokémon types picked in the UI, deduplicated. */
function readTypes(
  body: Record<string, unknown>,
): { ok: true; types: string[] } | { ok: false; error: string } {
  const raw = body.types;
  if (raw === undefined) return { ok: true, types: [] };
  if (!Array.isArray(raw) || raw.some((t) => typeof t !== "string")) {
    return { ok: false, error: "types must be an array of strings" };
  }
  const known = new Set<string>(ENERGY_TYPES);
  const unknown = raw.filter((t) => !known.has(t));
  if (unknown.length) {
    return { ok: false, error: `Unknown type: ${unknown[0]}` };
  }
  return { ok: true, types: [...new Set(raw as string[])] };
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
  const typesResult = readTypes(payload);
  if (!typesResult.ok) {
    return NextResponse.json({ error: typesResult.error }, { status: 400 });
  }
  const { types } = typesResult;

  const query = typeof payload.query === "string" ? payload.query : null;
  // A tag- or type-only search (picked in the UI, nothing typed) needs no
  // query.
  const tagOnly = tags.length + types.length > 0 && !query?.trim();
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
  const offset =
    typeof payload.offset === "number" && Number.isFinite(payload.offset)
      ? Math.min(Math.max(0, Math.floor(payload.offset)), MAX_OFFSET)
      : 0;
  const tradeableOnly = readBool(payload, "tradeableOnly");

  try {
    const parsed = validated
      ? await parseQueryToFilter(validated.normalized)
      : { filter: { surface: "any" as const }, cached: false, source: "tags" };
    const filter = withoutTags(parsed.filter, excludeTags);
    const result = await executeSearch(filter, {
      limit,
      tradeableOnly,
      ...(offset ? { offset } : {}),
      ...(tags.length ? { tags, tagMode } : {}),
      ...(types.length ? { types } : {}),
    });

    return NextResponse.json({
      query: validated?.normalized ?? "",
      tags,
      tagMode,
      types,
      filter,
      cached: parsed.cached,
      source: parsed.source,
      usedFallback: result.usedFallback,
      total: result.total,
      offset,
      cards: result.cards,
    });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
