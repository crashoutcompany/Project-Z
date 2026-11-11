import { describe, expect, it } from "vitest";
import {
  addRecent,
  clearRecents,
  deleteSaved,
  EMPTY_HISTORY,
  MAX_RECENTS,
  parseHistory,
  readHistory,
  renameSaved,
  saveSearch,
  SEARCH_HISTORY_KEY,
  searchKey,
  writeHistory,
  type SearchState,
} from "./search-history";

function state(patch: Partial<SearchState> = {}): SearchState {
  return {
    mode: "name",
    query: "",
    setIds: [],
    types: [],
    rarities: [],
    showDuplicates: false,
    tags: [],
    tagMode: "all",
    exclude: [],
    ...patch,
  };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe("addRecent", () => {
  it(`keeps only the last ${MAX_RECENTS}, newest first`, () => {
    let history = EMPTY_HISTORY;
    for (let i = 0; i < MAX_RECENTS + 5; i++) {
      history = addRecent(history, state({ query: `q${i}` }), i);
    }
    expect(history.recents).toHaveLength(MAX_RECENTS);
    expect(history.recents[0]?.state.query).toBe(`q${MAX_RECENTS + 4}`);
    expect(history.recents.at(-1)?.state.query).toBe("q5");
  });

  it("moves an identical search to the top instead of repeating it", () => {
    let history = addRecent(EMPTY_HISTORY, state({ query: "pikachu" }), 1);
    history = addRecent(
      history,
      state({ query: "mew", types: ["psychic"] }),
      2,
    );
    history = addRecent(history, state({ query: " Pikachu " }), 3);
    expect(history.recents.map((r) => [r.state.query, r.at])).toEqual([
      [" Pikachu ", 3],
      ["mew", 2],
    ]);
  });

  it("treats the same query with other filters as a different search", () => {
    let history = addRecent(EMPTY_HISTORY, state({ query: "mew" }));
    history = addRecent(history, state({ query: "mew", types: ["psychic"] }));
    history = addRecent(
      history,
      state({ query: "mew", mode: "effects", types: ["psychic"] }),
    );
    expect(history.recents).toHaveLength(3);
  });

  it("clears every recent but keeps saved searches", () => {
    let history = addRecent(EMPTY_HISTORY, state({ query: "a" }));
    history = saveSearch(history, "Mine", state({ query: "b" }));
    history = clearRecents(history);
    expect(history.recents).toEqual([]);
    expect(history.saved).toHaveLength(1);
  });
});

describe("searchKey", () => {
  it("ignores pick order and the parsed filter", () => {
    const a = state({
      mode: "effects",
      query: "coin flip",
      types: ["fire", "grass"],
      tags: ["gust", "draw"],
      filter: { surface: "attack", attack: { tags: ["coin_flip"] } },
    });
    const b = state({
      mode: "effects",
      query: "coin  flip",
      types: ["grass", "fire"],
      tags: ["draw", "gust"],
    });
    expect(searchKey(a)).toBe(searchKey(b));
  });
});

describe("saved searches", () => {
  it("saves under a cleaned-up name, then renames and deletes", () => {
    let history = saveSearch(
      EMPTY_HISTORY,
      "  Grass   attackers ",
      state({ types: ["grass"] }),
      { id: "s1", at: 1 },
    );
    expect(history.saved).toEqual([
      {
        id: "s1",
        name: "Grass attackers",
        state: state({ types: ["grass"] }),
        at: 1,
      },
    ]);

    history = renameSaved(history, "s1", "Leafy");
    expect(history.saved[0]?.name).toBe("Leafy");
    // A blank name keeps the old one.
    expect(renameSaved(history, "s1", "   ").saved[0]?.name).toBe("Leafy");

    expect(deleteSaved(history, "s1").saved).toEqual([]);
  });

  it("ignores a save without a name", () => {
    expect(saveSearch(EMPTY_HISTORY, " ", state())).toBe(EMPTY_HISTORY);
  });
});

describe("parseHistory", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    let history = addRecent(
      EMPTY_HISTORY,
      state({
        mode: "effects",
        query: "coin flip",
        exclude: ["gust"],
        filter: { surface: "attack", attack: { tags: ["coin_flip"] } },
      }),
      5,
    );
    history = saveSearch(history, "Coins", state({ rarities: ["C"] }), {
      id: "x",
      at: 6,
    });
    expect(writeHistory(storage, history)).toBe(true);
    expect(storage.data.has(SEARCH_HISTORY_KEY)).toBe(true);
    expect(readHistory(storage)).toEqual(history);
  });

  it("drops invalid entries and keeps the valid ones", () => {
    const good = { state: state({ query: "ok" }), at: 1 };
    const raw = JSON.stringify({
      recents: [
        good,
        { state: state({ types: ["fairy" as never] }), at: 2 },
        { state: state({ tags: ["not_a_tag" as never] }), at: 3 },
        { state: state({ rarities: ["ZZZ"] }), at: 4 },
        { state: { ...state(), mode: "fuzzy" }, at: 5 },
        { state: state({ filter: { surface: "nowhere" } as never }), at: 6 },
        "junk",
      ],
      saved: [
        { id: "a", name: "", state: state(), at: 1 },
        { id: "b", name: "Fine", state: state(), at: 2 },
      ],
    });
    const history = parseHistory(raw);
    expect(history.recents).toEqual([good]);
    expect(history.saved.map((s) => s.id)).toEqual(["b"]);
  });

  it("caps recents read from storage", () => {
    const recents = Array.from({ length: 15 }, (_, i) => ({
      state: state({ query: `q${i}` }),
      at: i,
    }));
    expect(parseHistory(JSON.stringify({ recents })).recents).toHaveLength(
      MAX_RECENTS,
    );
  });

  it("treats missing, corrupt or wrongly shaped data as empty", () => {
    expect(parseHistory(null)).toEqual(EMPTY_HISTORY);
    expect(parseHistory("{not json")).toEqual(EMPTY_HISTORY);
    expect(parseHistory("42")).toEqual(EMPTY_HISTORY);
    expect(parseHistory(JSON.stringify({ recents: "nope" }))).toEqual(
      EMPTY_HISTORY,
    );
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(readHistory(broken)).toEqual(EMPTY_HISTORY);
    expect(writeHistory(broken, EMPTY_HISTORY)).toBe(false);
  });
});
