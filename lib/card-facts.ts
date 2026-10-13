import type { CardDetail } from "@/lib/card-detail";
import { formatShinedust, getRarityInfo, getShinedustCost } from "@/lib/rarity";

const STAGE_LABEL: Record<string, string> = {
  BASIC: "Basic",
  STAGE1: "Stage 1",
  STAGE2: "Stage 2",
};

const TRAINER_LABEL: Record<string, string> = {
  SUPPORTER: "Supporter",
  ITEM: "Item",
  TOOL: "Tool",
  STADIUM: "Stadium",
};

export type CardFact = { label: string; value: string };

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Label/value rows for the detail sheet; rows with no data are omitted. */
export function buildCardFacts(
  detail: Pick<
    CardDetail,
    "ref" | "rarity" | "hp" | "energyType" | "stage" | "trainerType"
  >,
): CardFact[] {
  const rarity = getRarityInfo(detail.rarity);
  const facts: CardFact[] = [
    { label: "Set / number", value: detail.ref },
    { label: "Rarity", value: `${rarity.symbol} ${rarity.name}` },
  ];

  if (detail.hp != null) facts.push({ label: "HP", value: String(detail.hp) });
  if (detail.energyType) {
    facts.push({ label: "Type", value: titleCase(detail.energyType) });
  }
  if (detail.stage) {
    facts.push({
      label: "Stage",
      value: STAGE_LABEL[detail.stage] ?? detail.stage,
    });
  }
  if (detail.trainerType) {
    facts.push({
      label: "Trainer",
      value: TRAINER_LABEL[detail.trainerType] ?? detail.trainerType,
    });
  }
  return facts;
}

/** Shinedust badge text, or `null` when the print cannot be traded. */
export function shinedustLabel(
  detail: Pick<CardDetail, "rarity" | "isTradeable">,
): string | null {
  const cost = getShinedustCost(detail.rarity, detail.isTradeable);
  if (cost == null) return null;
  return cost === 0 ? "0 Shinedust" : `${formatShinedust(cost)} Shinedust`;
}

/** Heading and subheading for the sheet, including the pre-load placeholders. */
export function sheetHeading(
  detail: Pick<CardDetail, "name" | "isEx" | "setName" | "ref"> | null,
  loading: boolean,
): { title: string; description: string } {
  if (!detail) {
    return loading
      ? { title: "Loading card", description: "Loading card details" }
      : { title: "Card", description: "Card details" };
  }
  return {
    title: `${detail.name}${detail.isEx ? " ex" : ""}`,
    description: `${detail.setName} · ${detail.ref}`,
  };
}
