import { NextResponse } from "next/server";
import { executeSearch, parseQueryToFilter, validateQuery } from "@/lib/search";
import { isRarityCode } from "@/lib/rarity";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { FilterJSONSchema, type FilterJSON } from "@/lib/search/filter-schema";
import { withoutTags } from "@/lib/search/filter-tags";
import { ENERGY_TYPES, isTag } from "@/lib/search/tags";

const MAX_LIMIT = 100;
// Matches the scan cap in executeSearch: nothing ranks beyond it.
const MAX_OFFSET = 2000;
const MAX_SET_IDS = 200;

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

/** Rarity codes picked in the UI, deduplicated. */
function readRarities(
  body: Record<string, unknown>,
): { ok: true; rarities: string[] } | { ok: false; error: string } {
  const raw = body.rarities;
  if (raw === undefined) return { ok: true, rarities: [] };
  if (!Array.isArray(raw) || raw.some((r) => typeof r !== "string")) {
    return { ok: false, error: "rarities must be an array of strings" };
  }
  const unknown = raw.filter((r) => !isRarityCode(r));
  if (unknown.length) {
    return { ok: false, error: `Unknown rarity: ${unknown[0]}` };
  }
  return { ok: true, rarities: [...new Set(raw as string[])] };
}

/** Set ids picked in the UI, deduplicated. */
function readSetIds(
  body: Record<string, unknown>,
): { ok: true; setIds: number[] } | { ok: false; error: string } {
  const raw = body.setIds;
  if (raw === undefined) return { ok: true, setIds: [] };
  if (
    !Array.isArray(raw) ||
    raw.length > MAX_SET_IDS ||
    raw.some((id) => !Number.isSafeInteger(id) || (id as number) <= 0)
  ) {
    return { ok: false, error: "setIds must be an array of set ids" };
  }
  return { ok: true, setIds: [...new Set(raw as number[])] };
}

/**
 * What a restored recent or saved search parsed to, so it reruns without
 * parsing (and an LLM call) and returns the same cards.
 */
function readFilter(
  body: Record<string, unknown>,
): { ok: true; filter: FilterJSON | null } | { ok: false; error: string } {
  if (body.filter === undefined) return { ok: true, filter: null };
  const parsed = FilterJSONSchema.safeParse(body.filter);
  return parsed.success
    ? { ok: true, filter: parsed.data }
    : { ok: false, error: "filter is not a valid FilterJSON" };
}

export async function POST(request: Request) {
  // The proxy skips /api, so the route checks the session itself.
  const session = await getSession(request.headers);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`search:${session.user.id}`, RATE_LIMIT);
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
    return NextResponse.json(
      { error: "Body must be an object" },
      { status: 400 },
    );
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
  const raritiesResult = readRarities(payload);
  if (!raritiesResult.ok) {
    return NextResponse.json({ error: raritiesResult.error }, { status: 400 });
  }
  const { rarities } = raritiesResult;
  const setIdsResult = readSetIds(payload);
  if (!setIdsResult.ok) {
    return NextResponse.json({ error: setIdsResult.error }, { status: 400 });
  }
  const { setIds } = setIdsResult;
  const showDuplicates = readBool(payload, "showDuplicates");
  const filterResult = readFilter(payload);
  if (!filterResult.ok) {
    return NextResponse.json({ error: filterResult.error }, { status: 400 });
  }

  const query = typeof payload.query === "string" ? payload.query : null;
  // A tag-, type-, rarity- or set-only search (picked in the UI, nothing typed)
  // needs no query.
  const tagOnly =
    tags.length + types.length + rarities.length + setIds.length > 0 &&
    !query?.trim();
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
    const parsed = !validated
      ? { filter: { surface: "any" as const }, cached: false, source: "tags" }
      : filterResult.filter
        ? { filter: filterResult.filter, cached: true, source: "client" }
        : await parseQueryToFilter(validated.normalized);
    const filter = withoutTags(parsed.filter, excludeTags);
    const result = await executeSearch(filter, {
      limit,
      tradeableOnly,
      ...(offset ? { offset } : {}),
      ...(tags.length ? { tags, tagMode } : {}),
      ...(types.length ? { types } : {}),
      ...(rarities.length ? { rarities } : {}),
      ...(setIds.length ? { setIds } : {}),
      ...(showDuplicates ? { showDuplicates } : {}),
    });

    return NextResponse.json({
      query: validated?.normalized ?? "",
      tags,
      tagMode,
      types,
      rarities,
      setIds,
      showDuplicates,
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
