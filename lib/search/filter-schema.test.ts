import { describe, expect, it } from "vitest";
import {
  AttackFilterSchema,
  FILTER_JSON_SYSTEM_PROMPT,
  FilterJSONSchema,
} from "./filter-schema";
import { ALL_TAGS, TAG_GROUPS, TAG_INFO } from "./tags";

describe("FilterJSONSchema", () => {
  it("defaults surface to any", () => {
    const parsed = FilterJSONSchema.parse({});
    expect(parsed.surface).toBe("any");
  });

  it("accepts a structured attack filter", () => {
    const parsed = FilterJSONSchema.parse({
      attack: { tags: ["coin_flip"], energyCost: 1, damageMin: 50 },
      cardType: "POKEMON",
      energyType: ["fire"],
    });
    expect(parsed.attack?.energyCost).toBe(1);
    expect(parsed.energyType).toEqual(["fire"]);
  });

  it("rejects unknown tags, energy types, and overlong textFallback", () => {
    expect(
      FilterJSONSchema.safeParse({ attack: { tags: ["not_a_real_tag"] } })
        .success,
    ).toBe(false);
    expect(
      FilterJSONSchema.safeParse({ energyType: ["fairy"] }).success,
    ).toBe(false);
    expect(
      FilterJSONSchema.safeParse({ textFallback: "x".repeat(101) }).success,
    ).toBe(false);
  });

  it("validates energyTypeCounts keys", () => {
    expect(
      AttackFilterSchema.safeParse({ energyTypeCounts: { fairy: 1 } }).success,
    ).toBe(false);
    expect(
      AttackFilterSchema.safeParse({ energyTypeCounts: { fire: 2 } }).success,
    ).toBe(true);
  });
});

describe("tag vocabulary", () => {
  it("lists every tag with its label in the LLM prompt", () => {
    for (const tag of ALL_TAGS) {
      expect(FILTER_JSON_SYSTEM_PROMPT).toContain(`- ${tag}: ${TAG_INFO[tag].label}`);
    }
  });

  it("gives every tag a distinct label and a known group", () => {
    const labels = ALL_TAGS.map((t) => TAG_INFO[t].label);
    expect(new Set(labels).size).toBe(labels.length);
    for (const tag of ALL_TAGS) {
      expect(TAG_GROUPS).toContain(TAG_INFO[tag].group);
    }
    expect(Object.keys(TAG_INFO).sort()).toEqual([...ALL_TAGS].sort());
  });

  it("rejects the retired prevent and switch tags", () => {
    for (const tag of ["prevent", "switch"]) {
      expect(FilterJSONSchema.safeParse({ effect: { tags: [tag] } }).success).toBe(false);
    }
  });
});
