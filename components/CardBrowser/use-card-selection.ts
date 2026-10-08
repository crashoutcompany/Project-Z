"use client";

import { useCallback, useState } from "react";
import { toggleCardSelection } from "./selection";
import type { CardWithSet, SelectedCards, SelectionMode } from "./types";

type UseCardSelectionOptions = {
  initialSelected: SelectedCards;
  /** Controlled selection; when set, the hook only reports changes. */
  selected?: SelectedCards;
  onSelectionChange?: (selected: SelectedCards) => void;
};

/** Want/give selection, either owned here or controlled by the parent. */
export function useCardSelection({
  initialSelected,
  selected,
  onSelectionChange,
}: UseCardSelectionOptions) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("want");
  const [internalSelected, setInternalSelected] =
    useState<SelectedCards>(initialSelected);
  const selectedCards = selected ?? internalSelected;

  const toggleCard = useCallback(
    (card: CardWithSet) => {
      const next = toggleCardSelection(selectedCards, selectionMode, card);
      if (!selected) setInternalSelected(next);
      onSelectionChange?.(next);
    },
    [selected, selectedCards, selectionMode, onSelectionChange],
  );

  return { selectedCards, selectionMode, setSelectionMode, toggleCard };
}
