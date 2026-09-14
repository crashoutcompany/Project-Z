import prisma from "@/prisma/db";
import type { CardWithSet } from "./types";

const INITIAL_LIMIT = 20;

export async function loadCardCatalog({
  tradeableOnly = false,
  setCode,
}: {
  tradeableOnly?: boolean;
  setCode?: string;
} = {}) {
  const sets = await prisma.set.findMany({
    orderBy: { id: "asc" },
  });

  if (sets.length === 0) {
    return {
      sets,
      initialSetId: 0,
      initialCards: [] as CardWithSet[],
      initialCursor: null as number | null,
    };
  }

  const requestedCode = setCode?.trim();
  const requestedSet = requestedCode
    ? sets.find(
        (set) => set.code.toLowerCase() === requestedCode.toLowerCase(),
      )
    : undefined;
  const initialSetId = requestedSet?.id ?? sets[0].id;
  const initialCards = await prisma.card.findMany({
    take: INITIAL_LIMIT + 1,
    where: {
      setId: initialSetId,
      ...(tradeableOnly && { isTradeable: true }),
    },
    orderBy: { id: "asc" },
    include: {
      set: true,
    },
  });

  let initialCursor: number | null = null;
  if (initialCards.length > INITIAL_LIMIT) {
    initialCards.pop();
    initialCursor = initialCards.at(-1)?.id ?? null;
  }

  return {
    sets,
    initialSetId,
    initialCards: initialCards as CardWithSet[],
    initialCursor,
  };
}
