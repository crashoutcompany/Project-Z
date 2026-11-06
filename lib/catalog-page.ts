import prisma from "@/prisma/db";
import type { Prisma } from "@/prisma/generated/client/client";
import {
  dedupePrints,
  PRINT_KEY_ATTACK_SELECT,
  PRINT_KEY_EFFECT_SELECT,
} from "@/lib/search/dedupe";

export type CatalogPageParams = {
  /** Set ids; a card matches when it is in one of them. Empty = every set. */
  setIds?: number[];
  search?: string;
  cursor?: number;
  limit: number;
  tradeableOnly?: boolean;
  /** Rarity codes; a card matches when it has one of them. */
  rarities?: string[];
  /** Pokémon types; a card matches when either of its types is one of them. */
  types?: string[];
  /** List every print instead of one card per name + attacks. */
  showDuplicates?: boolean;
};

function catalogWhere(params: CatalogPageParams): Prisma.CardWhereInput {
  const { setIds, search, tradeableOnly, rarities, types } = params;
  return {
    ...(setIds?.length && { setId: { in: setIds } }),
    ...(search && { name: { contains: search, mode: "insensitive" } }),
    ...(tradeableOnly && { isTradeable: true }),
    ...(rarities?.length && { rarity: { in: rarities } }),
    // Dual-type cards match on either of their types.
    ...(types?.length && {
      OR: [
        { energyType: { in: types } },
        { secondaryEnergyType: { in: types } },
      ],
    }),
  };
}

/**
 * One page of the set/name catalog in id order, with an id cursor.
 *
 * By default prints of the same card collapse to the lowest-rarity copy. That
 * needs every match (a cheaper copy may sit on any page), so the kept ids are
 * worked out from a light scan of the whole match and then paged, which keeps
 * the cursor from skipping or repeating cards.
 */
export async function loadCatalogPage(params: CatalogPageParams) {
  const { cursor, limit } = params;
  const where = catalogWhere(params);

  if (params.showDuplicates) {
    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        take: limit + 1, // Fetch one extra to determine if there are more
        ...(cursor && {
          skip: 1, // Skip the cursor itself
          cursor: { id: cursor },
        }),
        where,
        orderBy: { id: "asc" },
        include: { set: true },
      }),
      cursor ? null : prisma.card.count({ where }),
    ]);
    return { ...toPage(cards, limit), total };
  }

  const prints = await prisma.card.findMany({
    where,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      rarity: true,
      attacks: { select: PRINT_KEY_ATTACK_SELECT },
      effects: { select: PRINT_KEY_EFFECT_SELECT },
    },
  });
  const keptIds = dedupePrints(prints).map((p) => p.id);
  const pageIds = keptIds
    .filter((id) => !cursor || id > cursor)
    .slice(0, limit + 1);
  const cards = pageIds.length
    ? await prisma.card.findMany({
        where: { id: { in: pageIds } },
        orderBy: { id: "asc" },
        include: { set: true },
      })
    : [];
  return { ...toPage(cards, limit), total: cursor ? null : keptIds.length };
}

function toPage<T extends { id: number }>(cards: T[], limit: number) {
  let nextCursor: number | null = null;
  if (cards.length > limit) {
    cards.pop();
    nextCursor = cards.at(-1)?.id ?? null;
  }
  return { cards, nextCursor };
}
