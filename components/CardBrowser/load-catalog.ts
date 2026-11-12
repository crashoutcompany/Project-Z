import { cacheLife, cacheTag } from "next/cache";
import prisma from "@/prisma/db";
import { loadCatalogPage } from "@/lib/catalog-page";
import type { CardWithSet } from "./types";

const INITIAL_LIMIT = 20;

/** Every set; a pure catalog read, cached until the next import/deploy. */
async function loadSets() {
  "use cache";
  cacheTag("catalog");
  cacheLife("days");
  return prisma.set.findMany({ orderBy: { id: "asc" } });
}

/**
 * Sets plus the browser's first page. It opens on every set, or on the one a
 * `?set=` link names.
 */
export async function loadCardCatalog({
  tradeableOnly = false,
  setCode,
}: {
  tradeableOnly?: boolean;
  setCode?: string;
} = {}) {
  const sets = await loadSets();

  if (sets.length === 0) {
    return {
      sets,
      initialSetIds: [] as number[],
      initialCards: [] as CardWithSet[],
      initialCursor: null as number | null,
      initialTotal: 0,
    };
  }

  const requestedCode = setCode?.trim();
  const requestedSet = requestedCode
    ? sets.find((set) => set.code.toLowerCase() === requestedCode.toLowerCase())
    : undefined;
  const initialSetIds = requestedSet ? [requestedSet.id] : [];
  // The browser opens with duplicates hidden, matching fetchCards' default.
  const page = await loadCatalogPage({
    setIds: initialSetIds,
    tradeableOnly,
    limit: INITIAL_LIMIT,
  });

  return {
    sets,
    initialSetIds,
    initialCards: page.cards as CardWithSet[],
    initialCursor: page.nextCursor,
    initialTotal: page.total ?? page.cards.length,
  };
}
