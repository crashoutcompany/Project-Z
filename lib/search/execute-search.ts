import type { Prisma } from "@/prisma/generated/client/client";
import prisma from "@/prisma/db";
import type { AttackFilter, EffectFilter, FilterJSON } from "./filter-schema";

const RARITY_RANK: Record<string, number> = {
  "◊": 1,
  "◊◊": 2,
  "◊◊◊": 3,
  "◊◊◊◊": 4,
  "☆": 5,
  "☆☆": 6,
  "☆☆☆": 7,
  "♛": 8,
};

function attackWhere(filter: AttackFilter): Prisma.AttackWhereInput {
  const where: Prisma.AttackWhereInput = {};

  if (filter.tags?.length) {
    where.tags = { hasEvery: filter.tags };
  }

  if (filter.energyCost !== undefined) {
    where.energyCost = filter.energyCost;
  } else if (
    filter.energyCostMin !== undefined ||
    filter.energyCostMax !== undefined
  ) {
    where.energyCost = {
      ...(filter.energyCostMin !== undefined
        ? { gte: filter.energyCostMin }
        : {}),
      ...(filter.energyCostMax !== undefined
        ? { lte: filter.energyCostMax }
        : {}),
    };
  }

  if (filter.damageMin !== undefined) {
    where.damageBase = { gte: filter.damageMin };
  }

  if (filter.damageKind) {
    where.damageKind = filter.damageKind;
  }

  if (filter.energyTypeCounts) {
    const types = Object.keys(filter.energyTypeCounts);
    if (types.length) {
      where.AND = types.map((type) => ({
        energyTypes: { has: type },
      }));
    }
  }

  return where;
}

function effectWhere(filter: EffectFilter): Prisma.CardEffectWhereInput {
  const where: Prisma.CardEffectWhereInput = {};
  if (filter.kind) where.kind = filter.kind;
  if (filter.tags?.length) where.tags = { hasEvery: filter.tags };
  return where;
}

function buildCardWhere(filter: FilterJSON): Prisma.CardWhereInput {
  const where: Prisma.CardWhereInput = {};
  const and: Prisma.CardWhereInput[] = [];

  if (filter.cardType) where.cardType = filter.cardType;
  if (filter.trainerType) where.trainerType = filter.trainerType;
  if (filter.energyType?.length) where.energyType = { in: filter.energyType };
  if (filter.stage?.length) where.stage = { in: filter.stage };
  if (filter.isEx !== undefined) where.isEx = filter.isEx;
  if (filter.hpMin !== undefined) where.hp = { gte: filter.hpMin };
  if (filter.setCodes?.length) {
    where.set = { code: { in: filter.setCodes } };
  }

  const attackClause: Prisma.CardWhereInput | null = filter.attack
    ? { attacks: { some: attackWhere(filter.attack) } }
    : null;
  const effectClause: Prisma.CardWhereInput | null = filter.effect
    ? { effects: { some: effectWhere(filter.effect) } }
    : null;

  if (filter.surface === "attack" && attackClause) {
    and.push(attackClause);
  } else if (filter.surface === "effect" && effectClause) {
    and.push(effectClause);
  } else if (attackClause && effectClause) {
    and.push({ OR: [attackClause, effectClause] });
  } else if (attackClause) {
    and.push(attackClause);
  } else if (effectClause) {
    and.push(effectClause);
  }

  if (filter.anyOf?.length) {
    const or: Prisma.CardWhereInput[] = [];
    for (const branch of filter.anyOf) {
      const branchAnd: Prisma.CardWhereInput[] = [];
      if (branch.attack) {
        branchAnd.push({ attacks: { some: attackWhere(branch.attack) } });
      }
      if (branch.effect) {
        branchAnd.push({ effects: { some: effectWhere(branch.effect) } });
      }
      if (branchAnd.length === 1) or.push(branchAnd[0]!);
      else if (branchAnd.length > 1) or.push({ AND: branchAnd });
    }
    if (or.length) and.push({ OR: or });
  }

  if (filter.textFallback?.trim()) {
    const q = filter.textFallback.trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        {
          attacks: {
            some: { effectText: { contains: q, mode: "insensitive" } },
          },
        },
        {
          effects: {
            some: { effectText: { contains: q, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export type SearchCardResult = {
  id: number;
  name: string;
  imageUrl: string;
  setCode: string;
  number: number;
  cardType: string;
  energyType: string | null;
  hp: number | null;
  rarity: string;
  isEx: boolean;
  matchedTags: string[];
};

export type SearchResult = {
  cards: SearchCardResult[];
  usedFallback: boolean;
  total: number;
};

function collectMatchedTags(
  filter: FilterJSON,
  attacks: { tags: string[] }[],
  effects: { tags: string[] }[],
): string[] {
  const wanted = new Set<string>();
  for (const t of filter.attack?.tags ?? []) wanted.add(t);
  for (const t of filter.effect?.tags ?? []) wanted.add(t);
  for (const branch of filter.anyOf ?? []) {
    for (const t of branch.attack?.tags ?? []) wanted.add(t);
    for (const t of branch.effect?.tags ?? []) wanted.add(t);
  }
  if (wanted.size === 0) return [];

  const present = new Set<string>();
  for (const a of attacks) for (const t of a.tags) present.add(t);
  for (const e of effects) for (const t of e.tags) present.add(t);
  return [...wanted].filter((t) => present.has(t));
}

async function queryCards(
  filter: FilterJSON,
  limit: number,
): Promise<SearchCardResult[]> {
  const rows = await prisma.card.findMany({
    where: buildCardWhere(filter),
    take: Math.min(limit * 3, 240),
    include: {
      set: { select: { code: true } },
      attacks: { select: { tags: true, damageBase: true } },
      effects: { select: { tags: true } },
    },
  });

  return rows
    .map((c) => {
      const matchedTags = collectMatchedTags(filter, c.attacks, c.effects);
      const maxDamage = c.attacks.reduce(
        (max, a) => Math.max(max, a.damageBase ?? 0),
        0,
      );
      return {
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        setCode: c.set.code,
        number: c.number,
        cardType: c.cardType,
        energyType: c.energyType,
        hp: c.hp,
        rarity: c.rarity,
        isEx: c.isEx,
        matchedTags,
        _rank: RARITY_RANK[c.rarity] ?? 99,
        _matched: matchedTags.length,
        _damage: maxDamage,
      };
    })
    .sort(
      (a, b) =>
        b._matched - a._matched ||
        b._damage - a._damage ||
        a._rank - b._rank ||
        a.name.localeCompare(b.name) ||
        a.number - b.number,
    )
    .slice(0, limit)
    .map(({ _rank, _matched, _damage, ...rest }) => rest);
}

async function ftsFallback(
  text: string,
  limit: number,
): Promise<SearchCardResult[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      name: string;
      imageUrl: string;
      setCode: string;
      number: number;
      cardType: string;
      energyType: string | null;
      hp: number | null;
      rarity: string;
      isEx: boolean;
    }>
  >`
    SELECT c.card_id AS id,
           c.name,
           c."imageUrl" AS "imageUrl",
           s.code AS "setCode",
           c.number,
           c."cardType"::text AS "cardType",
           c."energyType" AS "energyType",
           c.hp,
           c.rarity,
           c."isEx" AS "isEx"
    FROM "Card" c
    JOIN "Set" s ON s.set_id = c.set_id
    WHERE EXISTS (
      SELECT 1 FROM "Attack" a
      WHERE a.card_id = c.card_id
        AND a.effect_tsv @@ plainto_tsquery('english', ${text})
    )
    OR EXISTS (
      SELECT 1 FROM "CardEffect" e
      WHERE e.card_id = c.card_id
        AND e.effect_tsv @@ plainto_tsquery('english', ${text})
    )
    OR c.name ILIKE ${"%" + text + "%"}
    ORDER BY c.name ASC, c.number ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({ ...r, matchedTags: [] }));
}

export async function executeSearch(
  filter: FilterJSON,
  opts: { limit?: number } = {},
): Promise<SearchResult> {
  const limit = opts.limit ?? 60;
  let usedFallback = false;

  let cards = await queryCards(filter, limit);

  if (cards.length === 0 && filter.textFallback?.trim()) {
    cards = await ftsFallback(filter.textFallback.trim(), limit);
    if (cards.length) usedFallback = true;
  } else if (cards.length === 0) {
    const bits = [
      ...(filter.attack?.tags ?? []),
      ...(filter.effect?.tags ?? []),
    ].map((t) => t.replaceAll("_", " "));
    if (bits.length) {
      cards = await ftsFallback(bits.join(" "), limit);
      if (cards.length) usedFallback = true;
    }
  }

  return { cards, usedFallback, total: cards.length };
}
