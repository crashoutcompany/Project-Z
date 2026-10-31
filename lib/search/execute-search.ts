import { Prisma } from "@/prisma/generated/client/client";
import prisma from "@/prisma/db";
import type { AttackFilter, EffectFilter, FilterJSON } from "./filter-schema";
import { filterTags, type TagMode } from "./filter-tags";
import { cardMatchesClauses, hasEnergyTypeCounts } from "./match";
import { tagAttack, tagEffect } from "./tagger";

export type { TagMode };

export type SearchOptions = {
  limit?: number;
  /** Ranked results to skip, for "load more" paging. */
  offset?: number;
  /** Restrict results to cards flagged tradeable (used by /trading/create). */
  tradeableOnly?: boolean;
  /**
   * Tags picked in the UI filter. With tagMode "all" (the default) a card
   * matches when every tag appears on at least one of its attacks or effects
   * (tags may sit on different ones); with "any", one tag is enough.
   */
  tags?: string[];
  tagMode?: TagMode;
  /**
   * Pokémon types picked in the UI. A card matches when either of its types
   * is one of them. Applied on top of any type parsed from the query.
   */
  types?: string[];
};

// Upper bound on rows ranked per search, and so on the reported total. Well
// above the number of cards that share any single energy type or tag.
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

  // Dual-type cards match on either of their types.
  for (const types of [filter.energyType, opts.types]) {
    if (!types?.length) continue;
    and.push({
      OR: [
        { energyType: { in: types } },
        { secondaryEnergyType: { in: types } },
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
  /** One page of ranked results (`limit` cards from `offset`). */
  cards: SearchCardResult[];
  usedFallback: boolean;
  /** Every matching card, not just this page. */
  total: number;
};

type Unit = {
  /** Tags stored by the importer. These decide whether a card matches. */
  tags: string[];
  /**
   * Tags the current tagger reads from the card text. Stored tags can be
   * stale until the next retag (an Energy discard once tagged as an attach),
   * so ranking trusts the text. Defaults to `tags`.
   */
  evidence?: string[];
  damageBase?: number | null;
};

// Qualifiers that say how often an effect works, not what else it does.
const NEUTRAL_TAGS = new Set(["once_per_turn"]);

// Tags that come as a pair: one is the umbrella of the other ("Attaches extra
// Energy" covers "Attaches from the Energy Zone"; "Poisons" always comes with
// "Inflicts a Special Condition"). Finding one beside a wanted tag is not an
// unrelated effect.
const RELATED_TAGS: Record<string, readonly string[]> = {
  energy_attach: ["energy_zone_attach"],
  energy_zone_attach: ["energy_attach"],
  energy_discard: ["self_energy_discard", "energy_removal"],
  self_energy_discard: ["energy_discard"],
  energy_removal: ["energy_discard"],
  applies_condition: [
    "condition_poison",
    "condition_burn",
    "condition_sleep",
    "condition_confused",
    "condition_paralyzed",
  ],
  condition_poison: ["applies_condition"],
  condition_burn: ["applies_condition"],
  condition_sleep: ["applies_condition"],
  condition_confused: ["applies_condition"],
  condition_paralyzed: ["applies_condition"],
};

// Tags that work against a wanted tag. A card that attaches Energy with one
// attack and throws Energy away with another is a weaker "attaches Energy"
// card than one that only attaches.
const ENERGY_LOSS = ["energy_discard", "self_energy_discard"];
const CONFLICTING_TAGS: Record<string, readonly string[]> = {
  energy_attach: ENERGY_LOSS,
  energy_zone_attach: ENERGY_LOSS,
  heal: ["self_damage"],
};

export type TagRelevance = {
  matchedTags: string[];
  strength: number;
  focus: number;
  noise: number;
  conflicts: number;
  damage: number;
};

/**
 * How well a card's attacks and effects cover the wanted tags, best first:
 *  - matched: distinct wanted tags found anywhere on the card;
 *  - strength: how many of them the card text confirms. The rest are stale
 *    or mis-tags and rank below true matches;
 *  - focus: most wanted tags carried by a single attack or effect;
 *  - noise: fewest unrelated tags on such a best-matching attack or effect,
 *    so "attaches Energy" beats "discards Energy, then attaches one";
 *  - conflicts: attacks or effects anywhere on the card that work against a
 *    wanted tag (discarding Energy when you asked for attaching it);
 *  - damage: highest damage among the attacks that carry a wanted tag. Damage
 *    from an unrelated attack never lifts a card.
 * Everything after `matched` is read from the text-derived tags.
 */
export function tagRelevance(
  wanted: ReadonlySet<string>,
  attacks: Unit[],
  effects: Unit[],
): TagRelevance {
  const related = new Set<string>();
  const opposed = new Set<string>();
  for (const tag of wanted) {
    for (const r of RELATED_TAGS[tag] ?? []) related.add(r);
    for (const c of CONFLICTING_TAGS[tag] ?? []) opposed.add(c);
  }
  for (const tag of wanted) opposed.delete(tag);

  const present = new Set<string>();
  const confirmed = new Set<string>();
  let focus = 0;
  let noise = Infinity;
  let conflicts = 0;
  let damage = 0;
  let storedDamage = 0;
  for (const unit of [...attacks, ...effects]) {
    const evidence = unit.evidence ?? unit.tags;
    if (evidence.some((t) => opposed.has(t))) conflicts++;
    const stored = unit.tags.filter((t) => wanted.has(t));
    for (const t of stored) present.add(t);
    if (stored.length) {
      storedDamage = Math.max(storedDamage, unit.damageBase ?? 0);
    }
    const hits = evidence.filter((t) => wanted.has(t));
    if (!hits.length) continue;
    for (const t of hits) confirmed.add(t);
    const unitNoise = evidence.filter(
      (t) => !wanted.has(t) && !related.has(t) && !NEUTRAL_TAGS.has(t),
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
    strength: [...wanted].filter((t) => confirmed.has(t)).length,
    focus,
    noise: focus ? noise : 0,
    conflicts,
    // A card the text does not confirm still sorts by its tagged attack.
    damage: focus ? damage : storedDamage,
  };
}

type RankableCard = {
  name: string;
  number: number;
  rarity: string;
  attacks: Unit[];
  effects: Unit[];
};

/**
 * Orders cards best first. With wanted tags: by tag relevance (above, in
 * that order), then damage, rarity and name. Without: by damage, rarity and name.
 */
export function rankCards<T extends RankableCard>(
  cards: T[],
  wanted: ReadonlySet<string>,
): Array<T & { matchedTags: string[] }> {
  return cards
    .map((card) => {
      const relevance = tagRelevance(wanted, card.attacks, card.effects);
      const damage = wanted.size
        ? relevance.damage
        : card.attacks.reduce((max, a) => Math.max(max, a.damageBase ?? 0), 0);
      return { card, relevance, damage, rarity: RARITY_RANK[card.rarity] ?? 99 };
    })
    .sort(
      (a, b) =>
        b.relevance.matchedTags.length - a.relevance.matchedTags.length ||
        b.relevance.strength - a.relevance.strength ||
        b.relevance.focus - a.relevance.focus ||
        a.relevance.noise - b.relevance.noise ||
        a.relevance.conflicts - b.relevance.conflicts ||
        b.damage - a.damage ||
        a.rarity - b.rarity ||
        a.card.name.localeCompare(b.card.name) ||
        a.card.number - b.card.number,
    )
    .map(({ card, relevance }) => ({
      ...card,
      matchedTags: relevance.matchedTags,
    }));
}

type Page = { cards: SearchCardResult[]; total: number };

async function queryCards(
  filter: FilterJSON,
  opts: SearchOptions,
  limit: number,
  offset: number,
): Promise<Page> {
  // energyTypeCounts can only be enforced in JS, and the DB prefilter for it
  // (type membership) is much looser than the real predicate.
  const needsPostFilter = hasEnergyTypeCounts(filter);
  const wanted = new Set([...filterTags(filter), ...(opts.tags ?? [])]);
  // Every candidate is scanned: results are ranked in JS (tag relevance,
  // damage, rarity), so a name-ordered prefix would rank only the cards whose
  // names come first, and the total and later pages need the whole set.
  const rows = await prisma.card.findMany({
    where: buildCardWhere(filter, opts),
    take: FULL_SCAN_CAP,
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
          effectText: true,
        },
      },
      effects: { select: { tags: true, kind: true, effectText: true } },
    },
  });

  const candidates = needsPostFilter
    ? rows.filter((c) => cardMatchesClauses(filter, c))
    : rows;
  // Only tag searches need the text read; other rankings ignore tags. With
  // no text there is nothing to contradict the stored tags.
  const withEvidence = wanted.size
    ? candidates.map((c) => ({
        ...c,
        attacks: c.attacks.map((a) => ({
          ...a,
          evidence: a.effectText ? tagAttack(a) : undefined,
        })),
        effects: c.effects.map((e) => ({
          ...e,
          evidence: e.effectText ? tagEffect(e.effectText, e.kind) : undefined,
        })),
      }))
    : candidates;

  const page = rankCards(withEvidence, wanted)
    .slice(offset, offset + limit)
    .map((c) => ({
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
      matchedTags: c.matchedTags,
    }));
  return { cards: page, total: candidates.length };
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
  offset: number,
  filter: FilterJSON,
): Promise<Page> {
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
    ORDER BY c.name ASC, c.number ASC, c.card_id ASC
    LIMIT ${FULL_SCAN_CAP}
  `;

  const types = opts.types ?? [];
  const matching = rows.filter(
    (r) =>
      matchesScalarFilters(r, filter) &&
      (!types.length ||
        types.some((t) => t === r.energyType || t === r.secondaryEnergyType)),
  );
  return {
    total: matching.length,
    cards: matching
      .slice(offset, offset + limit)
      .map(({ trainerType: _trainerType, stage: _stage, ...r }) => ({
        ...r,
        matchedTags: [],
      })),
  };
}

export async function executeSearch(
  filter: FilterJSON,
  opts: SearchOptions = {},
): Promise<SearchResult> {
  const limit = opts.limit ?? 60;
  const offset = Math.max(0, opts.offset ?? 0);

  const page = await queryCards(filter, opts, limit, offset);

  // Tag searches (picked in the UI or parsed from the query) never fall back
  // to full-text search: FTS cannot honour the tags and orders by name, so an
  // empty tag result stays empty instead of listing loosely related cards.
  if (opts.tags?.length || filterTags(filter).length) {
    return { ...page, usedFallback: false };
  }

  if (page.total === 0 && filter.textFallback?.trim()) {
    const fts = await ftsFallback(
      filter.textFallback.trim(),
      opts,
      limit,
      offset,
      filter,
    );
    if (fts.total) return { ...fts, usedFallback: true };
  }

  return { ...page, usedFallback: false };
}
