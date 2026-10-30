import { describe, expect, it } from "vitest";
import { heuristicParse } from "./heuristic-parse";
import { normalizeQuery } from "./normalize-query";
import { ALL_TAGS, ATTACK_TAGS, EFFECT_TAGS, type Tag } from "./tags";

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

describe("heuristicParse — typed energy counts", () => {
  it("emits energyTypeCounts for 'double fire'", () => {
    const f = parse("double fire attack");
    expect(f.attack?.energyTypeCounts).toEqual({ fire: 2 });
  });
});

// The backup parser must be able to reach every tag in the vocabulary.
const QUERY_FOR_TAG: Record<Tag, string> = {
  bench_damage: "bench damage",
  snipe: "snipe the bench",
  multi_target: "spread damage to all of your opponent s pokemon",
  random_target: "random damage",
  applies_condition: "poison",
  condition_poison: "poison",
  condition_burn: "burn",
  condition_sleep: "puts to sleep",
  condition_confused: "confuse",
  condition_paralyzed: "paralyze",
  cure_condition: "cure special conditions",
  coin_flip: "coin flip",
  may_fail: "attack that does nothing on tails",
  damage_plus: "more damage",
  damage_scaling: "damage for each",
  damage_boost: "damage boost",
  ex_counter: "bonus vs ex",
  ko_trigger: "revenge when knocked out",
  self_damage: "recoil",
  attack_lock_self: "can't attack next turn",
  energy_attach: "energy acceleration",
  energy_zone_attach: "attach from the energy zone",
  energy_move: "move energy",
  energy_discard: "discard energy",
  self_energy_discard: "discards its own energy",
  energy_removal: "remove opponent's energy",
  draw: "draw cards",
  heal: "heal",
  bench_search: "put pokemon from the deck onto the bench",
  discard_recovery: "recover cards from the discard pile",
  hand_disruption: "hand disruption",
  supporter_lock: "blocks supporters",
  gust: "gust",
  self_switch: "pivot",
  cant_retreat: "opponent can't retreat",
  retreat_modifier: "free retreat cost",
  damage_reduction: "damage reduction",
  retaliate: "damages the attacker",
  tool_synergy: "pokemon with a tool attached",
  ability_interaction: "attack that disable ability",
  free_attack: "free attack",
  once_per_turn: "once per turn",
  search_deck: "search the deck",
  evolution: "evolve",
};

describe("heuristicParse — tag coverage", () => {
  const attackScope = new Set<string>(ATTACK_TAGS);
  const effectScope = new Set<string>(EFFECT_TAGS);

  for (const tag of ALL_TAGS) {
    it(`reaches ${tag} from "${QUERY_FOR_TAG[tag]}"`, () => {
      const f = parse(QUERY_FOR_TAG[tag]);
      const tags = [...(f.attack?.tags ?? []), ...(f.effect?.tags ?? [])];
      expect(tags).toContain(tag);
    });
  }

  it("only puts tags on surfaces the tagger can produce them for", () => {
    for (const tag of ALL_TAGS) {
      const f = parse(QUERY_FOR_TAG[tag]);
      for (const t of f.attack?.tags ?? []) expect(attackScope.has(t), t).toBe(true);
      for (const t of f.effect?.tags ?? []) expect(effectScope.has(t), t).toBe(true);
    }
  });
});

describe("heuristicParse — tag disambiguation", () => {
  it("splits gust from self switching", () => {
    expect(parse("pull up opponent's benched pokemon").effect?.tags).toEqual(["gust"]);
    expect(parse("switch with the bench").effect?.tags).toEqual(["self_switch"]);
  });

  it("keeps bench search and gust out of bench_damage", () => {
    const tags = (q: string) => [...(parse(q).attack?.tags ?? []), ...(parse(q).effect?.tags ?? [])];
    expect(tags("put pokemon onto your bench")).not.toContain("bench_damage");
    expect(tags("gust the bench")).not.toContain("bench_damage");
  });

  it("does not read the discard pile as an energy discard", () => {
    const f = parse("attach energy from the discard pile");
    expect(f.attack?.tags).toContain("energy_attach");
    expect(f.attack?.tags).not.toContain("energy_discard");
  });

  it("does not treat lock / counter phrasing as a card-type filter", () => {
    expect(parse("blocks supporters").trainerType).toBeUndefined();
    expect(parse("pokemon with a tool attached").trainerType).toBeUndefined();
    expect(parse("bonus vs ex").isEx).toBeUndefined();
    expect(parse("supporter that draws").trainerType).toBe("SUPPORTER");
    expect(parse("tool").trainerType).toBe("TOOL");
  });

  it("maps 'prevent damage' to damage_reduction, not the retired prevent tag", () => {
    const f = parse("prevent damage");
    expect(f.effect?.tags).toEqual(["damage_reduction"]);
  });

  it("does not add Special Condition tags to a cure query", () => {
    const f = parse("cure poison");
    expect(f.effect?.tags).toEqual(["cure_condition"]);
    expect(f.attack?.tags).toEqual(["cure_condition"]);
  });
});
