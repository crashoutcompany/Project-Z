import { rarityRank } from "@/lib/rarity";

/**
 * The fields that decide whether two prints are the same card. Select these
 * (`PRINT_KEY_SELECT`) alongside whatever else a query needs.
 */
export type PrintKeyCard = {
  id: number;
  name: string;
  rarity: string;
  attacks: Array<{
    position: number;
    name: string;
    damageRaw: string;
    energyTypes: string[];
    effectText: string;
  }>;
  effects: Array<{ kind: string; effectText: string }>;
};

export const PRINT_KEY_ATTACK_SELECT = {
  position: true,
  name: true,
  damageRaw: true,
  energyTypes: true,
  effectText: true,
} as const;

export const PRINT_KEY_EFFECT_SELECT = {
  kind: true,
  effectText: true,
} as const;

/** Case and whitespace differ between set imports of the same text. */
function norm(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Cards with the same name and the same attacks are one card printed several
 * times (alt arts, reprints, promos). Abilities and trainer text are part of
 * the key too, so a same-named card with a different ability stays separate.
 */
export function printKey(card: PrintKeyCard): string {
  const attacks = [...card.attacks]
    .sort((a, b) => a.position - b.position)
    .map((a) =>
      [
        norm(a.name),
        norm(a.damageRaw),
        a.energyTypes.join(","),
        norm(a.effectText),
      ].join("~"),
    );
  const effects = card.effects
    .map((e) => `${e.kind}~${norm(e.effectText)}`)
    .sort();
  return JSON.stringify([norm(card.name), attacks, effects]);
}

/** Which of two prints of one card to show: the most common, then the oldest. */
function isBetterPrint(a: PrintKeyCard, b: PrintKeyCard): boolean {
  const byRarity = rarityRank(a.rarity) - rarityRank(b.rarity);
  return byRarity < 0 || (byRarity === 0 && a.id < b.id);
}

/**
 * Collapses prints of the same card to the lowest-rarity copy. Keeps the input
 * order of the copies it keeps, so callers can dedupe before ranking or
 * paging. Pass only cards that already match the filters: a rarity filter
 * then picks the lowest copy *within* that rarity.
 */
export function dedupePrints<T extends PrintKeyCard>(cards: T[]): T[] {
  const best = new Map<string, T>();
  for (const card of cards) {
    const key = printKey(card);
    const current = best.get(key);
    if (!current || isBetterPrint(card, current)) best.set(key, card);
  }
  const keep = new Set([...best.values()].map((c) => c.id));
  return cards.filter((c) => keep.has(c.id));
}
