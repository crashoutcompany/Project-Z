import { Card, Set } from "@/prisma/generated/client/client";

export type CardWithSet = Card & { set: Set };

export type SelectionMode = "want" | "give";

export type CardBrowserMode = "view" | "select" | "build";

export type SearchMode = "name" | "effects";

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
  filterChips?: string[];
  showModes?: boolean;
};
