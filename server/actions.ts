"use server";

import { auth, getSession } from "@/lib/auth";
import {
  getCardDetailById,
  getCardDetailByRef,
  isValidCardDetailRef,
  type CardDetail,
} from "@/lib/card-detail";
import { loadCatalogPage } from "@/lib/catalog-page";
import { RARITY_CODES } from "@/lib/rarity";
import { Card, Set } from "@/prisma/generated/client/client";
import prisma from "@/prisma/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

/**
 * Signs the current user out, or sends a guest to the sign-in page.
 *
 * Reads the session on the server rather than trusting a client-supplied one.
 */
export const updateAuthStatus = async () => {
  const session = await getSession(await headers());
  if (session) {
    await auth.api.signOut({
      headers: await headers(),
    });
    redirect("/");
  } else {
    redirect("/signin");
  }
};

export type FetchCardsParams = {
  setId?: number;
  search?: string;
  cursor?: number;
  limit?: number;
  tradeableOnly?: boolean;
  rarities?: string[];
  showDuplicates?: boolean;
};

const FETCH_CARDS_MAX_LIMIT = 60;

const fetchCardsSchema = z.object({
  setId: z.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  cursor: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(FETCH_CARDS_MAX_LIMIT).default(20),
  tradeableOnly: z.boolean().default(false),
  rarities: z
    .array(z.enum(RARITY_CODES as [string, ...string[]]))
    .max(RARITY_CODES.length)
    .optional(),
  showDuplicates: z.boolean().default(false),
});

export type FetchCardsResult = {
  cards: Card[];
  nextCursor: number | null;
};

/**
 * Fetches cards with cursor-based pagination, set, name and rarity filters.
 * Prints of the same card collapse to one unless `showDuplicates` is set.
 *
 * @param {FetchCardsParams} params - The parameters for fetching cards.
 * @returns {Promise<FetchCardsResult>} The cards and next cursor for pagination.
 */
export const fetchCards = async (
  params: FetchCardsParams,
): Promise<FetchCardsResult> => {
  // Server actions are public POST endpoints, so never trust the client's
  // shape or page size.
  return loadCatalogPage(fetchCardsSchema.parse(params));
};

export type FetchCardDetailInput = {
  id?: number;
  ref?: string;
};

/**
 * `signed_out` is a result rather than a thrown error: production strips
 * server action error messages, and the sheet needs to tell an expired
 * session apart from a failed request to offer sign-in.
 */
export type FetchCardDetailResult =
  | { status: "ok"; detail: CardDetail }
  | { status: "not_found" }
  | { status: "signed_out" };

const fetchCardDetailSchema = z.object({
  id: z.number().optional(),
  ref: z.string().max(5000).optional(),
});

/**
 * Loads attack, ability, and trainer text for the card detail sheet.
 * Catalog browsing stays on `fetchCards`; this is the on-demand inspect path.
 */
export const fetchCardDetail = async (
  input: FetchCardDetailInput,
): Promise<FetchCardDetailResult> => {
  const session = await getSession(await headers());
  if (!session) return { status: "signed_out" };

  const parsed = fetchCardDetailSchema.safeParse(input);
  if (!parsed.success) return { status: "not_found" };
  const { id, ref } = parsed.data;

  let detail: CardDetail | null = null;
  if (id !== undefined) {
    detail = await getCardDetailById(id);
  } else if (ref !== undefined) {
    const trimmed = ref.trim();
    // Malformed refs get the same "not found" result as a missing card.
    if (isValidCardDetailRef(trimmed)) {
      detail = await getCardDetailByRef(trimmed);
    }
  }
  return detail ? { status: "ok", detail } : { status: "not_found" };
};

export type SetWithCards = Set & {
  cards: Array<{ id: number; rarity: string; name: string; number: number }>;
};

/**
 * Fetches all sets with their cards for the collection page.
 * Only includes id, rarity, name, and number for each card (enough for completion stats).
 */
export const fetchSetsWithCards = async (): Promise<SetWithCards[]> => {
  const sets = await prisma.set.findMany({
    orderBy: { id: "asc" },
    include: {
      cards: {
        select: {
          id: true,
          rarity: true,
          name: true,
          number: true,
        },
        orderBy: { number: "asc" },
      },
    },
  });
  return sets;
};
