import prisma from "@/prisma/db";
import { formatCardRef, parseCardRef } from "@/lib/deck-url";
import type {
  CardType,
  DamageKind,
  EffectKind,
  Stage,
  TrainerType,
} from "@/prisma/generated/client/client";

export type CardDetailAttack = {
  position: number;
  name: string;
  damageRaw: string;
  damageBase: number | null;
  damageKind: DamageKind;
  energyCost: number;
  energyTypes: string[];
  effectText: string;
};

export type CardDetailEffect = {
  kind: EffectKind;
  name: string | null;
  effectText: string;
};

export type CardDetail = {
  id: number;
  name: string;
  imageUrl: string;
  setCode: string;
  setName: string;
  number: number;
  ref: string;
  cardType: CardType;
  rarity: string;
  isTradeable: boolean;
  hp: number | null;
  energyType: string | null;
  stage: Stage | null;
  isEx: boolean;
  trainerType: TrainerType | null;
  weakness: string | null;
  retreatCost: number | null;
  attacks: CardDetailAttack[];
  effects: CardDetailEffect[];
};

const detailInclude = {
  set: true,
  attacks: { orderBy: { position: "asc" as const } },
  effects: { orderBy: { kind: "asc" as const } },
};

type CardDetailRow = {
  id: number;
  name: string;
  imageUrl: string;
  number: number;
  cardType: CardType;
  rarity: string;
  isTradeable: boolean;
  hp: number | null;
  energyType: string | null;
  stage: Stage | null;
  isEx: boolean;
  trainerType: TrainerType | null;
  weakness: string | null;
  retreatCost: number | null;
  set: { code: string; setName: string };
  attacks: CardDetailAttack[];
  effects: CardDetailEffect[];
};

export function mapCardRowToDetail(row: CardDetailRow): CardDetail {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    setCode: row.set.code,
    setName: row.set.setName,
    number: row.number,
    ref: formatCardRef(row.set.code, row.number),
    cardType: row.cardType,
    rarity: row.rarity,
    isTradeable: row.isTradeable,
    hp: row.hp,
    energyType: row.energyType,
    stage: row.stage,
    isEx: row.isEx,
    trainerType: row.trainerType,
    weakness: row.weakness,
    retreatCost: row.retreatCost,
    attacks: row.attacks.map((atk) => ({
      position: atk.position,
      name: atk.name,
      damageRaw: atk.damageRaw,
      damageBase: atk.damageBase,
      damageKind: atk.damageKind,
      energyCost: atk.energyCost,
      energyTypes: atk.energyTypes,
      effectText: atk.effectText,
    })),
    effects: row.effects.map((eff) => ({
      kind: eff.kind,
      name: eff.name,
      effectText: eff.effectText,
    })),
  };
}

export async function getCardDetailById(
  id: number,
): Promise<CardDetail | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = await prisma.card.findUnique({
    where: { id },
    include: detailInclude,
  });
  return row ? mapCardRowToDetail(row) : null;
}

export async function getCardDetailByRef(
  ref: string,
): Promise<CardDetail | null> {
  let parsed: { setCode: string; number: number };
  try {
    parsed = parseCardRef(ref);
  } catch {
    return null;
  }

  const row = await prisma.card.findFirst({
    where: {
      number: parsed.number,
      set: { code: parsed.setCode },
    },
    include: detailInclude,
  });
  return row ? mapCardRowToDetail(row) : null;
}
