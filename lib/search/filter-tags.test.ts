import { describe, expect, it } from "vitest";
import { filterTags, withoutTags } from "./filter-tags";

describe("filterTags", () => {
  it("collects attack, effect and anyOf tags once each", () => {
    expect(
      filterTags({
        surface: "any",
        attack: { tags: ["gust", "coin_flip"] },
        effect: { tags: ["gust"] },
        anyOf: [{ effect: { tags: ["heal"] } }],
      }),
    ).toEqual(["gust", "coin_flip", "heal"]);
  });
});

describe("withoutTags", () => {
  it("drops the tags and keeps other constraints", () => {
    expect(
      withoutTags(
        {
          surface: "any",
          cardType: "POKEMON",
          attack: { tags: ["energy_attach", "coin_flip"], damageMin: 50 },
          effect: { tags: ["energy_attach"] },
        },
        ["energy_attach"],
      ),
    ).toEqual({
      surface: "any",
      cardType: "POKEMON",
      attack: { tags: ["coin_flip"], damageMin: 50 },
    });
  });

  it("removes anyOf branches left empty", () => {
    expect(
      withoutTags(
        {
          surface: "any",
          anyOf: [
            { attack: { tags: ["bench_damage"] } },
            { attack: { tags: ["condition_poison"] } },
          ],
        },
        ["bench_damage"],
      ),
    ).toEqual({
      surface: "any",
      anyOf: [{ attack: { tags: ["condition_poison"] } }],
    });
  });

  it("returns the filter unchanged when nothing is dropped", () => {
    const filter = { surface: "any" as const, attack: { tags: ["draw"] } };
    expect(withoutTags(filter, [])).toBe(filter);
  });
});
