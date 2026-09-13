/**
 * Deck URL codec for /builder?v=1&deck=A1-1,A1-94x2,...
 *
 * Card refs are `{setCode}-{number}`. Set codes may contain hyphens (P-A).
 * Count suffix `xN` is optional (default 1) and must be 1 or 2 in both
 * directions. The 20-card total and max-2-copies-per-*name* rules are
 * enforced by validateDeck, not the codec.
 */

export type DeckEntry = {
  setCode: string;
  number: number;
  count: number;
  /** Stable ref string without count, e.g. "A1-94" or "P-A-12" */
  ref: string;
};

export type DeckDecodeResult = {
  version: number;
  entries: DeckEntry[];
};

const REF_RE = /^(.+)-(\d+)$/;

const MIN_COUNT = 1;
const MAX_COUNT = 2;

function assertValidCount(count: number, context: string): void {
  if (!Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
    throw new Error(`Invalid count in deck entry: ${context}`);
  }
}

export function parseCardRef(ref: string): { setCode: string; number: number } {
  const match = REF_RE.exec(ref.trim());
  if (!match) {
    throw new Error(`Invalid card ref: ${ref}`);
  }
  return { setCode: match[1], number: Number(match[2]) };
}

export function formatCardRef(setCode: string, number: number): string {
  return `${setCode}-${number}`;
}

export function encodeDeck(
  entries: Array<{ setCode: string; number: number; count?: number }>,
): string {
  return entries
    .map((e) => {
      const ref = formatCardRef(e.setCode, e.number);
      const count = e.count ?? 1;
      // Keep the codec symmetric: never emit a param decodeDeckParam rejects.
      assertValidCount(count, `${ref}x${count}`);
      return count > 1 ? `${ref}x${count}` : ref;
    })
    .join(",");
}

export function decodeDeckParam(deckParam: string): DeckEntry[] {
  if (!deckParam.trim()) return [];
  const parts = deckParam.split(",").map((p) => p.trim()).filter(Boolean);
  const entries: DeckEntry[] = [];

  for (const part of parts) {
    const countMatch = /^(.*)x(\d+)$/.exec(part);
    let ref: string;
    let count: number;
    if (countMatch) {
      ref = countMatch[1];
      count = Number(countMatch[2]);
    } else {
      ref = part;
      count = 1;
    }
    assertValidCount(count, part);
    const { setCode, number } = parseCardRef(ref);
    entries.push({ setCode, number, count, ref: formatCardRef(setCode, number) });
  }

  return entries;
}

export function decodeBuilderSearchParams(params: {
  v?: string | null;
  deck?: string | null;
}): DeckDecodeResult {
  const version = params.v ? Number(params.v) : 1;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Unsupported deck URL version: ${params.v}`);
  }
  return {
    version,
    entries: decodeDeckParam(params.deck ?? ""),
  };
}

export function buildBuilderUrl(entries: DeckEntry[], version = 1): string {
  const deck = encodeDeck(entries);
  const qs = new URLSearchParams();
  qs.set("v", String(version));
  if (deck) qs.set("deck", deck);
  return `/builder?${qs.toString()}`;
}

export type DeckValidation = {
  valid: boolean;
  totalCards: number;
  errors: string[];
};

/**
 * Pocket rules: exactly 20 cards, max 2 copies sharing a card name.
 * Name map must be provided by the caller (id/ref → name).
 */
export function validateDeck(
  entries: DeckEntry[],
  nameByRef: Record<string, string>,
): DeckValidation {
  const errors: string[] = [];
  const totalCards = entries.reduce((sum, e) => sum + e.count, 0);

  if (totalCards !== 20) {
    errors.push(`Deck must contain exactly 20 cards (currently ${totalCards}).`);
  }

  const nameCounts = new Map<string, number>();
  for (const entry of entries) {
    const name = nameByRef[entry.ref];
    if (!name) {
      errors.push(`Unknown card ref: ${entry.ref}`);
      continue;
    }
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + entry.count);
  }

  for (const [name, count] of nameCounts) {
    if (count > 2) {
      errors.push(`Too many copies of "${name}" (${count}/2).`);
    }
  }

  return { valid: errors.length === 0, totalCards, errors };
}
