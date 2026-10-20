"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import type { Set } from "@/prisma/generated/client/client";
import { fetchCards, type FetchCardsParams } from "@/server/actions";
import { searchResultToCardWithSet } from "./card-mappers";
import { requestEffectsSearch } from "./effects-search";
import type { SearchMode } from "./SearchBox";
import type { CardWithSet } from "./types";

type UseCardSearchOptions = {
  sets: Set[];
  initialSetId: number;
  initialCards: CardWithSet[];
  initialCursor: number | null;
  defaultSearchMode: SearchMode;
  tradeableOnly: boolean;
};

/**
 * Owns the catalog state: which set is active, the current query and mode,
 * and the rows to show. Responses from superseded requests are dropped.
 */
export function useCardSearch({
  sets,
  initialSetId,
  initialCards,
  initialCursor,
  defaultSearchMode,
  tradeableOnly,
}: UseCardSearchOptions) {
  const [activeSetId, setActiveSetId] = useState(initialSetId);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultSearchMode);
  const [filterChips, setFilterChips] = useState<string[]>([]);
  const [cards, setCards] = useState<CardWithSet[]>(initialCards);
  const [cursor, setCursor] = useState<number | null>(initialCursor);
  const [resultsEpoch, setResultsEpoch] = useState(0);
  const [effectsError, setEffectsError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestSeq = useRef(0);

  const replaceResults = useCallback(
    (nextCards: CardWithSet[], nextCursor: number | null) => {
      setCards(nextCards);
      setCursor(nextCursor);
      setResultsEpoch((n) => n + 1);
    },
    [],
  );

  /** Loads catalog rows (a set page or a name search) and clears search UI. */
  const loadCards = useCallback(
    async (seq: number, params: FetchCardsParams) => {
      const result = await fetchCards(params);
      if (seq !== requestSeq.current) return;
      replaceResults(result.cards as CardWithSet[], result.nextCursor);
      setFilterChips([]);
      setEffectsError(null);
    },
    [replaceResults],
  );

  const loadSet = useCallback(
    (setId: number) => {
      const seq = ++requestSeq.current;
      startTransition(() => loadCards(seq, { setId, tradeableOnly }));
    },
    [loadCards, tradeableOnly],
  );

  const runNameSearch = useCallback(
    (query: string) => {
      const seq = ++requestSeq.current;
      startTransition(() =>
        loadCards(
          seq,
          query
            ? { search: query, tradeableOnly }
            : { setId: activeSetId, tradeableOnly },
        ),
      );
    },
    [activeSetId, loadCards, tradeableOnly],
  );

  const runEffectsSearch = useCallback(
    (query: string) => {
      const seq = ++requestSeq.current;
      startTransition(async () => {
        if (!query) {
          await loadCards(seq, { setId: activeSetId, tradeableOnly });
          return;
        }

        const outcome = await requestEffectsSearch(query, tradeableOnly);
        if (seq !== requestSeq.current) return;
        if (!outcome.ok) {
          setEffectsError(outcome.error);
          setFilterChips([]);
          replaceResults([], null);
          return;
        }
        setEffectsError(null);
        setFilterChips(outcome.chips);
        replaceResults(
          outcome.cards.map((c) => searchResultToCardWithSet(c, sets)),
          null,
        );
      });
    },
    [activeSetId, loadCards, replaceResults, sets, tradeableOnly],
  );

  const handleSetChange = useCallback(
    (setId: number) => {
      setActiveSetId(setId);
      loadSet(setId);
    },
    [loadSet],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchMode === "name") runNameSearch(query);
      else runEffectsSearch(query);
    },
    [searchMode, runNameSearch, runEffectsSearch],
  );

  const handleModeChange = useCallback(
    (next: SearchMode) => {
      setSearchMode(next);
      setSearchQuery("");
      setFilterChips([]);
      setEffectsError(null);
      loadSet(activeSetId);
    },
    [activeSetId, loadSet],
  );

  return {
    activeSetId,
    searchQuery,
    searchMode,
    filterChips,
    cards,
    cursor,
    resultsEpoch,
    effectsError,
    isPending,
    isSearching: searchQuery.length > 0,
    handleSetChange,
    handleSearchChange,
    handleModeChange,
  };
}
