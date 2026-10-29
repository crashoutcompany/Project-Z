import { parseCardId } from "./set-map";

/** Cards kept per set when seeding Cloud Agent / local snapshot DBs. */
export const SEED_CARDS_PER_SET = 10;

/**
 * Keep a stable subset of cards from each set (lowest card numbers first).
 * Sets with fewer than `perSetLimit` cards are kept in full. Dual-type cards
 * (`secondary_energy`) are always kept so seeded DBs exercise that path.
 */
export function sampleCardsPerSet<
  T extends { card_id: string; secondary_energy?: string | null },
>(
  cards: T[],
  perSetLimit: number
): T[] {
  if (perSetLimit <= 0) return cards;

  const buckets = new Map<string, T[]>();
  for (const card of cards) {
    const { setCode } = parseCardId(card.card_id);
    const list = buckets.get(setCode);
    if (list) list.push(card);
    else buckets.set(setCode, [card]);
  }

  const sampled: T[] = [];
  for (const list of buckets.values()) {
    list.sort(
      (a, b) => parseCardId(a.card_id).number - parseCardId(b.card_id).number
    );
    const head = list.slice(0, perSetLimit);
    const dualType = list.slice(perSetLimit).filter((c) => c.secondary_energy);
    sampled.push(...head, ...dualType);
  }
  return sampled;
}
