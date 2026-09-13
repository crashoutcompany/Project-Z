import { Prisma } from "@/prisma/generated/client/client";
import prisma from "@/prisma/db";
import type { AttackFilter, EffectFilter, FilterJSON } from "./filter-schema";
import { cardMatchesClauses, hasEnergyTypeCounts } from "./match";

export type SearchOptions = {
  limit?: number;
  /** Restrict results to cards flagged tradeable (used by /trading/create). */
  tradeableOnly?: boolean;
};

// Upper bound on rows scanned when a filter needs JS post-filtering. Well
// above the number of cards that share any single energy type.
const POST_FILTER_SCAN_CAP = 2000;

// Keyed by the rarity *codes* the importer stores (scripts/lib/rarity-map.ts),
// not the raw ◊/☆ symbols from the source payload. Lower = more common.
const RARITY_RANK: Record<string, number> = {
  C: 1, // ◊
  U: 2, // ◊◊
  R: 3, // ◊◊◊
  RR: 4, // ◊◊◊◊
  AR: 5, // ☆
  SR: 6, // ☆☆
  S: 7, // ✵
  SSR: 8, // ✵✵
  IM: 9, // ☆☆☆
  UR: 10, // Crown Rare
  PROMO: 11,
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
      // Prisma cannot count duplicate array members, so this is only a
      // necessary-condition prefilter. Exact counts ("double fire" => two
      // fire symbols) are enforced in JS by cardMatchesClauses() (./match).
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

function buildCardWhere(
  filter: FilterJSON,
  opts: SearchOptions,
): Prisma.CardWhereInput {
  const where: Prisma.CardWhereInput = {};
  const and: Prisma.CardWhereInput[] = [];

  if (opts.tradeableOnly) where.isTradeable = true;
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
  isTradeable: boolean;
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
  opts: SearchOptions,
  limit: number,
): Promise<SearchCardResult[]> {
  // energyTypeCounts can only be enforced in JS, and the DB prefilter for it
  // (type membership) is much looser than the real predicate. Scan the whole
  // prefiltered set in that case so exact matches beyond the first page are
  // not lost; the set is bounded by cards sharing one energy type.
  const needsPostFilter = hasEnergyTypeCounts(filter);
  const rows = await prisma.card.findMany({
    where: buildCardWhere(filter, opts),
    take: needsPostFilter ? POST_FILTER_SCAN_CAP : Math.min(limit * 3, 240),
    // Deterministic sample: without an orderBy Postgres may return a different
    // subset of the candidate set on each call, making rankings flap. `id` is
    // the unique tie-breaker (name+number can repeat across sets).
    orderBy: [{ name: "asc" }, { number: "asc" }, { id: "asc" }],
    include: {
      set: { select: { code: true } },
      attacks: {
        select: {
          tags: true,
          damageBase: true,
          damageKind: true,
          energyCost: true,
          energyTypes: true,
        },
      },
      effects: { select: { tags: true, kind: true } },
    },
  });

  const candidates = needsPostFilter
    ? rows.filter((c) => cardMatchesClauses(filter, c))
    : rows;

  return candidates
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
        isTradeable: c.isTradeable,
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
  opts: SearchOptions,
  limit: number,
): Promise<SearchCardResult[]> {
  const tradeableClause = opts.tradeableOnly
    ? Prisma.sql`AND c.is_tradeable = true`
    : Prisma.empty;

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
      isTradeable: boolean;
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
           c."isEx" AS "isEx",
           c.is_tradeable AS "isTradeable"
    FROM "Card" c
    JOIN "Set" s ON s.set_id = c.set_id
    WHERE (
      EXISTS (
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
    )
    ${tradeableClause}
    ORDER BY c.name ASC, c.number ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({ ...r, matchedTags: [] }));
}

export async function executeSearch(
  filter: FilterJSON,
  opts: SearchOptions = {},
): Promise<SearchResult> {
  const limit = opts.limit ?? 60;
  let usedFallback = false;

  let cards = await queryCards(filter, opts, limit);

  if (cards.length === 0 && filter.textFallback?.trim()) {
    cards = await ftsFallback(filter.textFallback.trim(), opts, limit);
    if (cards.length) usedFallback = true;
  } else if (cards.length === 0) {
    const bits = [
      ...(filter.attack?.tags ?? []),
      ...(filter.effect?.tags ?? []),
    ].map((t) => t.replaceAll("_", " "));
    if (bits.length) {
      cards = await ftsFallback(bits.join(" "), opts, limit);
      if (cards.length) usedFallback = true;
    }
  }

  return { cards, usedFallback, total: cards.length };
}
