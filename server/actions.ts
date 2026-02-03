"use server";

import { auth, Session } from "@/lib/auth";
import prisma from "@/prisma/db";
import { Card, Set } from "@/prisma/generated/client/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Updates the authentication status based on the provided session.
 *
 * If a session is provided, it signs out the user and redirects to the home page.
 * If no session is provided, it redirects the user to the sign-in page.
 *
 * @param {Session | null} session - The current user session.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const updateAuthStatus = async (session: Session | null) => {
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
export const fetchCards = async ({
  setId,
  search,
  cursor,
  limit = 20,
  tradeableOnly = false,
}: FetchCardsParams): Promise<FetchCardsResult> => {
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
    const nextItem = cards.pop();
    nextCursor = nextItem?.id ?? null;
  }

  return { cards, nextCursor };
};

/**
 * Fetches all card sets from the database.
 *
 * @returns {Promise<Set[]>} All card sets.
 */
export const fetchSets = async (): Promise<Set[]> => {
  return prisma.set.findMany({
    orderBy: { id: "asc" },
  });
};
