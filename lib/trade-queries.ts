import {
  groupTradesByListing,
  listingCreatedAt,
  listingValidity,
  type ListingGroup,
} from "@/lib/trade";
import prisma from "@/prisma/db";
import { Prisma, TradeStatus } from "@/prisma/generated/client/client";

export const tradeCardSelect = {
  id: true,
  name: true,
  imageUrl: true,
  rarity: true,
  number: true,
  set: { select: { code: true } },
} satisfies Prisma.CardSelect;

export type TradeCardArt = Prisma.CardGetPayload<{
  select: typeof tradeCardSelect;
}>;

const tradeInclude = {
  cards: { select: tradeCardSelect },
} satisfies Prisma.TradeInclude;

export type TradeWithCards = Prisma.TradeGetPayload<{
  include: typeof tradeInclude;
}>;

/** Max public listings returned on the trading board. */
export const PUBLIC_LISTINGS_LIMIT = 50;

export type TradeListingView = {
  listingId: string;
  wantCards: TradeCardArt[];
  giveCards: TradeCardArt[];
  expiresAt: Date;
  createdAt: Date;
  status: TradeStatus;
  playerId: string;
  isPrivate: boolean;
  validity: ReturnType<typeof listingValidity>;
};

function toListingView(
  group: ListingGroup<TradeWithCards>,
  now: Date,
): TradeListingView {
  const sample = group.want ?? group.give ?? group.trades[0];
  const expiresAt = sample?.expiresAt ?? now;
  const status = sample?.status ?? TradeStatus.EXPIRED;
  const wantCards = group.want?.cards ?? [];
  const giveCards = group.give?.cards ?? [];

  return {
    listingId: group.listingId,
    wantCards,
    giveCards,
    expiresAt,
    createdAt: listingCreatedAt(group),
    status,
    playerId: sample?.playerId ?? "",
    isPrivate: sample?.isPrivate ?? false,
    validity: listingValidity({
      found: Boolean(group.want || group.give),
      wantCount: wantCards.length,
      giveCount: giveCards.length,
      status,
      expiresAt,
      now,
    }),
  };
}

function sortNewest(listings: TradeListingView[]): TradeListingView[] {
  return listings.toSorted(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

export async function loadListingsForPlayer(playerId: string) {
  const trades = await prisma.trade.findMany({
    where: { playerId },
    include: tradeInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const now = new Date();
  return sortNewest(
    groupTradesByListing(trades).map((group) => toListingView(group, now)),
  );
}

/**
 * Public board: other players' active listings. `take` caps trade rows; each
 * listing is two rows (want + give), so fetch 2x and slice the grouped result.
 */
export async function loadPublicListings(excludePlayerId: string) {
  const now = new Date();
  const trades = await prisma.trade.findMany({
    where: {
      playerId: { not: excludePlayerId },
      isPrivate: false,
      status: TradeStatus.ACTIVE,
      expiresAt: { gt: now },
    },
    include: tradeInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PUBLIC_LISTINGS_LIMIT * 2,
  });
  return sortNewest(
    groupTradesByListing(trades)
      .map((group) => toListingView(group, now))
      .filter((listing) => listing.validity.valid),
  ).slice(0, PUBLIC_LISTINGS_LIMIT);
}

export async function loadListingById(listingId: string) {
  const trades = await prisma.trade.findMany({
    where: { listingId },
    include: tradeInclude,
  });
  if (trades.length === 0) return null;
  return toListingView(groupTradesByListing(trades)[0], new Date());
}

export async function loadCardsByIds(ids: number[]): Promise<TradeCardArt[]> {
  if (ids.length === 0) return [];
  const cards = await prisma.card.findMany({
    where: { id: { in: ids } },
    select: tradeCardSelect,
  });
  const byId = new Map(cards.map((card) => [card.id, card]));
  return ids.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
}
