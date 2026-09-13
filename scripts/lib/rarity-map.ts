export interface RarityInfo {
  code: string;
  name: string;
  isTradeable: boolean;
}

export const RARITY_MAP: Record<string, RarityInfo> = {
  "◊": { code: "C", name: "Common", isTradeable: true },
  "◊◊": { code: "U", name: "Uncommon", isTradeable: true },
  "◊◊◊": { code: "R", name: "Rare", isTradeable: true },
  "◊◊◊◊": { code: "RR", name: "Double Rare", isTradeable: true },
  "☆": { code: "AR", name: "Art Rare", isTradeable: true },
  "☆☆": { code: "SR", name: "Super Rare", isTradeable: true },
  "☆☆☆": { code: "IM", name: "Immersive Rare", isTradeable: false },
  "✵": { code: "S", name: "Shiny", isTradeable: true },
  "✵✵": { code: "SSR", name: "Super Shiny Rare", isTradeable: true },
  "Crown Rare": { code: "UR", name: "Ultra Rare / Crown", isTradeable: false },
  "P": { code: "PROMO", name: "Promo", isTradeable: false },
};

export function normalizeRarity(rawRarity: string): { rarityCode: string; isTradeable: boolean } {
  const trimmed = rawRarity.trim();
  const info = RARITY_MAP[trimmed];
  if (!info) {
    throw new Error(`Unknown rarity: "${rawRarity}".`);
  }
  return {
    rarityCode: info.code,
    isTradeable: info.isTradeable,
  };
}
