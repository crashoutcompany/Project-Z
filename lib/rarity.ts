/** Display metadata for rarity *codes* stored on `Card.rarity` after import. */

export type RarityInfo = {
  code: string;
  name: string;
  symbol: string;
  /** Shinedust to initiate an in-game trade. `null` = not a Shinedust trade. */
  shinedust: number | null;
};

export const RARITY_INFO: Record<string, RarityInfo> = {
  C: { code: "C", name: "Common", symbol: "◊", shinedust: 0 },
  U: { code: "U", name: "Uncommon", symbol: "◊◊", shinedust: 0 },
  R: { code: "R", name: "Rare", symbol: "◊◊◊", shinedust: 1_200 },
  RR: { code: "RR", name: "Double Rare", symbol: "◊◊◊◊", shinedust: 5_000 },
  AR: { code: "AR", name: "Art Rare", symbol: "☆", shinedust: 4_000 },
  SR: { code: "SR", name: "Super Rare", symbol: "☆☆", shinedust: 25_000 },
  S: { code: "S", name: "Shiny", symbol: "✵", shinedust: 10_000 },
  SSR: {
    code: "SSR",
    name: "Super Shiny Rare",
    symbol: "✵✵",
    shinedust: 30_000,
  },
  IM: { code: "IM", name: "Immersive Rare", symbol: "☆☆☆", shinedust: null },
  UR: { code: "UR", name: "Crown Rare", symbol: "Crown", shinedust: null },
  PROMO: { code: "PROMO", name: "Promo", symbol: "P", shinedust: null },
};

/** Every stored rarity code, most common first. */
export const RARITY_CODES = Object.keys(RARITY_INFO);

/** Sort position of a rarity code: lower is more common. Unknown codes sort last. */
export function rarityRank(rarity: string): number {
  const index = RARITY_CODES.indexOf(rarity);
  return index === -1 ? RARITY_CODES.length : index;
}

export function isRarityCode(value: string): boolean {
  return Object.hasOwn(RARITY_INFO, value);
}

export function getRarityInfo(rarity: string): RarityInfo {
  return (
    RARITY_INFO[rarity] ?? {
      code: rarity,
      name: rarity,
      symbol: rarity,
      shinedust: null,
    }
  );
}

/** Pocket Shinedust cost, or `null` when the print cannot be traded. */
export function getShinedustCost(
  rarity: string,
  isTradeable: boolean,
): number | null {
  if (!isTradeable) return null;
  return getRarityInfo(rarity).shinedust;
}

export function formatShinedust(cost: number): string {
  return cost.toLocaleString("en-US");
}
