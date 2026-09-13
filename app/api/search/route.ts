import { NextResponse } from "next/server";
import {
  executeSearch,
  parseQueryToFilter,
  validateQuery,
} from "@/lib/search";

const MAX_LIMIT = 100;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof (body as { query: unknown }).query === "string"
      ? (body as { query: string }).query
      : null;

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
    typeof body === "object" &&
    body !== null &&
    "limit" in body &&
    typeof (body as { limit: unknown }).limit === "number"
      ? (body as { limit: number }).limit
      : 60;
  const limit = Math.min(Math.max(1, Math.floor(limitRaw)), MAX_LIMIT);

  try {
    const parsed = await parseQueryToFilter(validated.normalized);
    const result = await executeSearch(parsed.filter, { limit });

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
