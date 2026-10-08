"use client";

import { useCallback, useRef, useState } from "react";
import type { CardDetail } from "@/lib/card-detail";
import { formatCardRef } from "@/lib/deck-url";
import { buildDexCardPath, replaceDexSearchParams } from "@/lib/dex-url";
import { fetchCardDetail } from "@/server/actions";
import { previewFromCard } from "./card-mappers";
import type { CardWithSet } from "./types";

type UseCardDetailOptions = {
  initialDetail: CardDetail | null;
  /** When set (Dex), opening and closing the sheet mirrors `?set=&card=`. */
  syncDexUrl: boolean;
};

/**
 * State for the card detail sheet. Opening shows an instant preview from the
 * catalog row, then swaps in the full detail; a newer click supersedes an
 * older in-flight load.
 */
export function useCardDetail({ initialDetail, syncDexUrl }: UseCardDetailOptions) {
  const detailSeq = useRef(0);
  const [open, setOpen] = useState(Boolean(initialDetail));
  const [detail, setDetail] = useState<CardDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCard = useCallback(
    (card: CardWithSet) => {
      const seq = ++detailSeq.current;
      setOpen(true);
      setDetail(previewFromCard(card));
      setError(null);
      setLoading(true);
      if (syncDexUrl) {
        replaceDexSearchParams({
          set: card.set.code,
          card: formatCardRef(card.set.code, card.number),
        });
      }
      void fetchCardDetail({ id: card.id })
        .then((next) => {
          if (seq !== detailSeq.current) return;
          setDetail(next ?? previewFromCard(card));
          if (!next) setError("Card not found");
        })
        .catch(() => {
          if (seq !== detailSeq.current) return;
          setError("Couldn't load this card");
        })
        .finally(() => {
          if (seq !== detailSeq.current) return;
          setLoading(false);
        });
    },
    [syncDexUrl],
  );

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && syncDexUrl) replaceDexSearchParams({ card: null });
    },
    [syncDexUrl],
  );

  const shareUrl =
    syncDexUrl && detail ? buildDexCardPath(detail.setCode, detail.ref) : null;

  return { open, detail, loading, error, shareUrl, openCard, onOpenChange };
}
