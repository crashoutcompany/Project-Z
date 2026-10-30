import type { CardWithSet, SelectedCards, SelectionMode } from "./types";

/**
 * Toggles a card in the active list. Adding it also removes it from the other
 * list, so a card is never both wanted and offered. Always returns fresh
 * arrays; the input is never mutated.
 */
export function toggleCardSelection(
  selected: SelectedCards,
  list: SelectionMode,
  card: CardWithSet,
): SelectedCards {
  const other: SelectionMode = list === "want" ? "give" : "want";
  const next: SelectedCards = {
    want: [...selected.want],
    give: [...selected.give],
  };

  if (next[list].some((c) => c.id === card.id)) {
    next[list] = next[list].filter((c) => c.id !== card.id);
  } else {
    next[other] = next[other].filter((c) => c.id !== card.id);
    next[list] = [...next[list], card];
  }
  return next;
}
