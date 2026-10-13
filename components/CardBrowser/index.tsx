import { CardBrowserClient } from "./CardBrowserClient";
import { loadCardCatalog } from "./load-catalog";
import { CardBrowserProps } from "./types";
import { getCardDetailByRef } from "@/lib/card-detail";
import { parseDexCardParam } from "@/lib/dex-url";

export async function CardBrowser({
  mode,
  initialSetCode,
  initialCardRef,
  tradeableOnly = false,
  defaultSearchMode = "name",
  showSearchModes = true,
  onSelectionChange,
  initialSelected,
  selected,
  onCardClick,
  cardCounts,
  syncDexUrl = false,
}: CardBrowserProps) {
  const parsedCard = parseDexCardParam(initialCardRef);
  const setCode = parsedCard?.setCode ?? initialSetCode;
  const catalogPromise = loadCardCatalog({ tradeableOnly, setCode });
  const detailPromise = parsedCard
    ? getCardDetailByRef(parsedCard.ref)
    : Promise.resolve(null);
  const [{ sets, initialSetId, initialCards, initialCursor }, initialDetail] =
    await Promise.all([catalogPromise, detailPromise]);

  if (sets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No card sets found.</p>
      </div>
    );
  }

  return (
    <CardBrowserClient
      key={initialDetail?.ref ?? `set-${initialSetId}`}
      sets={sets}
      initialSetId={initialSetId}
      initialCards={initialCards}
      initialCursor={initialCursor}
      mode={mode}
      tradeableOnly={tradeableOnly}
      defaultSearchMode={defaultSearchMode}
      showSearchModes={showSearchModes}
      onSelectionChange={onSelectionChange}
      initialSelected={initialSelected}
      selected={selected}
      onCardClick={onCardClick}
      cardCounts={cardCounts}
      initialDetail={initialDetail}
      syncDexUrl={syncDexUrl}
    />
  );
}

export { CardBrowserClient } from "./CardBrowserClient";
export { loadCardCatalog } from "./load-catalog";
export { toSearchCardResult } from "./card-mappers";
export type {
  CardBrowserProps,
  CardWithSet,
  SelectedCards,
  SelectionMode,
} from "./types";
