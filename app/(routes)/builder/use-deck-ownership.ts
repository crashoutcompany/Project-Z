"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useCollection } from "@/lib/collection/use-collection";
import {
  computeDeckOwnership,
  type DeckOwnership,
  type PrintGroups,
} from "@/lib/collection/deck-ownership";

export type DeckOwnershipState =
  /** Before hydration, or while alt-art prints are loading. */
  | { status: "loading" }
  /** Nothing stored, or stored data was unreadable. */
  | { status: "empty" }
  | {
      status: "ready";
      ownership: DeckOwnership;
      /** Alt arts could not be loaded; only exact prints were matched. */
      exactOnly: boolean;
    };

const noopSubscribe = () => () => {};

/**
 * Owned vs missing copies for a deck, from the browser-only collection. The
 * server and the hydration pass render "loading" so markup always matches;
 * stored data is read after hydration.
 */
export function useDeckOwnership(
  deck: Array<{ id: number; count: number }>,
): DeckOwnershipState {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const { collection } = useCollection();
  const hasCollection = Object.keys(collection).length > 0;

  const [prints, setPrints] = useState<PrintGroups>({});
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const unknownIds = useMemo(
    () => deck.map((card) => card.id).filter((id) => !(id in prints)),
    [deck, prints],
  );
  const unknownKey = unknownIds.toSorted((a, b) => a - b).join(",");
  const fetchNeeded =
    mounted && hasCollection && unknownKey !== "" && unknownKey !== failedKey;

  useEffect(() => {
    if (!fetchNeeded) return;
    let cancelled = false;
    const ids = unknownKey.split(",").map(Number);
    fetch("/api/cards/prints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`prints lookup ${res.status}`);
        return (await res.json()) as { prints: PrintGroups };
      })
      .then((data) => {
        if (cancelled) return;
        // An ID the server did not group is its own only print; recording it
        // stops the lookup from repeating.
        const next: PrintGroups = {};
        for (const id of ids) next[id] = data.prints[id] ?? [id];
        setPrints((prev) => ({ ...prev, ...next }));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setFailedKey(unknownKey);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchNeeded, unknownKey]);

  const ownership = useMemo(
    () =>
      computeDeckOwnership(
        collection,
        deck.map((card) => ({ cardId: card.id, count: card.count })),
        prints,
      ),
    [collection, deck, prints],
  );

  if (!mounted || fetchNeeded) return { status: "loading" };
  if (!hasCollection) return { status: "empty" };
  return {
    status: "ready",
    ownership,
    exactOnly: unknownKey !== "" && unknownKey === failedKey,
  };
}
