"use client";

import { useMemo } from "react";
import { useCollection } from "@/lib/collection/use-collection";
import { useWantList } from "@/lib/collection/use-want-list";
import { wantListEntries } from "@/lib/collection/want-list";
import { RaritySymbol } from "@/components/CardBrowser/RarityFilter";
import type { SetWithCards } from "@/server/actions";
import { Bookmark, Check, X } from "lucide-react";

/**
 * The global want list, reviewed next to the collection. Cards come off the
 * list by hand, or move into the collection with "Got it".
 */
export function WantList({ sets }: { sets: SetWithCards[] }) {
  const { collection } = useCollection();
  const { wantList, setQuantity, acquire } = useWantList();

  const cards = useMemo(
    () =>
      sets.flatMap((set) =>
        set.cards.map((card) => ({ ...card, setCode: set.code })),
      ),
    [sets],
  );
  const entries = useMemo(
    () => wantListEntries(wantList, collection, cards),
    [wantList, collection, cards],
  );
  const totalWanted = entries.reduce((sum, e) => sum + e.wanted, 0);

  return (
    <section
      id="want-list"
      data-testid="want-list"
      className="bg-card ring-foreground/10 scroll-mt-20 rounded-2xl p-6 shadow-xs ring-1"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Want list</h2>
        {entries.length > 0 ? (
          <span
            data-testid="want-list-total"
            className="text-muted-foreground text-sm tabular-nums"
          >
            {totalWanted} {totalWanted === 1 ? "copy" : "copies"} wanted
          </span>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Nothing here yet. Bookmark cards from a card&apos;s details or from a
          deck&apos;s missing cards in the builder.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {entries.map(({ card, wanted, owned }) => (
            <li
              key={card.id}
              data-testid="want-list-card"
              className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <Bookmark className="size-3.5 shrink-0 fill-amber-500 text-amber-500" />
              <RaritySymbol
                rarity={card.rarity}
                className="shrink-0 [&_svg]:size-3"
              />
              <span className="min-w-0 flex-1 truncate" title={card.name}>
                {card.name}{" "}
                <span className="text-muted-foreground">
                  {card.setCode} #{card.number}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                ×{wanted}
                {owned > 0 ? ` · ${owned} owned` : ""}
              </span>
              <button
                type="button"
                onClick={() => acquire(card.id)}
                aria-label={`Got ${card.name}: add to collection`}
                title="Got it: add to collection"
                className="bg-background ring-foreground/10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors hover:bg-emerald-500 hover:text-white"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setQuantity(card.id, 0)}
                aria-label={`Remove ${card.name} from want list`}
                title="Remove from want list"
                className="bg-background ring-foreground/10 hover:bg-destructive flex size-7 shrink-0 items-center justify-center rounded-full ring-1 transition-colors hover:text-white"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
