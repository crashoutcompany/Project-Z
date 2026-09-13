import type { SearchCardResult } from "@/lib/search";
import type { CardWithSet } from "./types";

export function toSearchCardResult(card: CardWithSet): SearchCardResult {
  return {
    id: card.id,
    name: card.name,
    imageUrl: card.imageUrl,
    setCode: card.set.code,
    number: card.number,
    cardType: card.cardType,
    energyType: card.energyType,
    hp: card.hp,
    rarity: card.rarity,
    isEx: card.isEx,
    isTradeable: card.isTradeable,
    matchedTags: [],
  };
}
