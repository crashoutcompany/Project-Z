import { describe, expect, it } from "vitest";
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

describe("heuristicParse — typed energy counts", () => {
  it("emits energyTypeCounts for 'double fire'", () => {
    const f = parse("double fire attack");
    expect(f.attack?.energyTypeCounts).toEqual({ fire: 2 });
  });
});
