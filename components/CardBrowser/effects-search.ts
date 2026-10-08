import type { FilterJSON, SearchCardResult } from "@/lib/search";
import { filterToChips } from "./card-mappers";

export type EffectsSearchOutcome =
  | { ok: true; chips: string[]; cards: SearchCardResult[] }
  | { ok: false; error: string };

/** POSTs a natural-language query to /api/search and normalizes the outcome. */
export async function requestEffectsSearch(
  query: string,
  tradeableOnly: boolean,
): Promise<EffectsSearchOutcome> {
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 60, tradeableOnly }),
    });
    const data = (await res.json()) as {
      error?: string;
      filter?: FilterJSON;
      cards?: SearchCardResult[];
    };
    if (!res.ok) return { ok: false, error: data.error ?? "Search failed" };
    return {
      ok: true,
      chips: data.filter ? filterToChips(data.filter) : [],
      cards: data.cards ?? [],
    };
  } catch {
    return { ok: false, error: "Search request failed" };
  }
}
