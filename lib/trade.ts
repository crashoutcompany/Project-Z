/** Default lifetime for a published listing. */
export const TRADE_LISTING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const MAX_CARDS_PER_SIDE = 20;

export const LISTING_INVALID_MESSAGE = "This listing is no longer valid.";

export type TradeSide = "want" | "give";

export type TradeProvider = "GOOGLE" | "GITHUB";

export type TradeStatusName =
  | "ACTIVE"
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

const CARD_ID_RE = /^\d+$/;

/**
 * Parse a comma-separated list of positive integer card ids.
 * Duplicates are dropped, order is preserved. Empty input yields [].
 */
export function parseCardIdList(raw: string | null | undefined): number[] {
  if (!raw?.trim()) return [];

  const ids: number[] = [];
  const seen = new Set<number>();

  for (const part of raw.split(",")) {
    const token = part.trim();
    if (!token) continue;
    if (!CARD_ID_RE.test(token)) {
      throw new Error(`Invalid card id: ${part}`);
    }
    const n = Number(token);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error(`Invalid card id: ${part}`);
    }
    if (seen.has(n)) continue;
    seen.add(n);
    ids.push(n);
  }

  if (ids.length > MAX_CARDS_PER_SIDE) {
    throw new Error(`Too many cards (max ${MAX_CARDS_PER_SIDE} per side).`);
  }

  return ids;
}

export function encodeCardIdList(ids: number[]): string {
  return ids.join(",");
}

export function buildTradeUrl(listingId: string): string {
  return `/trading/t/${encodeURIComponent(listingId)}`;
}

export function createListingId(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(9))).toString(
    "base64url",
  );
}

export function listingExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + TRADE_LISTING_TTL_MS);
}

export function tradeIdentifier(
  email: string,
  providerId: string | undefined,
): string {
  return `${email}.${(providerId ?? "UNKNOWN").toUpperCase()}`;
}

export function toProvider(providerId: string | undefined): TradeProvider {
  const upper = providerId?.toUpperCase();
  if (upper === "GOOGLE" || upper === "GITHUB") return upper;
  throw new Error("Sign in with Google or GitHub to publish a trade.");
}

export type ListingInvalidReason =
  | "missing"
  | "expired"
  | "cancelled"
  | "incomplete";

export type ListingValidity =
  | { valid: true; reason: "ok"; message: null }
  | { valid: false; reason: ListingInvalidReason; message: string };

const CLOSED_STATUSES = new Set<TradeStatusName>([
  "CANCELLED",
  "REJECTED",
  "COMPLETED",
]);

export function listingValidity(input: {
  found: boolean;
  wantCount: number;
  giveCount: number;
  status: TradeStatusName;
  expiresAt: Date;
  now?: Date;
}): ListingValidity {
  if (!input.found) {
    return {
      valid: false,
      reason: "missing",
      message: LISTING_INVALID_MESSAGE,
    };
  }

  const now = input.now ?? new Date();
  if (
    input.expiresAt.getTime() <= now.getTime() ||
    input.status === "EXPIRED"
  ) {
    return {
      valid: false,
      reason: "expired",
      message: LISTING_INVALID_MESSAGE,
    };
  }

  if (CLOSED_STATUSES.has(input.status)) {
    return {
      valid: false,
      reason: "cancelled",
      message: LISTING_INVALID_MESSAGE,
    };
  }

  if (input.wantCount < 1 || input.giveCount < 1) {
    return {
      valid: false,
      reason: "incomplete",
      message: LISTING_INVALID_MESSAGE,
    };
  }

  return { valid: true, reason: "ok", message: null };
}

export type ListingGroup<T extends { listingId: string; isSeeking: boolean }> =
  {
    listingId: string;
    want: T | undefined;
    give: T | undefined;
    trades: T[];
  };

export function groupTradesByListing<
  T extends { listingId: string; isSeeking: boolean },
>(trades: T[]): ListingGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const trade of trades) {
    const existing = map.get(trade.listingId);
    if (existing) existing.push(trade);
    else map.set(trade.listingId, [trade]);
  }

  return [...map.entries()].map(([listingId, group]) => ({
    listingId,
    want: group.find((t) => t.isSeeking),
    give: group.find((t) => !t.isSeeking),
    trades: group,
  }));
}

export function listingCreatedAt<
  T extends { listingId: string; isSeeking: boolean; createdAt: Date },
>(group: ListingGroup<T>): Date {
  let earliest = group.trades[0]?.createdAt;
  for (const trade of group.trades) {
    if (!earliest || trade.createdAt < earliest) earliest = trade.createdAt;
  }
  return earliest ?? new Date(0);
}
