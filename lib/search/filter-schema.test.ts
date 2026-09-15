import { describe, expect, it } from "vitest";
import { FilterJSONSchema } from "./filter-schema";

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
});
