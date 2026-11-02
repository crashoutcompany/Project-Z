import prisma from "@/prisma/db";
import { loadCatalogPage } from "@/lib/catalog-page";
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
    ? sets.find((set) => set.code.toLowerCase() === requestedCode.toLowerCase())
    : undefined;
  const initialSetId = requestedSet?.id ?? sets[0].id;
  // The browser opens with duplicates hidden, matching fetchCards' default.
  const { cards: initialCards, nextCursor: initialCursor } =
    await loadCatalogPage({
      setId: initialSetId,
      tradeableOnly,
      limit: INITIAL_LIMIT,
    });

  return {
    sets,
    initialSetId,
    initialCards: initialCards as CardWithSet[],
    initialCursor,
  };
}
