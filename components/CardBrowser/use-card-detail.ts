"use client";

import { useCallback, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import type { CardDetail } from "@/lib/card-detail";
import { formatCardRef } from "@/lib/deck-url";
import { buildDexCardPath, replaceDexSearchParams } from "@/lib/dex-url";
import { fetchCardDetail } from "@/server/actions";
import { previewFromCard } from "./card-mappers";
import type { CardWithSet } from "./types";

/**
 * The auth proxy answers a signed-out server action POST with a redirect to
 * the sign-in page, so the action rejects instead of returning `signed_out`.
 * Ask the auth API (not behind the proxy) whether that is what happened.
 */
async function hasSession(): Promise<boolean> {
  try {
    const { data, error } = await authClient.getSession();
    return Boolean(data) || Boolean(error);
  } catch {
    return true;
  }
}

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
  const [signedOut, setSignedOut] = useState(false);

  const openCard = useCallback(
    (card: CardWithSet) => {
      const seq = ++detailSeq.current;
      setOpen(true);
      setDetail(previewFromCard(card));
      setError(null);
      setSignedOut(false);
      setLoading(true);
      if (syncDexUrl) {
        replaceDexSearchParams({
          set: card.set.code,
          card: formatCardRef(card.set.code, card.number),
        });
      }
      void fetchCardDetail({ id: card.id })
        .then((result) => {
          if (seq !== detailSeq.current) return;
          // Signed-out and missing cards keep the preview's art and facts.
          if (result.status === "ok") setDetail(result.detail);
          else if (result.status === "signed_out") setSignedOut(true);
          else setError("Card not found");
        })
        .catch(async () => {
          const signedIn = await hasSession();
          if (seq !== detailSeq.current) return;
          if (signedIn) setError("Couldn't load this card");
          else setSignedOut(true);
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

  return {
    open,
    detail,
    loading,
    error,
    signedOut,
    shareUrl,
    openCard,
    onOpenChange,
  };
}
