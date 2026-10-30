import { Prisma } from "@/prisma/generated/client/client";
import prisma from "@/prisma/db";
import type { AttackFilter, EffectFilter, FilterJSON } from "./filter-schema";
import { filterTags, type TagMode } from "./filter-tags";
import { cardMatchesClauses, hasEnergyTypeCounts } from "./match";

export type { TagMode };

export type SearchOptions = {
  limit?: number;
  /** Restrict results to cards flagged tradeable (used by /trading/create). */
  tradeableOnly?: boolean;
  /**
   * Tags picked in the UI filter. With tagMode "all" (the default) a card
   * matches when every tag appears on at least one of its attacks or effects
   * (tags may sit on different ones); with "any", one tag is enough.
   */
  tags?: string[];
  tagMode?: TagMode;
};

// Upper bound on rows scanned when a filter needs JS post-filtering or
// tag-relevance ranking. Well above the number of cards that share any single
// energy type or tag.
const FULL_SCAN_CAP = 2000;

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
  if (filter.stage?.length) where.stage = { in: filter.stage };
  if (filter.isEx !== undefined) where.isEx = filter.isEx;
  if (filter.hpMin !== undefined) where.hp = { gte: filter.hpMin };
  if (filter.setCodes?.length) {
    where.set = { code: { in: filter.setCodes } };
  }

  const tagClause = (tag: string): Prisma.CardWhereInput[] => [
    { attacks: { some: { tags: { has: tag } } } },
    { effects: { some: { tags: { has: tag } } } },
  ];
  if (opts.tagMode === "any" && opts.tags?.length) {
    and.push({ OR: opts.tags.flatMap(tagClause) });
  } else {
    for (const tag of opts.tags ?? []) and.push({ OR: tagClause(tag) });
  }

  if (filter.energyType?.length) {
    // Dual-type cards match on either of their types.
    and.push({
      OR: [
        { energyType: { in: filter.energyType } },
        { secondaryEnergyType: { in: filter.energyType } },
      ],
    });
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
  secondaryEnergyType: string | null;
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

type Unit = { tags: string[]; damageBase?: number | null };

// Qualifiers that say how often an effect works, not what else it does.
const NEUTRAL_TAGS = new Set(["once_per_turn"]);

/**
 * How well a card's attacks and effects cover the wanted tags, best first:
 *  - matched: distinct wanted tags found anywhere on the card;
 *  - focus: most wanted tags carried by a single attack or effect;
 *  - noise: fewest unrelated tags on such a best-matching attack or effect,
 *    so "attaches Energy" beats "discards Energy, then attaches one";
 *  - damage: highest damage among the attacks that carry a wanted tag. Damage
 *    from an unrelated attack never lifts a card.
 */
export function tagRelevance(
  wanted: ReadonlySet<string>,
  attacks: Unit[],
  effects: Unit[],
) {
  const present = new Set<string>();
  let focus = 0;
  let noise = Infinity;
  let damage = 0;
  for (const unit of [...attacks, ...effects]) {
    const hits = unit.tags.filter((t) => wanted.has(t));
    if (!hits.length) continue;
    for (const t of hits) present.add(t);
    const unitNoise = unit.tags.filter(
      (t) => !wanted.has(t) && !NEUTRAL_TAGS.has(t),
    ).length;
    if (hits.length > focus) {
      focus = hits.length;
      noise = unitNoise;
    } else if (hits.length === focus) {
      noise = Math.min(noise, unitNoise);
    }
    damage = Math.max(damage, unit.damageBase ?? 0);
  }
  return {
    matchedTags: [...wanted].filter((t) => present.has(t)),
    focus,
    noise: focus ? noise : 0,
    damage,
  };
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
  const wanted = new Set([...filterTags(filter), ...(opts.tags ?? [])]);
  // Tag searches rank by relevance (below), so they scan every candidate.
  // Taking a name-ordered prefix would rank only the cards whose names come
  // first alphabetically.
  const fullScan = needsPostFilter || wanted.size > 0;
  const rows = await prisma.card.findMany({
    where: buildCardWhere(filter, opts),
    take: fullScan ? FULL_SCAN_CAP : Math.min(limit * 3, 240),
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
      const relevance = tagRelevance(wanted, c.attacks, c.effects);
      const maxDamage = wanted.size
        ? relevance.damage
        : c.attacks.reduce((max, a) => Math.max(max, a.damageBase ?? 0), 0);
      return {
        id: c.id,
        name: c.name,
        imageUrl: c.imageUrl,
        setCode: c.set.code,
        number: c.number,
        cardType: c.cardType,
        energyType: c.energyType,
        secondaryEnergyType: c.secondaryEnergyType,
        hp: c.hp,
        rarity: c.rarity,
        isEx: c.isEx,
        isTradeable: c.isTradeable,
        matchedTags: relevance.matchedTags,
        _rank: RARITY_RANK[c.rarity] ?? 99,
        _matched: relevance.matchedTags.length,
        _focus: relevance.focus,
        _noise: relevance.noise,
        _damage: maxDamage,
      };
    })
    .sort(
      (a, b) =>
        b._matched - a._matched ||
        b._focus - a._focus ||
        a._noise - b._noise ||
        b._damage - a._damage ||
        a._rank - b._rank ||
        a.name.localeCompare(b.name) ||
        a.number - b.number,
    )
    .slice(0, limit)
    .map(({ _rank, _matched, _focus, _noise, _damage, ...rest }) => rest);
}

function matchesScalarFilters(
  row: {
    cardType: string;
    trainerType: string | null;
    energyType: string | null;
    secondaryEnergyType: string | null;
    stage: string | null;
    hp: number | null;
    isEx: boolean;
    setCode: string;
  },
  filter: FilterJSON,
): boolean {
  if (filter.cardType && row.cardType !== filter.cardType) return false;
  if (filter.trainerType && row.trainerType !== filter.trainerType) return false;
  if (
    filter.energyType?.length &&
    !filter.energyType.some(
      (type) => type === row.energyType || type === row.secondaryEnergyType,
    )
  ) {
    return false;
  }
  if (
    filter.stage?.length &&
    (!row.stage || !filter.stage.some((stage) => stage === row.stage))
  ) {
    return false;
  }
  if (filter.isEx !== undefined && row.isEx !== filter.isEx) return false;
  if (filter.hpMin !== undefined && (row.hp == null || row.hp < filter.hpMin)) {
    return false;
  }
  if (filter.setCodes?.length && !filter.setCodes.includes(row.setCode)) {
    return false;
  }
  return true;
}

async function ftsFallback(
  text: string,
  opts: SearchOptions,
  limit: number,
  filter: FilterJSON,
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
      trainerType: string | null;
      energyType: string | null;
      secondaryEnergyType: string | null;
      stage: string | null;
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
           c."trainerType"::text AS "trainerType",
           c."energyType" AS "energyType",
           c."secondaryEnergyType" AS "secondaryEnergyType",
           c.stage::text AS stage,
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
    LIMIT ${limit * 3}
  `;

  return rows
    .filter((r) => matchesScalarFilters(r, filter))
    .slice(0, limit)
    .map(({ trainerType: _trainerType, stage: _stage, ...r }) => ({
      ...r,
      matchedTags: [],
    }));
}

export async function executeSearch(
  filter: FilterJSON,
  opts: SearchOptions = {},
): Promise<SearchResult> {
  const limit = opts.limit ?? 60;
  let usedFallback = false;

  let cards = await queryCards(filter, opts, limit);

  // Tag searches (picked in the UI or parsed from the query) never fall back
  // to full-text search: FTS cannot honour the tags and orders by name, so an
  // empty tag result stays empty instead of listing loosely related cards.
  if (opts.tags?.length || filterTags(filter).length) {
    return { cards, usedFallback, total: cards.length };
  }

  if (cards.length === 0 && filter.textFallback?.trim()) {
    cards = await ftsFallback(filter.textFallback.trim(), opts, limit, filter);
    if (cards.length) usedFallback = true;
  }

  return { cards, usedFallback, total: cards.length };
}
