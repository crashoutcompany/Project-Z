import type { CardDetail } from "@/lib/card-detail";
import { formatCardRef } from "@/lib/deck-url";
import type { FilterJSON, SearchCardResult } from "@/lib/search";
import type { Set } from "@/prisma/generated/client/client";
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

/** Human-readable chips describing what an effects search understood. */
export function filterToChips(filter: FilterJSON): string[] {
  const chips: string[] = [];
  if (filter.cardType) chips.push(filter.cardType);
  if (filter.trainerType) chips.push(filter.trainerType);
  if (filter.isEx) chips.push("EX");
  if (filter.stage?.length) chips.push(...filter.stage);
  if (filter.energyType?.length) chips.push(...filter.energyType);
  if (filter.hpMin != null) chips.push(`HP≥${filter.hpMin}`);
  if (filter.attack?.energyCost != null) {
    chips.push(`${filter.attack.energyCost} energy`);
  }
  if (filter.attack?.damageMin != null) {
    chips.push(`${filter.attack.damageMin}+ dmg`);
  }
  if (filter.attack?.damageKind) chips.push(filter.attack.damageKind);
  if (filter.attack?.tags?.length) chips.push(...filter.attack.tags);
  if (filter.effect?.tags?.length) chips.push(...filter.effect.tags);
  if (filter.textFallback) chips.push(`text:${filter.textFallback}`);
  return chips;
}

/** Effects-search rows carry fewer fields than catalog rows; fill the rest. */
export function searchResultToCardWithSet(
  card: SearchCardResult,
  sets: Set[],
): CardWithSet {
  const set =
    sets.find((s) => s.code === card.setCode) ??
    ({
      id: -1,
      code: card.setCode,
      setName: card.setCode,
      image: "",
      releaseDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Set);

  return {
    id: card.id,
    setId: set.id,
    number: card.number,
    name: card.name,
    cardType: card.cardType as CardWithSet["cardType"],
    imageUrl: card.imageUrl,
    rarity: card.rarity,
    isTradeable: card.isTradeable,
    pack: null,
    energyType: card.energyType,
    hp: card.hp,
    stage: null,
    isEx: card.isEx,
    isBaby: false,
    weakness: null,
    retreatCost: null,
    trainerType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    set,
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
