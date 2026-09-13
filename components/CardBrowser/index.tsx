import { CardBrowserClient } from "./CardBrowserClient";
import { loadCardCatalog } from "./load-catalog";
import { CardBrowserProps } from "./types";

export async function CardBrowser({
  mode,
  initialSetCode,
  tradeableOnly = false,
  defaultSearchMode = "name",
  showSearchModes = true,
  onSelectionChange,
  initialSelected,
  selected,
  onCardClick,
  cardCounts,
}: CardBrowserProps) {
  const { sets, initialSetId, initialCards, initialCursor } =
    await loadCardCatalog({ tradeableOnly, setCode: initialSetCode });

  if (sets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">No card sets found.</p>
      </div>
    );
  }

  return (
    <CardBrowserClient
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
