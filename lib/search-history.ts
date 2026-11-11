import { z } from "zod";
import { isRarityCode } from "@/lib/rarity";
import { FilterJSONSchema } from "@/lib/search/filter-schema";
import { ALL_TAGS, ENERGY_TYPES } from "@/lib/search/tags";

/**
 * Recent and saved card searches, kept in this browser only under one
 * versioned localStorage key. Every read is validated: entries that no longer
 * match the schema (renamed tags, a hand-edited value) are dropped one by one
 * instead of throwing the whole history away.
 */
export const SEARCH_HISTORY_KEY = "z:searches:v1";
export const MAX_RECENTS = 10;
export const MAX_SAVED = 50;
export const MAX_NAME_LENGTH = 60;

const TagSchema = z.enum(ALL_TAGS);

/** Everything that decides a search's results. */
export const SearchStateSchema = z.object({
  mode: z.enum(["name", "effects"]),
  /** The active tab's query. */
  query: z.string().max(200),
  setIds: z.array(z.number().int().positive()).max(200),
  types: z.array(z.enum(ENERGY_TYPES)),
  rarities: z.array(z.string().refine(isRarityCode)),
  showDuplicates: z.boolean(),
  tags: z.array(TagSchema),
  tagMode: z.enum(["all", "any"]),
  /** Tags parsed from the query that the user dismissed. */
  exclude: z.array(TagSchema),
  /** What the query parsed to, so a re-run skips parsing and matches exactly. */
  filter: FilterJSONSchema.optional(),
});

export type SearchState = z.infer<typeof SearchStateSchema>;

const RecentSchema = z.object({
  state: SearchStateSchema,
  at: z.number(),
});

const SavedSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  state: SearchStateSchema,
  at: z.number(),
});

export type RecentSearch = z.infer<typeof RecentSchema>;
export type SavedSearch = z.infer<typeof SavedSchema>;

export type SearchHistory = {
  recents: RecentSearch[];
  saved: SavedSearch[];
};

export const EMPTY_HISTORY: SearchHistory = { recents: [], saved: [] };

/** Keeps the entries that pass `schema`, dropping the rest. */
function validEntries<T>(schema: z.ZodType<T>, raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Parses stored JSON; anything unreadable becomes an empty history. */
export function parseHistory(raw: string | null): SearchHistory {
  if (!raw) return EMPTY_HISTORY;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_HISTORY;
  }
  if (typeof data !== "object" || data === null) return EMPTY_HISTORY;
  const { recents, saved } = data as Record<string, unknown>;
  return {
    recents: validEntries(RecentSchema, recents).slice(0, MAX_RECENTS),
    saved: validEntries(SavedSchema, saved).slice(0, MAX_SAVED),
  };
}

const sorted = <T>(values: T[]) => [...values].sort();

/**
 * Identifies a search regardless of pick order and query spacing. The parsed
 * filter is left out: it follows from the query.
 */
export function searchKey(state: SearchState): string {
  const effects = state.mode === "effects";
  return JSON.stringify([
    state.mode,
    state.query.trim().replace(/\s+/g, " ").toLowerCase(),
    sorted(state.setIds),
    sorted(state.types),
    sorted(state.rarities),
    state.showDuplicates,
    effects ? sorted(state.tags) : [],
    effects && state.tags.length > 1 ? state.tagMode : "all",
    effects && state.query.trim() ? sorted(state.exclude) : [],
  ]);
}

/** Puts `state` first, dropping an identical older entry and the overflow. */
export function addRecent(
  history: SearchHistory,
  state: SearchState,
  at = Date.now(),
): SearchHistory {
  const key = searchKey(state);
  const rest = history.recents.filter((r) => searchKey(r.state) !== key);
  return {
    ...history,
    recents: [{ state, at }, ...rest].slice(0, MAX_RECENTS),
  };
}

export function clearRecents(history: SearchHistory): SearchHistory {
  return { ...history, recents: [] };
}

function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Saves `state` under `name`, newest first. A blank name is ignored. */
export function saveSearch(
  history: SearchHistory,
  name: string,
  state: SearchState,
  { at = Date.now(), id = newId() }: { at?: number; id?: string } = {},
): SearchHistory {
  const clean = cleanName(name);
  if (!clean) return history;
  return {
    ...history,
    saved: [{ id, name: clean, state, at }, ...history.saved].slice(
      0,
      MAX_SAVED,
    ),
  };
}

export function renameSaved(
  history: SearchHistory,
  id: string,
  name: string,
): SearchHistory {
  const clean = cleanName(name);
  if (!clean) return history;
  return {
    ...history,
    saved: history.saved.map((s) => (s.id === id ? { ...s, name: clean } : s)),
  };
}

export function deleteSaved(history: SearchHistory, id: string): SearchHistory {
  return { ...history, saved: history.saved.filter((s) => s.id !== id) };
}

/** The minimal subset of `Storage` the helpers need, for tests. */
export type HistoryStorage = Pick<Storage, "getItem" | "setItem">;

export function readHistory(storage: HistoryStorage): SearchHistory {
  try {
    return parseHistory(storage.getItem(SEARCH_HISTORY_KEY));
  } catch {
    // Throws when storage is disabled (private browsing in some browsers).
    return EMPTY_HISTORY;
  }
}

/** Writes `history`; returns false when storage refuses (quota, disabled). */
export function writeHistory(
  storage: HistoryStorage,
  history: SearchHistory,
): boolean {
  try {
    storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch {
    return false;
  }
}
