"use server";

import { auth, getSession } from "@/lib/auth";
import prisma from "@/prisma/db";
import { Card } from "@/prisma/generated/client/client";
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
};

const FETCH_CARDS_MAX_LIMIT = 60;

const fetchCardsSchema = z.object({
  setId: z.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  cursor: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(FETCH_CARDS_MAX_LIMIT).default(20),
  tradeableOnly: z.boolean().default(false),
});

export type FetchCardsResult = {
  cards: Card[];
  nextCursor: number | null;
};

/**
 * Fetches cards with cursor-based pagination, set filtering, and search.
 *
 * @param {FetchCardsParams} params - The parameters for fetching cards.
 * @returns {Promise<FetchCardsResult>} The cards and next cursor for pagination.
 */
export const fetchCards = async (
  params: FetchCardsParams,
): Promise<FetchCardsResult> => {
  // Server actions are public POST endpoints, so never trust the client's
  // shape or page size.
  const { setId, search, cursor, limit, tradeableOnly } =
    fetchCardsSchema.parse(params);

  const cards = await prisma.card.findMany({
    take: limit + 1, // Fetch one extra to determine if there are more
    ...(cursor && {
      skip: 1, // Skip the cursor itself
      cursor: { id: cursor },
    }),
    where: {
      ...(setId && { setId }),
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }),
      ...(tradeableOnly && { isTradeable: true }),
    },
    orderBy: { id: "asc" },
    include: {
      set: true,
    },
  });

  let nextCursor: number | null = null;
  if (cards.length > limit) {
    cards.pop();
    nextCursor = cards.at(-1)?.id ?? null;
  }

  return { cards, nextCursor };
};
