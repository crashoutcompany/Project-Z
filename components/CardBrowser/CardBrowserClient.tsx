"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Set } from "@/prisma/generated/client/client";
import { fetchCards } from "@/server/actions";
import { cn } from "@/lib/utils";
import { CardGrid } from "./CardGrid";
import { SearchBox, type SearchMode } from "./SearchBox";
import { FilterBar } from "./FilterBar";
import { setFilterLabel } from "./SetFilter";
import { typeLabel } from "./type-info";
import { ActiveFilters } from "./ActiveFilters";
import { NoMatches } from "./NoMatches";
import { CardDetailSheet } from "./CardDetailSheet";
import { SelectionModeToggle } from "./SelectionModeToggle";
import { useCardDetail } from "./use-card-detail";
import { useCardSelection } from "./use-card-selection";
import {
  CardBrowserMode,
  CardPage,
  CardWithSet,
  SelectedCards,
  TagMode,
} from "./types";
import type { CardDetail } from "@/lib/card-detail";
import type { FilterJSON, SearchCardResult } from "@/lib/search";
import { filterTags } from "@/lib/search/filter-tags";

const PAGE_SIZE = 60;

/** Narrow both tabs alike, and carry over when switching tabs. */
type Filters = {
  /** Empty = every set. */
  setIds: number[];
  types: string[];
  rarities: string[];
  /** List every print instead of one per name + attacks. */
  showDuplicates: boolean;
};

/** The Effects tab's own query and tags. */
type EffectsState = {
  query: string;
  tags: string[];
  tagMode: TagMode;
  /** Parsed tags the user dismissed. */
  exclude: string[];
};

/** Everything that decides what the browser shows. Each tab keeps its query. */
type View = {
  mode: SearchMode;
  nameQuery: string;
  effects: EffectsState;
  filters: Filters;
};

type EffectsResponse = {
  error?: string;
  filter?: FilterJSON;
  cards?: SearchCardResult[];
  total?: number;
  usedFallback?: boolean;
};

type Results = {
  cards: CardWithSet[];
  cursor: number | null;
  total: number;
  /** The view these results answer; load more repeats its request. */
  view: View;
  /** Tags parsed from the effects query, minus picked and dismissed ones. */
  parsedTags: string[];
  /** Other parsed constraints, shown read-only. */
  notes: string[];
  error: string | null;
  /** Bumped per result set so the grid remounts with fresh paging. */
  epoch: number;
};

/** The Effects tab searches the API once it has text, tags or types. */
function usesEffectsApi(view: View): boolean {
  if (view.mode !== "effects") return false;
  const { query, tags } = view.effects;
  return Boolean(query) || tags.length + view.filters.types.length > 0;
}

function filterParams({ setIds, types, rarities, showDuplicates }: Filters) {
  return {
    ...(setIds.length ? { setIds } : {}),
    ...(types.length ? { types } : {}),
    ...(rarities.length ? { rarities } : {}),
    ...(showDuplicates ? { showDuplicates } : {}),
  };
}

/** fetchCards params for a name search or plain browsing. */
function catalogParams(view: View, tradeableOnly: boolean) {
  const search = view.mode === "name" ? view.nameQuery : "";
  return {
    tradeableOnly,
    ...(search ? { search } : {}),
    ...filterParams(view.filters),
  };
}

function postEffectsSearch(view: View, tradeableOnly: boolean, offset: number) {
  const { query, tags, tagMode, exclude } = view.effects;
  return fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: PAGE_SIZE,
      tradeableOnly,
      ...(offset ? { offset } : {}),
      ...(tags.length ? { tags, tagMode } : {}),
      ...(query && exclude.length ? { excludeTags: exclude } : {}),
      ...filterParams(view.filters),
    }),
  });
}

/** Offset of the next page, or null when every match is loaded. */
function nextOffset(offset: number, received: number, total: number) {
  const next = offset + received;
  return received > 0 && next < total ? next : null;
}

type CardBrowserClientProps = {
  sets: Set[];
  /** Sets the browser opens on; empty = every set. */
  initialSetIds: number[];
  initialCards: CardWithSet[];
  initialCursor: number | null;
  initialTotal: number;
  mode: CardBrowserMode;
  tradeableOnly: boolean;
  defaultSearchMode?: SearchMode;
  showSearchModes?: boolean;
  onSelectionChange?: (selected: SelectedCards) => void;
  initialSelected?: SelectedCards;
  selected?: SelectedCards;
  onCardClick?: (card: CardWithSet) => void;
  cardCounts?: Record<number, number>;
  /** When false, catalog cards are not clickable (e.g. shared-deck hydration). */
  interactive?: boolean;
  initialDetail?: CardDetail | null;
  syncDexUrl?: boolean;
};

const EMPTY_SELECTION: SelectedCards = { want: [], give: [] };

const EMPTY_EFFECTS: EffectsState = {
  query: "",
  tags: [],
  tagMode: "all",
  exclude: [],
};

/** Parsed constraints other than tags, shown read-only beside the tag pills. */
function filterToNotes(filter: FilterJSON): string[] {
  const chips: string[] = [];
  if (filter.cardType) chips.push(filter.cardType);
  if (filter.trainerType) chips.push(filter.trainerType);
  if (filter.isEx) chips.push("EX");
  if (filter.stage?.length) chips.push(...filter.stage);
  if (filter.energyType?.length) chips.push(...filter.energyType);
  if (filter.hpMin != null) chips.push(`HP≥${filter.hpMin}`);
  if (filter.attack?.energyCost != null) {
    chips.push(`${filter.attack.energyCost} energy`);
  }
  if (filter.attack?.damageMin != null) {
    chips.push(`${filter.attack.damageMin}+ dmg`);
  }
  if (filter.attack?.damageKind) chips.push(filter.attack.damageKind);
  if (filter.textFallback) chips.push(`text:${filter.textFallback}`);
  return chips;
}

/** What an effects search is narrowed by, e.g. "Filtering by 2 tags · Grass". */
function effectsSummary(
  query: string,
  tagCount: number,
  tagMode: TagMode,
  types: string[],
): string {
  if (query) return `Searching effects for “${query}”`;
  const parts: string[] = [];
  if (tagCount === 1) parts.push("1 tag");
  if (tagCount > 1) {
    parts.push(
      `${tagCount} tags · matching ${tagMode === "all" ? "all of them" : "any of them"}`,
    );
  }
  if (types.length) parts.push(types.map(typeLabel).join(" or "));
  return `Filtering by ${parts.join(" · ")}`;
}

/** The status line above the results, without the count. */
function viewSummary(view: View, sets: Set[]): string {
  if (view.mode === "name" && view.nameQuery) {
    return `Searching names for “${view.nameQuery}”`;
  }
  if (usesEffectsApi(view)) {
    const { query, tags, tagMode } = view.effects;
    return effectsSummary(query, tags.length, tagMode, view.filters.types);
  }
  return setFilterLabel(sets, view.filters.setIds);
}

function cardCountLabel(total: number): string {
  return total === 1 ? "1 card" : `${total.toLocaleString("en-US")} cards`;
}

function searchResultToCardWithSet(
  card: SearchCardResult,
  sets: Set[],
): CardWithSet {
  const set =
    sets.find((s) => s.code === card.setCode) ??
    ({
      id: -1,
      code: card.setCode,
      setName: card.setCode,
      image: "",
      releaseDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Set);

  return {
    id: card.id,
    setId: set.id,
    number: card.number,
    name: card.name,
    cardType: card.cardType as CardWithSet["cardType"],
    imageUrl: card.imageUrl,
    rarity: card.rarity,
    isTradeable: card.isTradeable,
    pack: null,
    energyType: card.energyType,
    secondaryEnergyType: card.secondaryEnergyType,
    hp: card.hp,
    stage: null,
    isEx: card.isEx,
    isBaby: false,
    weakness: null,
    retreatCost: null,
    trainerType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    set,
  };
}

/**
 * Shows a shadow under the sticky toolbar only while it is stuck: a marker
 * just above it leaves the viewport (under the 4rem navbar) when it sticks.
 */
function useStuck() {
  const markerRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!(entry?.isIntersecting ?? true)),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);
  return { markerRef, stuck };
}

export function CardBrowserClient({
  sets,
  initialSetIds,
  initialCards,
  initialCursor,
  initialTotal,
  mode,
  tradeableOnly,
  defaultSearchMode = "name",
  showSearchModes = true,
  onSelectionChange,
  initialSelected = EMPTY_SELECTION,
  selected,
  onCardClick,
  cardCounts,
  interactive = true,
  initialDetail = null,
  syncDexUrl = false,
}: CardBrowserClientProps) {
  const [view, setView] = useState<View>(() => ({
    mode: defaultSearchMode,
    nameQuery: "",
    effects: EMPTY_EFFECTS,
    filters: {
      setIds: initialSetIds,
      types: [],
      rarities: [],
      showDuplicates: false,
    },
  }));
  const [results, setResults] = useState<Results>({
    cards: initialCards,
    cursor: initialCursor,
    total: initialTotal,
    view,
    parsedTags: [],
    notes: [],
    error: null,
    epoch: 0,
  });
  const [isPending, startTransition] = useTransition();
  const requestSeq = useRef(0);
  const { markerRef, stuck } = useStuck();

  const selection = useCardSelection({
    initialSelected,
    selected,
    onSelectionChange,
  });
  const detail = useCardDetail({ initialDetail, syncDexUrl });

  /** Shows `next` and fetches its first page; a newer call wins. */
  const update = useCallback(
    (next: View) => {
      setView(next);
      const seq = ++requestSeq.current;
      startTransition(async () => {
        const show = (fields: Partial<Results>) =>
          setResults((prev) => ({
            cards: [],
            cursor: null,
            total: 0,
            parsedTags: [],
            notes: [],
            error: null,
            ...fields,
            view: next,
            epoch: prev.epoch + 1,
          }));

        if (!usesEffectsApi(next)) {
          const page = await fetchCards(catalogParams(next, tradeableOnly));
          if (seq !== requestSeq.current) return;
          const cards = page.cards as CardWithSet[];
          show({
            cards,
            cursor: page.nextCursor,
            total: page.total ?? cards.length,
          });
          return;
        }

        try {
          const res = await postEffectsSearch(next, tradeableOnly, 0);
          const data = (await res.json()) as EffectsResponse;
          if (seq !== requestSeq.current) return;
          if (!res.ok) {
            show({ error: data.error ?? "Search failed" });
            return;
          }
          const found = data.cards ?? [];
          const total = data.total ?? found.length;
          show({
            cards: found.map((c) => searchResultToCardWithSet(c, sets)),
            cursor: nextOffset(0, found.length, total),
            total,
            parsedTags: data.filter
              ? filterTags(data.filter).filter(
                  (t) => !next.effects.tags.includes(t),
                )
              : [],
            notes: data.filter ? filterToNotes(data.filter) : [],
          });
        } catch {
          if (seq !== requestSeq.current) return;
          show({ error: "Search request failed" });
        }
      });
    },
    [tradeableOnly, sets],
  );

  const resultView = results.view;
  const loadPage = useCallback(
    async (cursor: number): Promise<CardPage> => {
      if (!usesEffectsApi(resultView)) {
        const page = await fetchCards({
          ...catalogParams(resultView, tradeableOnly),
          cursor,
        });
        return {
          cards: page.cards as CardWithSet[],
          nextOffset: page.nextCursor,
        };
      }
      const done = { cards: [], nextOffset: null };
      // A failed page ends paging instead of throwing out of the grid's
      // transition, which would take the page down to the error boundary.
      try {
        const res = await postEffectsSearch(resultView, tradeableOnly, cursor);
        const data = (await res.json()) as EffectsResponse;
        if (!res.ok) return done;
        const found = data.cards ?? [];
        return {
          cards: found.map((c) => searchResultToCardWithSet(c, sets)),
          nextOffset: nextOffset(cursor, found.length, data.total ?? 0),
        };
      } catch {
        return done;
      }
    },
    [resultView, tradeableOnly, sets],
  );

  const setFilters = (patch: Partial<Filters>) =>
    update({ ...view, filters: { ...view.filters, ...patch } });
  const setEffects = (patch: Partial<EffectsState>) =>
    update({ ...view, effects: { ...view.effects, ...patch } });

  const handleSearchChange = (query: string) => {
    if (view.mode === "name") update({ ...view, nameQuery: query });
    // A new query brings back every tag it parses to.
    else setEffects({ query, exclude: [] });
  };

  const handleRemoveParsedTag = (tag: string) => {
    // Dismissing the query's last constraint leaves nothing to search for,
    // so drop the query instead of listing every card.
    if (results.parsedTags.length === 1 && results.notes.length === 0) {
      setEffects({ query: "", exclude: [] });
    } else {
      setEffects({ exclude: [...view.effects.exclude, tag] });
    }
  };

  const handleClearAll = () =>
    update({
      ...view,
      nameQuery: view.mode === "name" ? "" : view.nameQuery,
      effects:
        view.mode === "effects"
          ? EMPTY_EFFECTS
          : { ...view.effects, tags: [], exclude: [] },
      filters: { setIds: [], types: [], rarities: [], showDuplicates: false },
    });

  const { openCard } = detail;
  const { toggleCard } = selection;
  const handleCardClick = useCallback(
    (card: CardWithSet) => {
      if (mode === "view") openCard(card);
      else if (mode === "build") onCardClick?.(card);
      else if (mode === "select") toggleCard(card);
    },
    [mode, openCard, onCardClick, toggleCard],
  );

  const { filters, effects } = view;
  const query = view.mode === "name" ? view.nameQuery : effects.query;
  const pickedSets = useMemo(
    () =>
      filters.setIds.map((id) => ({
        id,
        label: sets.find((s) => s.id === id)?.setName ?? `Set ${id}`,
      })),
    [filters.setIds, sets],
  );
  const showResults = !isPending && !results.error;
  const resultLabel = showResults ? cardCountLabel(results.total) : null;
  const summary = (
    <p
      className="text-muted-foreground truncate text-sm"
      aria-live="polite"
      data-testid="result-summary"
    >
      {viewSummary(view, sets)}
      {resultLabel ? ` · ${resultLabel}` : null}
    </p>
  );

  return (
    <div className="@container/browser min-w-0 space-y-4">
      <div ref={markerRef} aria-hidden className="h-0" />
      <div
        data-testid="search-toolbar"
        data-stuck={stuck || undefined}
        className={cn(
          "bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-16 z-30 -mt-4 space-y-3 pt-3 pb-3 backdrop-blur-md",
          "transition-shadow duration-150 ease-out",
          stuck &&
            "shadow-[0_10px_16px_-14px_rgb(0_0_0/0.35)] dark:shadow-[0_10px_16px_-14px_rgb(0_0_0/0.9)]",
        )}
      >
        <SearchBox
          value={query}
          onChange={handleSearchChange}
          mode={view.mode}
          onModeChange={(next) => update({ ...view, mode: next })}
          showModes={showSearchModes}
        />
        <FilterBar
          mode={view.mode}
          sets={sets}
          setIds={filters.setIds}
          types={filters.types}
          rarities={filters.rarities}
          showDuplicates={filters.showDuplicates}
          tags={effects.tags}
          tagMode={effects.tagMode}
          onSetsChange={(setIds) => setFilters({ setIds })}
          onTypesChange={(types) => setFilters({ types })}
          onRaritiesChange={(rarities) => setFilters({ rarities })}
          onDuplicatesChange={(showDuplicates) =>
            setFilters({ showDuplicates })
          }
          onTagsChange={(tags) => setEffects({ tags })}
          onTagModeChange={(tagMode) => setEffects({ tagMode })}
          onClearAll={handleClearAll}
          resultLabel={resultLabel}
          summary={summary}
        />
        <ActiveFilters
          picked={view.mode === "effects" ? effects.tags : []}
          types={filters.types}
          rarities={filters.rarities}
          sets={pickedSets}
          parsed={view.mode === "effects" ? results.parsedTags : []}
          notes={view.mode === "effects" ? results.notes : []}
          onRemovePicked={(tag) =>
            setEffects({ tags: effects.tags.filter((t) => t !== tag) })
          }
          onRemoveType={(type) =>
            setFilters({ types: filters.types.filter((t) => t !== type) })
          }
          onRemoveRarity={(rarity) =>
            setFilters({
              rarities: filters.rarities.filter((r) => r !== rarity),
            })
          }
          onRemoveSet={(id) =>
            setFilters({ setIds: filters.setIds.filter((s) => s !== id) })
          }
          onRemoveParsed={handleRemoveParsedTag}
          onClearAll={handleClearAll}
        />
      </div>

      {mode === "select" ? (
        <SelectionModeToggle
          mode={selection.selectionMode}
          onModeChange={selection.setSelectionMode}
          selectedCards={selection.selectedCards}
        />
      ) : null}

      {results.error ? (
        <p className="text-destructive text-sm">{results.error}</p>
      ) : null}

      {showResults && results.cards.length === 0 ? (
        <NoMatches
          tagCount={view.mode === "effects" ? effects.tags.length : 0}
          filterCount={
            filters.setIds.length +
            filters.types.length +
            filters.rarities.length
          }
          tagMode={effects.tagMode}
          hasQuery={query.length > 0}
          onMatchAny={() => setEffects({ tagMode: "any" })}
          onClearFilters={handleClearAll}
        />
      ) : (
        <div
          data-testid="catalog-results-wrapper"
          data-pending={isPending || undefined}
          aria-busy={isPending}
          className={cn(
            "transition-[filter,opacity] duration-200 ease-out motion-reduce:transition-none",
            // Delay only the fade-in, so a fast query doesn't flash grey.
            isPending && "pointer-events-none opacity-60 grayscale delay-150",
          )}
        >
          <CardGrid
            key={results.epoch}
            initialCards={results.cards}
            initialCursor={results.cursor}
            loadPage={loadPage}
            total={usesEffectsApi(resultView) ? results.total : undefined}
            selectable={interactive && (mode === "select" || mode === "build")}
            selectedCards={selection.selectedCards}
            cardCounts={cardCounts}
            // CardItem is clickable whenever it receives a handler, so withholding
            // it is what makes the catalog inert while `interactive` is false.
            onCardClick={interactive ? handleCardClick : undefined}
          />
        </div>
      )}

      {mode === "view" ? (
        <CardDetailSheet
          open={detail.open}
          onOpenChange={detail.onOpenChange}
          detail={detail.detail}
          loading={detail.loading}
          error={detail.error}
          signedOut={detail.signedOut}
          shareUrl={detail.shareUrl}
        />
      ) : null}
    </div>
  );
}
