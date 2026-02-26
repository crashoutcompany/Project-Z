import { Card, Set } from "@/prisma/generated/client/client";

export type CardWithSet = Card & { set: Set };

export type SelectionMode = "want" | "give";

export type CardBrowserMode = "view" | "select";

export type SelectedCards = {
  want: CardWithSet[];
  give: CardWithSet[];
};

export type CardBrowserProps = {
  /** Whether the component is in view or select mode */
  mode: CardBrowserMode;
  /** Only show tradeable cards */
  tradeableOnly?: boolean;
  /** Callback when cards are selected (only in select mode) */
  onSelectionChange?: (selected: SelectedCards) => void;
  /** Initial selected cards (only in select mode) */
  initialSelected?: SelectedCards;
};

export type CardGridProps = {
  /** Initial cards to display */
  initialCards: CardWithSet[];
  /** Initial cursor for pagination */
  initialCursor: number | null;
  /** Current set ID to filter by (undefined = all sets when searching) */
  setId?: number;
  /** Current search query */
  searchQuery: string;
  /** Whether to only fetch tradeable cards */
  tradeableOnly: boolean;
  /** Whether cards are selectable */
  selectable: boolean;
  /** Currently selected cards */
  selectedCards: SelectedCards;
  /** Current selection mode */
  selectionMode: SelectionMode;
  /** Callback when a card is clicked */
  onCardClick?: (card: CardWithSet) => void;
};

export type CardItemProps = {
  card: CardWithSet;
  selectable: boolean;
  selectionState: "none" | "want" | "give";
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
  placeholder?: string;
};
