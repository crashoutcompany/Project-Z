/** Display metadata for rarity *codes* stored on `Card.rarity` after import. */

/** The official Pocket rarity marks, in `public/images/rarity/`. */
export type RarityIcon = "diamond" | "star" | "shiny" | "crown";

export const RARITY_ICON_SRC: Record<RarityIcon, string> = {
  diamond: "/images/rarity/diamond.png",
  star: "/images/rarity/star.png",
  shiny: "/images/rarity/shiny.png",
  crown: "/images/rarity/crown.png",
};

export type RarityInfo = {
  code: string;
  name: string;
  /** Plain-text mark, for places that cannot show the icons. */
  symbol: string;
  /** The printed mark: `count` copies of `icon`. `null` = no icon (promos). */
  mark: { icon: RarityIcon; count: number } | null;
  /** Shinedust to initiate an in-game trade. `null` = not a Shinedust trade. */
  shinedust: number | null;
};

export const RARITY_INFO: Record<string, RarityInfo> = {
  C: {
    code: "C",
    name: "Common",
    symbol: "◊",
    mark: { icon: "diamond", count: 1 },
    shinedust: 0,
  },
  U: {
    code: "U",
    name: "Uncommon",
    symbol: "◊◊",
    mark: { icon: "diamond", count: 2 },
    shinedust: 0,
  },
  R: {
    code: "R",
    name: "Rare",
    symbol: "◊◊◊",
    mark: { icon: "diamond", count: 3 },
    shinedust: 1_200,
  },
  RR: {
    code: "RR",
    name: "Double Rare",
    symbol: "◊◊◊◊",
    mark: { icon: "diamond", count: 4 },
    shinedust: 5_000,
  },
  AR: {
    code: "AR",
    name: "Art Rare",
    symbol: "☆",
    mark: { icon: "star", count: 1 },
    shinedust: 4_000,
  },
  SR: {
    code: "SR",
    name: "Super Rare",
    symbol: "☆☆",
    mark: { icon: "star", count: 2 },
    shinedust: 25_000,
  },
  S: {
    code: "S",
    name: "Shiny",
    symbol: "✵",
    mark: { icon: "shiny", count: 1 },
    shinedust: 10_000,
  },
  SSR: {
    code: "SSR",
    name: "Super Shiny Rare",
    symbol: "✵✵",
    mark: { icon: "shiny", count: 2 },
    shinedust: 30_000,
  },
  IM: {
    code: "IM",
    name: "Immersive Rare",
    symbol: "☆☆☆",
    mark: { icon: "star", count: 3 },
    shinedust: null,
  },
  UR: {
    code: "UR",
    name: "Crown Rare",
    symbol: "Crown",
    mark: { icon: "crown", count: 1 },
    shinedust: null,
  },
  PROMO: {
    code: "PROMO",
    name: "Promo",
    symbol: "P",
    mark: null,
    shinedust: null,
  },
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
      mark: null,
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
