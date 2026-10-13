import { formatCardRef, parseCardRef } from "./deck-url";

export type DexCardRef = {
  setCode: string;
  number: number;
  ref: string;
};

export function parseDexCardParam(
  card: string | undefined | null,
): DexCardRef | null {
  if (!card?.trim()) return null;
  try {
    const { setCode, number } = parseCardRef(card.trim());
    return { setCode, number, ref: formatCardRef(setCode, number) };
  } catch {
    return null;
  }
}

export function buildDexCardPath(setCode: string, cardRef: string): string {
  const qs = new URLSearchParams();
  qs.set("set", setCode);
  qs.set("card", cardRef);
  return `/dex?${qs.toString()}`;
}

export function replaceDexSearchParams(next: {
  set?: string;
  card?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (next.set) url.searchParams.set("set", next.set);
  if (next.card) url.searchParams.set("card", next.card);
  else if (next.card === null) url.searchParams.delete("card");
  window.history.replaceState(window.history.state, "", url);
}
