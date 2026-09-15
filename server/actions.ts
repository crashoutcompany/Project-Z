"use server";

import { auth, Session } from "@/lib/auth";
import {
  getCardDetailById,
  getCardDetailByRef,
  type CardDetail,
} from "@/lib/card-detail";
import prisma from "@/prisma/db";
import { Card } from "@/prisma/generated/client/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

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
    cards.pop();
    nextCursor = cards.at(-1)?.id ?? null;
  }

  return { cards, nextCursor };
};

export type FetchCardDetailInput = {
  id?: number;
  ref?: string;
};

/**
 * Loads attack, ability, and trainer text for the card detail sheet.
 * Catalog browsing stays on `fetchCards`; this is the on-demand inspect path.
 */
export const fetchCardDetail = async (
  input: FetchCardDetailInput,
): Promise<CardDetail | null> => {
  await requireSession();

  if (typeof input.id === "number") {
    return getCardDetailById(input.id);
  }
  if (typeof input.ref === "string" && input.ref.trim()) {
    return getCardDetailByRef(input.ref.trim());
  }
  return null;
};
