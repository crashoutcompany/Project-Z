"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCollection } from "@/lib/collection/use-collection";
import {
  computeCompletion,
  formatPercent,
  type CompletionStats,
} from "@/lib/collection";
import { getRarityInfo, RARITY_CODES } from "@/lib/rarity";
import { RaritySymbol } from "@/components/CardBrowser/RarityFilter";
import type { SetWithCards } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ExternalLink, Plus } from "lucide-react";

type CollectionStatsProps = {
  sets: SetWithCards[];
};

export function CollectionStats({ sets }: CollectionStatsProps) {
  const { collection, adjust } = useCollection();
  const [showMissing, setShowMissing] = useState<number | null>(null);

  const stats = useMemo(() => {
    return sets.map((set) => ({
      set,
      completion: computeCompletion(collection, set.cards),
    }));
  }, [sets, collection]);

  const totalOwned = stats.reduce((sum, s) => sum + s.completion.owned, 0);
  const totalCards = stats.reduce((sum, s) => sum + s.completion.total, 0);

  return (
    <div className="space-y-6">
      <OverallProgress owned={totalOwned} total={totalCards} />

      <div className="space-y-4">
        {stats.map(({ set, completion }) => (
          <SetCard
            key={set.id}
            set={set}
            completion={completion}
            isExpanded={showMissing === set.id}
            onToggle={() =>
              setShowMissing(showMissing === set.id ? null : set.id)
            }
            collection={collection}
            onAdd={(cardId) => adjust(cardId, 1)}
          />
        ))}
      </div>

      {totalCards === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center">
          <p className="text-muted-foreground">
            No sets found. Import card data to start tracking your collection.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function OverallProgress({ owned, total }: { owned: number; total: number }) {
  return (
    <div className="bg-card ring-foreground/10 rounded-2xl p-6 shadow-xs ring-1">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Overall Progress</h2>
        <span
          data-testid="collection-overall-percent"
          className="text-2xl font-bold tabular-nums"
        >
          {formatPercent(owned, total)}
        </span>
      </div>
      <ProgressBar value={owned} max={total} className="mt-3 h-4" />
      <p
        data-testid="collection-overall"
        className="text-muted-foreground mt-2 text-sm"
      >
        {owned.toLocaleString()} of {total.toLocaleString()} cards collected
      </p>
    </div>
  );
}

function SetCard({
  set,
  completion,
  isExpanded,
  onToggle,
  collection,
  onAdd,
}: {
  set: SetWithCards;
  completion: CompletionStats;
  isExpanded: boolean;
  onToggle: () => void;
  collection: Record<number, number>;
  onAdd: (cardId: number) => void;
}) {
  const [rarityFilter, onRarityFilter] = useState<string | null>(null);
  const missingCards = useMemo(() => {
    return set.cards.filter((card) => !collection[card.id]);
  }, [set.cards, collection]);

  const filteredMissing = useMemo(() => {
    if (!rarityFilter) return missingCards;
    return missingCards.filter((card) => card.rarity === rarityFilter);
  }, [missingCards, rarityFilter]);

  const raritiesWithMissing = useMemo(() => {
    const rarities = new Set(missingCards.map((c) => c.rarity));
    return RARITY_CODES.filter((r) => rarities.has(r));
  }, [missingCards]);

  return (
    <div
      data-testid="collection-set"
      className="bg-card ring-foreground/10 rounded-2xl shadow-xs ring-1"
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="leading-tight font-semibold break-words">
              {set.setName}
            </h3>
            <p className="text-muted-foreground text-xs">{set.code}</p>
            <div className="mt-2 flex items-center gap-3">
              <ProgressBar
                value={completion.owned}
                max={completion.total}
                className="h-3 flex-1"
              />
              <span className="text-sm font-medium tabular-nums">
                {completion.owned}/{completion.total}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dex?set=${set.code.toLowerCase()}`}
              className="text-muted-foreground hover:text-foreground"
              title="View in Dex"
              aria-label={`View ${set.setName} in the Dex`}
            >
              <ExternalLink className="size-4" />
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="gap-1"
            >
              {isExpanded ? (
                <>
                  Hide <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  Missing ({missingCards.length}){" "}
                  <ChevronDown className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <RarityBreakdown completion={completion} />
      </div>

      {isExpanded ? (
        <div className="border-t px-4 py-4">
          {raritiesWithMissing.length > 1 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={rarityFilter === null ? "secondary" : "outline"}
                size="sm"
                onClick={() => onRarityFilter(null)}
              >
                All
              </Button>
              {raritiesWithMissing.map((rarity) => (
                <Button
                  key={rarity}
                  type="button"
                  data-testid="missing-rarity-filter"
                  variant={rarityFilter === rarity ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => onRarityFilter(rarity)}
                  className="gap-1"
                >
                  <RaritySymbol rarity={rarity} className="[&_svg]:size-3" />
                  {getRarityInfo(rarity).name}
                </Button>
              ))}
            </div>
          ) : null}

          {filteredMissing.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              {rarityFilter
                ? `No missing ${getRarityInfo(rarityFilter).name} cards`
                : "All cards collected!"}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filteredMissing.map((card) => (
                <li
                  key={card.id}
                  data-testid="missing-card"
                  className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                >
                  <RaritySymbol
                    rarity={card.rarity}
                    className="shrink-0 [&_svg]:size-3"
                  />
                  <span className="min-w-0 flex-1 truncate" title={card.name}>
                    #{card.number} {card.name}
                  </span>
                  <button
                    type="button"
                    data-testid="missing-card-add"
                    onClick={() => onAdd(card.id)}
                    aria-label={`Add ${card.name} to collection`}
                    className="bg-background ring-foreground/10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors hover:bg-emerald-500 hover:text-white"
                  >
                    <Plus className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Accent-colored progress bar; emerald matches the owned state in the Dex. */
function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  return (
    <Progress
      value={value}
      max={Math.max(max, 1)}
      className={className}
      indicatorClassName="bg-emerald-500 dark:bg-emerald-400"
    />
  );
}

function RarityBreakdown({ completion }: { completion: CompletionStats }) {
  const rarities = RARITY_CODES.filter((r) => completion.byRarity[r]);

  if (rarities.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {rarities.map((rarity) => {
        const stats = completion.byRarity[rarity];
        const complete = stats.owned === stats.total;
        return (
          <div
            key={rarity}
            className={cn(
              "flex items-center gap-1",
              complete
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            <RaritySymbol rarity={rarity} className="[&_svg]:size-3" />
            <span className="tabular-nums">
              {stats.owned}/{stats.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
