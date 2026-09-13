import { CardType, Stage, TrainerType, DamageKind, EffectKind } from "../../prisma/generated/client/client";
import type { SourceCard, SourceAttack } from "./source-schema";

const DAMAGE_RE = /^\d+[+x\-]?$/i;

export interface NormalizedAttack {
  position: number;
  name: string;
  damageRaw: string;
  damageBase: number | null;
  damageKind: DamageKind;
  energyCost: number;
  energyTypes: string[];
  effectText: string;
}

export interface NormalizedEffect {
  kind: EffectKind;
  name: string | null;
  effectText: string;
}

export interface NormalizedCard {
  number: number;
  name: string;
  cardType: CardType;
  imageUrl: string;
  rarity: string;
  isTradeable: boolean;
  pack: string | null;
  energyType: string | null;
  hp: number | null;
  stage: Stage | null;
  isEx: boolean;
  isBaby: boolean;
  weakness: string | null;
  retreatCost: number | null;
  trainerType: TrainerType | null;
  attacks: NormalizedAttack[];
  effects: NormalizedEffect[];
}

export function cleanTrainerEffect(effect: string): string {
  return effect
    .replace(/\s*Illustrated by[\s\S]*$/i, "")
    .replace(/\.(?=[A-Z])/g, ". ") // "Pokémon.At any time" → "Pokémon. At any time"
    .replace(/\s+/g, " ")
    .trim();
}

export function parseDamage(rawDamage: string): {
  damageRaw: string;
  damageBase: number | null;
  damageKind: DamageKind;
} {
  const trimmed = rawDamage.trim();
  if (!trimmed) {
    return { damageRaw: "", damageBase: null, damageKind: DamageKind.NONE };
  }

  const baseDigits = trimmed.replace(/\D/g, "");
  const damageBase = baseDigits.length > 0 ? parseInt(baseDigits, 10) : null;

  let damageKind: DamageKind = DamageKind.FIXED;
  if (trimmed.endsWith("+")) {
    damageKind = DamageKind.PLUS;
  } else if (trimmed.toLowerCase().endsWith("x")) {
    damageKind = DamageKind.SCALING;
  } else if (trimmed.endsWith("-")) {
    damageKind = DamageKind.MINUS;
  }

  return {
    damageRaw: trimmed,
    damageBase,
    damageKind,
  };
}

export function normalizeAttack(sourceAttack: SourceAttack, position: number): NormalizedAttack {
  let attackName = sourceAttack.name.trim();
  let rawDamage = (sourceAttack.damage || "").trim();

  // Fix 1: Damage/name split bug (254 attacks in source have word pushed into damage)
  if (rawDamage && !DAMAGE_RE.test(rawDamage)) {
    attackName = `${attackName} ${rawDamage}`.trim();
    rawDamage = "";
  }

  const { damageRaw, damageBase, damageKind } = parseDamage(rawDamage);

  // Fix 2: "No Cost" sentinel (30 attacks in source)
  const cost = (sourceAttack.cost || []).filter((c) => c !== "No Cost" && c.trim() !== "");
  const energyCost = cost.length;
  const energyTypes = cost.map((c) => c.toLowerCase().trim());

  const effectText =
    sourceAttack.effect && sourceAttack.effect !== "No effect" ? sourceAttack.effect.trim() : "";

  return {
    position,
    name: attackName,
    damageRaw,
    damageBase,
    damageKind,
    energyCost,
    energyTypes,
    effectText,
  };
}

export function normalizeCard(
  card: SourceCard,
  derivedImageUrl: string,
  normalizedRarity: { rarityCode: string; isTradeable: boolean },
  cardNumber: number
): NormalizedCard {
  const isPokemon = card.card_type.toLowerCase().includes("pok");
  const cardType = isPokemon ? CardType.POKEMON : CardType.TRAINER;

  let stage: Stage | null = null;
  let trainerType: TrainerType | null = null;

  const evolutionType = (card.evolution_type || "").toLowerCase().trim();
  if (isPokemon) {
    if (evolutionType === "basic") stage = Stage.BASIC;
    else if (evolutionType === "stage1" || evolutionType === "stage 1") stage = Stage.STAGE1;
    else if (evolutionType === "stage2" || evolutionType === "stage 2") stage = Stage.STAGE2;
  } else {
    if (evolutionType === "supporter") trainerType = TrainerType.SUPPORTER;
    else if (evolutionType === "item") trainerType = TrainerType.ITEM;
    else if (evolutionType === "tool") trainerType = TrainerType.TOOL;
    else if (evolutionType === "stadium") trainerType = TrainerType.STADIUM;
  }

  // Nullable fields cleanup
  let weakness: string | null = null;
  if (card.weakness && card.weakness !== "N/A" && card.weakness.toLowerCase() !== "none") {
    weakness = card.weakness.toLowerCase().trim();
  }

  const hp = typeof card.hp === "number" ? card.hp : null;
  const retreatCost = typeof card.retreat === "number" ? card.retreat : null;
  const energyType = isPokemon && card.energy ? card.energy.toLowerCase().trim() : null;

  const isEx = card.ex === true || card.name.toLowerCase().endsWith(" ex");
  const isBaby = card.baby === true;
  const pack = card.pack ? card.pack.trim() : null;

  // Normalized attacks
  const attacks: NormalizedAttack[] = (card.attacks || []).map((atk, index) =>
    normalizeAttack(atk, index)
  );

  // Normalized effects (Pokémon ability or Trainer effect)
  const effects: NormalizedEffect[] = [];
  if (card.ability) {
    if (isPokemon) {
      if (card.ability.name || card.ability.effect) {
        effects.push({
          kind: EffectKind.ABILITY,
          name: card.ability.name.trim() || null,
          effectText: card.ability.effect.trim(),
        });
      }
    } else {
      // Trainer text
      const cleaned = cleanTrainerEffect(card.ability.effect);
      if (cleaned) {
        effects.push({
          kind: EffectKind.TRAINER,
          name: null,
          effectText: cleaned,
        });
      }
    }
  }

  return {
    number: cardNumber,
    name: card.name.trim(),
    cardType,
    imageUrl: derivedImageUrl,
    rarity: normalizedRarity.rarityCode,
    isTradeable: normalizedRarity.isTradeable,
    pack,
    energyType,
    hp,
    stage,
    isEx,
    isBaby,
    weakness,
    retreatCost,
    trainerType,
    attacks,
    effects,
  };
}
