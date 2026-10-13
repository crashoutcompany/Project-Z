import { describe, expect, it } from "vitest";
import {
  buildCardFacts,
  sheetHeading,
  shinedustLabel,
  titleCase,
} from "./card-facts";

const base = {
  ref: "A1-25",
  rarity: "C",
  hp: null,
  energyType: null,
  stage: null,
  trainerType: null,
} as const;

describe("buildCardFacts", () => {
  it("always lists set/number and rarity", () => {
    expect(buildCardFacts(base)).toEqual([
      { label: "Set / number", value: "A1-25" },
      { label: "Rarity", value: "◊ Common" },
    ]);
  });

  it("adds hp, type, stage, and trainer rows only when present", () => {
    expect(
      buildCardFacts({
        ...base,
        hp: 60,
        energyType: "lightning",
        stage: "STAGE1",
        trainerType: "SUPPORTER",
      }).map((f) => [f.label, f.value]),
    ).toEqual([
      ["Set / number", "A1-25"],
      ["Rarity", "◊ Common"],
      ["HP", "60"],
      ["Type", "Lightning"],
      ["Stage", "Stage 1"],
      ["Trainer", "Supporter"],
    ]);
  });

  it("keeps hp 0 and falls back to the raw value for unknown labels", () => {
    const facts = buildCardFacts({
      ...base,
      hp: 0,
      stage: "MEGA" as never,
    });
    expect(facts).toContainEqual({ label: "HP", value: "0" });
    expect(facts).toContainEqual({ label: "Stage", value: "MEGA" });
  });
});

describe("shinedustLabel", () => {
  it("formats costs, shows 0 for commons, and hides untradeable prints", () => {
    expect(shinedustLabel({ rarity: "C", isTradeable: true })).toBe(
      "0 Shinedust",
    );
    expect(shinedustLabel({ rarity: "SR", isTradeable: true })).toBe(
      "25,000 Shinedust",
    );
    expect(shinedustLabel({ rarity: "SR", isTradeable: false })).toBeNull();
    expect(shinedustLabel({ rarity: "UR", isTradeable: true })).toBeNull();
  });
});

describe("sheetHeading", () => {
  it("uses placeholders until a card is loaded", () => {
    expect(sheetHeading(null, true)).toEqual({
      title: "Loading card",
      description: "Loading card details",
    });
    expect(sheetHeading(null, false)).toEqual({
      title: "Card",
      description: "Card details",
    });
  });

  it("appends ex and shows set and ref", () => {
    expect(
      sheetHeading(
        { name: "Mewtwo", isEx: true, setName: "Genetic Apex", ref: "A1-129" },
        false,
      ),
    ).toEqual({ title: "Mewtwo ex", description: "Genetic Apex · A1-129" });
  });
});

describe("titleCase", () => {
  it("capitalizes the first letter only", () => {
    expect(titleCase("fire")).toBe("Fire");
    expect(titleCase("")).toBe("");
  });
});
