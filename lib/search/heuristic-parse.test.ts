import { describe, expect, it } from "vitest";
import { AttackFilterSchema } from "./filter-schema";
import { heuristicParse } from "./heuristic-parse";
import { normalizeQuery } from "./normalize-query";

const parse = (raw: string) => heuristicParse(normalizeQuery(raw));

describe("heuristicParse — energy cost", () => {
  it("reads explicit cost phrasing", () => {
    expect(parse("costs 2 energy").attack?.energyCost).toBe(2);
    expect(parse("attack with 1 energy").attack?.energyCost).toBe(1);
    expect(parse("1 energy attack that does 50 damage").attack?.energyCost).toBe(
      1,
    );
  });

  it("does not treat discard/attach effect text as a cost", () => {
    const discard = parse("discard 1 energy");
    expect(discard.attack?.energyCost).toBeUndefined();
    expect(discard.attack?.tags).toContain("energy_discard");

    const attach = parse("attach 2 energy");
    expect(attach.attack?.energyCost).toBeUndefined();
    expect(attach.attack?.tags).toContain("energy_attach");
  });
});

describe("heuristicParse — damage minimum", () => {
  it("binds the number adjacent to 'damage'", () => {
    expect(parse("50 damage").attack?.damageMin).toBe(50);
    expect(parse("attack that does 70").attack?.damageMin).toBe(70);
    expect(parse("damage of at least 100").attack?.damageMin).toBe(100);
    expect(parse("1 energy attack that does 50+").attack?.damageMin).toBe(50);
  });

  it("does not confuse HP with damage", () => {
    const f = parse("100 hp pokemon with 50 damage");
    expect(f.hpMin).toBe(100);
    expect(f.attack?.damageMin).toBe(50);

    const hpOnly = parse("at least 100 hp");
    expect(hpOnly.hpMin).toBe(100);
    expect(hpOnly.attack?.damageMin).toBeUndefined();
  });
});

describe("heuristicParse — ability queries", () => {
  it("treats a plain ability query as an effect search", () => {
    const f = parse("ability");
    expect(f.effect?.kind).toBe("ABILITY");
    expect(f.attack?.tags).toBeUndefined();
    expect(f.surface).toBe("effect");
  });

  it("keeps ability kind when effect tags are also present", () => {
    const f = parse("ability that draws");
    expect(f.effect?.kind).toBe("ABILITY");
    expect(f.effect?.tags).toContain("draw");
  });

  it("reserves ability_interaction for explicit attack phrasing", () => {
    const f = parse("attack that disable ability");
    expect(f.attack?.tags).toContain("ability_interaction");
    expect(f.effect?.kind).not.toBe("ABILITY");
  });
});

describe("heuristicParse — structured filters vs textFallback", () => {
  it("does not add textFallback when card-level filters exist", () => {
    const f = parse("fire pokemon");
    expect(f.cardType).toBe("POKEMON");
    expect(f.energyType).toEqual(["fire"]);
    expect(f.textFallback).toBeUndefined();
  });

  it("does not add textFallback for HP-only queries", () => {
    const f = parse("at least 100 hp");
    expect(f.hpMin).toBe(100);
    expect(f.textFallback).toBeUndefined();
  });
});

describe("energyTypeCounts schema", () => {
  it("rejects unknown energy type keys", () => {
    expect(
      AttackFilterSchema.safeParse({ energyTypeCounts: { fairy: 1 } }).success,
    ).toBe(false);
    expect(
      AttackFilterSchema.safeParse({ energyTypeCounts: { fire: 2 } }).success,
    ).toBe(true);
  });
});

describe("heuristicParse — typed energy counts", () => {
  it("emits energyTypeCounts for 'double fire'", () => {
    const f = parse("double fire attack");
    expect(f.attack?.energyTypeCounts).toEqual({ fire: 2 });
  });
});
