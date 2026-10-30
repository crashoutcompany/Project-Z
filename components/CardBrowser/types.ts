import { Card, Set } from "@/prisma/generated/client/client";
import type { TagMode } from "@/lib/search/filter-tags";

export type CardWithSet = Card & { set: Set };

export type SelectionMode = "want" | "give";

export type CardBrowserMode = "view" | "select" | "build";

export type SearchMode = "name" | "effects";

export type { TagMode };

export type SelectedCards = {
  want: CardWithSet[];
  give: CardWithSet[];
};

export type CardBrowserProps = {
  mode: CardBrowserMode;
  initialSetCode?: string;
  /** `{setCode}-{number}` deep-link, e.g. `A1-94`. Opens the detail sheet. */
  initialCardRef?: string;
  tradeableOnly?: boolean;
  defaultSearchMode?: SearchMode;
  showSearchModes?: boolean;
  onSelectionChange?: (selected: SelectedCards) => void;
  initialSelected?: SelectedCards;
  selected?: SelectedCards;
  onCardClick?: (card: CardWithSet) => void;
  cardCounts?: Record<number, number>;
  /** When set (Dex), tapping a card writes `?set=&card=` for sharing. */
  syncDexUrl?: boolean;
};

export type CardGridProps = {
  initialCards: CardWithSet[];
  initialCursor: number | null;
  setId?: number;
  searchQuery: string;
  tradeableOnly: boolean;
  selectable: boolean;
  selectedCards: SelectedCards;
  selectionMode: SelectionMode;
  density?: "comfortable" | "compact";
  cardCounts?: Record<number, number>;
  onCardClick?: (card: CardWithSet) => void;
};

export type CardItemProps = {
  card: CardWithSet;
  selectable: boolean;
  selectionState: "none" | "want" | "give";
  count?: number;
  priority?: boolean;
  onClick?: () => void;
};

export type SetTabsProps = {
  sets: Set[];
  activeSetId: number;
  onSetChange: (setId: number) => void;
  disabled?: boolean;
};

export type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  placeholder?: string;
  showModes?: boolean;
};

export type TagFilterProps = {
  selected: string[];
  onChange: (tags: string[]) => void;
  mode: TagMode;
  onModeChange: (mode: TagMode) => void;
  disabled?: boolean;
};

export type ActiveFiltersProps = {
  /** Tags picked from the tag list. */
  picked: string[];
  /** Tags parsed from the typed query (not also picked). */
  parsed: string[];
  /** Other parsed constraints, e.g. "Pokémon" or "HP≥100". */
  notes: string[];
  onRemovePicked: (tag: string) => void;
  onRemoveParsed: (tag: string) => void;
  onClearAll: () => void;
  disabled?: boolean;
};
