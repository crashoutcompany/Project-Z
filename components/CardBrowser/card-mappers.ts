import type { CardDetail } from "@/lib/card-detail";
import { formatCardRef } from "@/lib/deck-url";
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
    secondaryEnergyType: card.secondaryEnergyType,
    hp: card.hp,
    rarity: card.rarity,
    isEx: card.isEx,
    isTradeable: card.isTradeable,
    matchedTags: [],
  };
}

/** What the sheet can show instantly while attacks and text are still loading. */
export function previewFromCard(card: CardWithSet): CardDetail {
  return {
    id: card.id,
    name: card.name,
    imageUrl: card.imageUrl,
    setCode: card.set.code,
    setName: card.set.setName,
    number: card.number,
    ref: formatCardRef(card.set.code, card.number),
    cardType: card.cardType,
    rarity: card.rarity,
    isTradeable: card.isTradeable,
    hp: card.hp,
    energyType: card.energyType,
    stage: card.stage,
    isEx: card.isEx,
    trainerType: card.trainerType,
    weakness: card.weakness,
    retreatCost: card.retreatCost,
    attacks: [],
    effects: [],
  };
}
