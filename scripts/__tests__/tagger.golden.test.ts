import { describe, it, expect } from "vitest";
import { tagAttack, tagEffect } from "../../lib/search/tagger";
import { DamageKind, EffectKind } from "../../prisma/generated/client/client";
import {
  ATTACK_TAGS,
  EFFECT_TAGS,
  type AttackTag,
  type EffectTag,
} from "../../lib/search/tags";

// Every example below is real card text from the pinned cards.json
// (tcg-pocket-collection-tracker @ 9fafc07). See docs/tag-audit.md.

type AttackExample = {
  card: string;
  text: string;
  damageKind?: DamageKind;
  energyCost?: number;
};
type EffectExample = { card: string; text: string; kind?: EffectKind };

const attack = ({ text, damageKind = DamageKind.FIXED, energyCost = 2 }: AttackExample) =>
  tagAttack({ effectText: text, damageKind, energyCost });
const effect = ({ text, kind = EffectKind.ABILITY }: EffectExample) => tagEffect(text, kind);

// Typed as Record<Tag, …> so adding a tag without an example fails typecheck.
const ATTACK_EXAMPLES: Record<AttackTag, AttackExample[]> = {
  bench_damage: [
    { card: "Articuno ex", text: "This attack also does 10 damage to each of your opponent's Benched Pokémon." },
  ],
  snipe: [
    { card: "Absol", text: "This attack also does 30 damage to 1 of your opponent's Benched Pokémon." },
    { card: "Gigalith ex", text: "This attack does 140 damage to 1 of your opponent's Pokémon. During your next turn, this Pokémon can't attack." },
  ],
  multi_target: [
    { card: "Articuno ex", text: "This attack also does 10 damage to each of your opponent's Benched Pokémon." },
  ],
  random_target: [
    { card: "Dragonite", text: "1 of your opponent's Pokémon is chosen at random 4 times. For each time a Pokémon was chosen, do 50 damage to it." },
  ],
  applies_condition: [{ card: "Venomoth", text: "Your opponent's Active Pokémon is now Poisoned." }],
  condition_poison: [{ card: "Venomoth", text: "Your opponent's Active Pokémon is now Poisoned." }],
  condition_burn: [{ card: "Magmortar", text: "Your opponent's Active Pokémon is now Burned." }],
  condition_sleep: [{ card: "Vileplume", text: "Your opponent's Active Pokémon is now Asleep." }],
  condition_confused: [{ card: "Kricketune", text: "Your opponent's Active Pokémon is now Confused." }],
  condition_paralyzed: [
    { card: "Articuno", text: "Flip a coin. If heads, your opponent's Active Pokémon is now Paralyzed." },
  ],
  cure_condition: [{ card: "Wailord ex", text: "This Pokémon recovers from all Special Conditions." }],
  coin_flip: [{ card: "Exeggutor", text: "Flip a coin. If heads, this attack does 30 more damage." }],
  may_fail: [
    { card: "Aipom", text: "Flip a coin. If tails, this attack does nothing." },
    { card: "Froslass", text: "Discard a card from your hand. If you can't, this attack does nothing." },
  ],
  damage_plus: [
    { card: "Exeggutor", text: "Flip a coin. If heads, this attack does 30 more damage.", damageKind: DamageKind.PLUS },
  ],
  damage_scaling: [
    { card: "Pinsir", text: "Flip 2 coins. This attack does 50 damage for each heads.", damageKind: DamageKind.SCALING },
  ],
  damage_boost: [
    { card: "Happiny", text: "During your next turn, attacks used by your Pokémon do +20 damage to your opponent's Active Pokémon." },
  ],
  ex_counter: [
    { card: "Ceruledge", text: "If your opponent's Active Pokémon is a Pokémon ex, this attack does 70 more damage." },
    { card: "Aegislash", text: "During your opponent's next turn, this Pokémon takes −80 damage from attacks from your opponent's Pokémon ex." },
  ],
  ko_trigger: [
    { card: "Bouffalant", text: "If any of your Pokémon were Knocked Out by damage from an attack during your opponent's last turn, this attack does 40 more damage." },
    { card: "Kingambit", text: "This attack does 40 more damage for each time your Pokémon have been Knocked Out during this game." },
  ],
  self_damage: [
    { card: "Arcanine", text: "This Pokémon also does 20 damage to itself." },
    { card: "Zekrom", text: "Flip a coin. If tails, this Pokémon also does 30 damage to itself." },
  ],
  attack_lock_self: [
    { card: "Aggron", text: "During your next turn, this Pokémon can't attack." },
    { card: "Cobalion", text: "During your next turn, this Pokémon can't use Sacred Sword." },
  ],
  energy_attach: [
    { card: "Magby", text: "Take a [R] Energy from your Energy Zone and attach it to 1 of your Benched Basic Pokémon.", energyCost: 0, damageKind: DamageKind.NONE },
  ],
  energy_zone_attach: [
    { card: "Charizard ex", text: "Take 3 [R] Energy from your Energy Zone and attach it to this Pokémon." },
    { card: "Mew ex", text: "Flip 3 coins. Take an amount of [P] Energy from your Energy Zone equal to the number of heads and attach it to your Benched [P] Pokémon in any way you like." },
    { card: "Team Rocket's Moltres ex", text: "Flip 3 coins. For each heads, produce a [R] Energy from your Energy Zone and attach it to this Pokémon." },
  ],
  energy_move: [
    { card: "Swanna", text: "Move all Energy from this Pokémon to 1 of your Benched Pokémon." },
  ],
  energy_discard: [
    { card: "Alolan Golem", text: "Discard 2 [L] Energy from this Pokémon." },
    { card: "Beedrill ex", text: "Discard a random Energy from your opponent's Active Pokémon." },
  ],
  self_energy_discard: [
    { card: "Alolan Golem", text: "Discard 2 [L] Energy from this Pokémon." },
    { card: "Galvantula", text: "Discard all Energy attached to this Pokémon. Your opponent's Active Pokémon is now Paralyzed." },
    { card: "Groudon", text: "Discard 2 random Energy from among the Energy attached to all of your Pokémon." },
  ],
  energy_removal: [
    { card: "Beedrill ex", text: "Discard a random Energy from your opponent's Active Pokémon." },
    { card: "Yveltal", text: "Discard a random Energy from both Active Pokémon." },
    { card: "Gyarados ex", text: "Discard a random Energy from among the Energy attached to all Pokémon (both yours and your opponent's)." },
  ],
  draw: [{ card: "Meowth", text: "Draw 1 card." }],
  heal: [{ card: "Venusaur", text: "Heal 30 damage from this Pokémon." }],
  bench_search: [
    { card: "Combee", text: "Put 1 random Basic Pokémon from your deck onto your Bench." },
  ],
  discard_recovery: [
    { card: "Team Rocket's Slowpoke", text: "Put a random Item card from your discard pile into your hand." },
  ],
  hand_disruption: [
    { card: "Alolan Raticate", text: "Discard a random Item card from your opponent's hand." },
    { card: "Mega Absol ex", text: "Your opponent reveals their hand. Choose a Supporter card you find there and discard it." },
    { card: "Gastly", text: "Flip a coin. If heads, your opponent reveals a random card from their hand and shuffles it into their deck." },
  ],
  supporter_lock: [
    { card: "Psyduck", text: "Your opponent can't use any Supporter cards from their hand during their next turn." },
  ],
  gust: [
    { card: "Hariyama", text: "Switch out your opponent's Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.)" },
    { card: "Sandy Shocks", text: "Switch in 1 of your opponent's Benched Pokémon to the Active Spot. If you do, this attack does 50 damage to the new Active Pokémon." },
  ],
  self_switch: [{ card: "Abra", text: "Switch this Pokémon with 1 of your Benched Pokémon." }],
  cant_retreat: [
    { card: "Arbok", text: "During your opponent's next turn, the Defending Pokémon can't retreat." },
    { card: "Roserade", text: "Your opponent's Active Pokémon is now Poisoned. During your opponent's next turn, that Pokémon can't retreat." },
  ],
  retreat_modifier: [
    { card: "Oranguru", text: "During your opponent's next turn, attacks used by the Defending Pokémon cost 1 [C] more, and its Retreat Cost is 1 [C] more." },
  ],
  damage_reduction: [
    { card: "Carbink", text: "Flip a coin. If heads, during your opponent's next turn, prevent all damage from—and effects of—attacks done to this Pokémon." },
    { card: "Archaludon", text: "During your opponent's next turn, this Pokémon takes −30 damage from attacks." },
    { card: "Bonsly", text: "During your opponent's next turn, attacks used by the Defending Pokémon do −30 damage." },
  ],
  retaliate: [
    { card: "Chesnaught", text: "During your opponent's next turn, if this Pokémon is damaged by an attack, do 80 damage to the Attacking Pokémon." },
  ],
  tool_synergy: [
    { card: "Absol", text: "If this Pokémon has a Pokémon Tool attached, this attack does 30 more damage." },
  ],
  ability_interaction: [
    { card: "Magearna", text: "If your opponent's Active Pokémon has an Ability, this attack does 40 more damage." },
  ],
  free_attack: [
    { card: "Magby", text: "Take a [R] Energy from your Energy Zone and attach it to 1 of your Benched Basic Pokémon.", energyCost: 0, damageKind: DamageKind.NONE },
  ],
};

const TRAINER = EffectKind.TRAINER;

const EFFECT_EXAMPLES: Record<EffectTag, EffectExample[]> = {
  once_per_turn: [{ card: "Butterfree", text: "Once during your turn, you may heal 20 damage from each of your Pokémon." }],
  bench_damage: [
    { card: "Greninja", text: "Once during your turn, you may do 20 damage to 1 of your opponent's Pokémon." },
    { card: "Spiritomb", text: "If this Pokémon is in the Active Spot and is Knocked Out by damage from an attack from your opponent's Pokémon, do 10 damage to each of your opponent's Pokémon." },
  ],
  cure_condition: [
    { card: "Full Heal", kind: TRAINER, text: "Your Active Pokémon recovers from all Special Conditions." },
    { card: "Arceus ex", text: "This Pokémon can't be affected by any Special Conditions." },
  ],
  damage_boost: [
    { card: "Giovanni", kind: TRAINER, text: "During this turn, attacks used by your Pokémon do +10 damage to your opponent's Active Pokémon." },
  ],
  ex_counter: [
    { card: "Red", kind: TRAINER, text: "During this turn, attacks used by your Pokémon do +20 damage to your opponent's Active Pokémon ex." },
  ],
  ko_trigger: [
    { card: "Rescue Scarf", kind: TRAINER, text: "If the Pokémon this card is attached to is Knocked Out by damage from an attack from your opponent's Pokémon, put it into your hand." },
  ],
  self_damage: [
    { card: "Hydreigon", text: "Once during your turn, you may take 2 [D] Energy from your Energy Zone and attach it to this Pokémon. If you do, do 30 damage to this Pokémon." },
  ],
  energy_attach: [
    { card: "Flame Patch", kind: TRAINER, text: "Attach a [R] Energy from your discard pile to your Active [R] Pokémon." },
    { card: "Blastoise", text: "Once during your turn, you may take a [W] Energy from your Energy Zone and attach it to this Pokémon." },
  ],
  energy_zone_attach: [
    { card: "Rika", kind: TRAINER, text: "Produce 2 [F] Energy from your Energy Zone, and attach it to 1 of your Whiscash or Paldean Clodsire." },
  ],
  energy_move: [
    { card: "Dawn", kind: TRAINER, text: "Move an Energy from 1 of your Benched Pokémon to your Active Pokémon." },
  ],
  energy_discard: [
    { card: "Squirt Bottle", kind: TRAINER, text: "Discard a [R] Energy from your opponent's Active Pokémon." },
  ],
  self_energy_discard: [
    { card: "Super Potion", kind: TRAINER, text: "Heal 40 damage from 1 of your Pokémon that has any Energy attached. If you healed any damage in this way, discard a random Energy from that Pokémon." },
  ],
  energy_removal: [
    { card: "Team Rocket Grunt", kind: TRAINER, text: "Flip a coin until you get tails. For each heads, discard a random Energy from your opponent's Active Pokémon." },
  ],
  heal: [{ card: "Butterfree", text: "Once during your turn, you may heal 20 damage from each of your Pokémon." }],
  draw: [
    { card: "Garchomp", text: "You must discard a card from your hand in order to use this Ability. Once during your turn, you may draw a card." },
  ],
  search_deck: [{ card: "Porygon", text: "Once during your turn, you may look at the top card of your deck." }],
  bench_search: [
    { card: "Frogadier", text: "Once during your turn, when you play this card from your hand to evolve 1 of your Pokémon, you may use this Ability. Put a random Frogadier from your deck onto your Bench." },
  ],
  discard_recovery: [
    { card: "Celestic Town Elder", kind: TRAINER, text: "Put 1 random Basic Pokémon from your discard pile into your hand." },
  ],
  hand_disruption: [
    { card: "Red Card", kind: TRAINER, text: "Your opponent shuffles their hand into their deck and draws 3 cards." },
    { card: "Iono", kind: TRAINER, text: "Each player shuffles the cards in their hand into their deck, then draws that many cards." },
  ],
  supporter_lock: [
    { card: "Gengar ex", text: "As long as this Pokémon is in the Active Spot, your opponent can't use any Supporter cards from their hand." },
  ],
  gust: [
    { card: "Cyrus", kind: TRAINER, text: "Switch in 1 of your opponent's Benched Pokémon that has damage on it to the Active Spot." },
    { card: "Sabrina", kind: TRAINER, text: "Switch out your opponent's Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.)" },
  ],
  self_switch: [
    { card: "Greninja ex", text: "Once during your turn, you may switch your Active [W] Pokémon with 1 of your Benched Pokémon." },
    { card: "Lyra", kind: TRAINER, text: "Switch your Active Pokémon that has damage on it with 1 of your Benched Pokémon." },
  ],
  retreat_modifier: [
    { card: "Giratina", text: "If this Pokémon has any Energy attached, it has no Retreat Cost." },
    { card: "Inflatable Boat", kind: TRAINER, text: "The Retreat Cost of the [W] Pokémon this card is attached to is 1 less." },
  ],
  damage_reduction: [
    { card: "Eviolite", kind: TRAINER, text: "The Basic Pokémon this card is attached to takes −20 damage from attacks from your opponent's Pokémon." },
    { card: "Mimikyu ex", text: "When this Pokémon is first damaged by an attack after coming into play, prevent that damage." },
  ],
  retaliate: [
    { card: "Ferrothorn", text: "If this Pokémon is in the Active Spot and is damaged by an attack from your opponent's Pokémon, do 20 damage to the Attacking Pokémon." },
  ],
  tool_synergy: [
    { card: "Giant Cape", kind: TRAINER, text: "The Pokémon this card is attached to gets +20 HP." },
    { card: "Ambipom", text: "Once during your turn, you may put a random Pokémon Tool card from your deck into your hand." },
  ],
  evolution: [
    { card: "Aerodactyl ex", text: "Your opponent can't play any Pokémon from their hand to evolve their Active Pokémon." },
  ],
};

describe("tagAttack: one real card per tag", () => {
  it("has an example for every attack tag", () => {
    for (const tag of ATTACK_TAGS) expect(ATTACK_EXAMPLES[tag]?.length, tag).toBeGreaterThan(0);
  });

  for (const tag of ATTACK_TAGS) {
    for (const ex of ATTACK_EXAMPLES[tag]) {
      it(`${tag}: ${ex.card}`, () => {
        expect(attack(ex)).toContain(tag);
      });
    }
  }
});

describe("tagEffect: one real card per tag", () => {
  it("has an example for every effect tag", () => {
    for (const tag of EFFECT_TAGS) expect(EFFECT_EXAMPLES[tag]?.length, tag).toBeGreaterThan(0);
  });

  for (const tag of EFFECT_TAGS) {
    for (const ex of EFFECT_EXAMPLES[tag]) {
      it(`${tag}: ${ex.card}`, () => {
        expect(effect(ex)).toContain(tag);
      });
    }
  }
});

// Regressions for the mis-tagging found in docs/tag-audit.md, plus near-misses
// for the new rules.
describe("tagAttack: false positives", () => {
  const cases: Array<AttackExample & { not: AttackTag[] }> = [
    { card: "Alakazam", text: "This attack does 30 more damage for each Energy attached to your opponent's Active Pokémon.", not: ["energy_attach"] },
    { card: "Altaria", text: "If this Pokémon has 2 or more different types of Energy attached, this attack does 60 more damage.", not: ["energy_attach"] },
    { card: "Banette", text: "During your opponent's next turn, they can't take any Energy from their Energy Zone to attach to their Active Pokémon.", not: ["energy_attach", "energy_zone_attach"] },
    { card: "Alolan Golem", text: "Discard 2 [L] Energy from this Pokémon.", not: ["energy_removal"] },
    { card: "Beedrill ex", text: "Discard a random Energy from your opponent's Active Pokémon.", not: ["self_energy_discard"] },
    { card: "Dragonite", text: "1 of your opponent's Pokémon is chosen at random 4 times. For each time a Pokémon was chosen, do 50 damage to it.", not: ["snipe"] },
    { card: "Regidrago", text: "If this Pokémon has damage on it, this attack does −100 damage.", not: ["damage_reduction"] },
    { card: "Toxapex", text: "Your opponent's Active Pokémon is now Poisoned. Do 40 damage to this Pokémon instead of the usual amount for this Special Condition.", not: ["self_damage"] },
    { card: "Bewear", text: "Flip 2 coins. If both of them are heads, your opponent's Active Pokémon is Knocked Out.", not: ["ko_trigger"] },
    { card: "Golurk", text: "Reveal the top 3 cards of your deck. This attack does 60 damage for each Pokémon with a Retreat Cost of 3 or more you find there. Shuffle the revealed cards back into your deck.", not: ["retreat_modifier"] },
    { card: "Ditto", text: "Choose 1 of your Benched Pokémon's attacks, except any Pokémon ex, and use it as this attack. If this Pokémon doesn't have the necessary Energy to use that attack, this attack does nothing.", not: ["ex_counter"] },
    { card: "Chatot", text: "Shuffle your hand into your deck. Draw a card for each card in your opponent's hand.", not: ["hand_disruption"] },
    { card: "Omastar", text: "During your opponent's next turn, the Defending Pokémon can't attack.", not: ["attack_lock_self"] },
  ];
  for (const { not, ...ex } of cases) {
    it(`${ex.card} is not ${not.join(", ")}`, () => {
      const tags = attack(ex);
      for (const tag of not) expect(tags).not.toContain(tag);
    });
  }
});

describe("tagEffect: false positives", () => {
  const cases: Array<EffectExample & { not: string[] }> = [
    { card: "Irida", kind: TRAINER, text: "Heal 40 damage from each of your Pokémon that has any [W] Energy attached.", not: ["energy_attach"] },
    { card: "Giratina", text: "If this Pokémon has any Energy attached, it has no Retreat Cost.", not: ["energy_attach"] },
    { card: "Flame Patch", kind: TRAINER, text: "Attach a [R] Energy from your discard pile to your Active [R] Pokémon.", not: ["energy_discard", "discard_recovery"] },
    { card: "Lusamine", kind: TRAINER, text: "You can use this card only if your opponent has gotten at least 1 point. Choose 1 of your Ultra Beasts. Attach 2 random Energy from your discard pile to that Pokémon.", not: ["energy_discard"] },
    { card: "Lyra", kind: TRAINER, text: "Switch your Active Pokémon that has damage on it with 1 of your Benched Pokémon.", not: ["bench_damage", "gust"] },
    { card: "Cyrus", kind: TRAINER, text: "Switch in 1 of your opponent's Benched Pokémon that has damage on it to the Active Spot.", not: ["bench_damage", "self_switch"] },
    { card: "Brambleghast", text: "Once during your turn, if this Pokémon is on your Bench, you may move 30 damage that your Active Pokémon has on it to this Pokémon.", not: ["bench_damage", "energy_move"] },
    { card: "Electrical Cord", kind: TRAINER, text: "If the [L] Pokémon this card is attached to is in the Active Spot and is Knocked Out by damage from an attack from your opponent's Pokémon, move 2 [L] Energy from that Pokémon and attach 1 Energy each to 2 of your Benched Pokémon.", not: ["bench_damage", "energy_attach"] },
    { card: "Lorelei", kind: TRAINER, text: "During this turn, attacks used by your Dewgong, Cloyster, or Lapras do +30 damage to your opponent's Pokémon.", not: ["bench_damage"] },
    { card: "Helix Fossil", kind: TRAINER, text: "Play this card as if it were a 40-HP Basic [C] Pokémon. At any time during your turn, you may discard this card from play. This card can't retreat.", not: ["damage_reduction", "energy_discard"] },
    { card: "Claydol", text: "Pokémon (both yours and your opponent's) can't be healed.", not: ["heal", "damage_reduction"] },
    { card: "Dusknoir", text: "When this Pokémon is Knocked Out, flip a coin. If heads, your opponent can't get any points for it.", not: ["damage_reduction"] },
    { card: "Kid's Room", kind: TRAINER, text: "Once during each player's turn, that player may choose a card in their hand and switch it with a random Pokémon Tool card in their deck.", not: ["self_switch", "hand_disruption"] },
    { card: "Arboliva", text: "Once during your turn, you may heal 60 damage from 1 of your Pokémon ex that has any Energy attached. If you do, discard a random Energy from that Pokémon.", not: ["ex_counter", "energy_removal"] },
  ];
  for (const { not, ...ex } of cases) {
    it(`${ex.card} is not ${not.join(", ")}`, () => {
      const tags = effect(ex);
      for (const tag of not) expect(tags).not.toContain(tag);
    });
  }
});

describe("tag umbrellas", () => {
  it("energy_zone_attach implies energy_attach", () => {
    expect(attack({ card: "Ponyta", text: "Take a [R] Energy from your Energy Zone and attach it to this Pokémon." })).toEqual(
      expect.arrayContaining(["energy_zone_attach", "energy_attach"]),
    );
  });

  it("self_energy_discard and energy_removal imply energy_discard", () => {
    expect(attack({ card: "Oricorio", text: "Discard a random Energy from both Active Pokémon." })).toEqual(
      expect.arrayContaining(["self_energy_discard", "energy_removal", "energy_discard"]),
    );
  });

  it("matches curly apostrophes and ASCII minus signs", () => {
    expect(attack({ card: "Mr. Mime", text: "During your opponent’s next turn, this Pokémon takes -20 damage from attacks." })).toContain(
      "damage_reduction",
    );
  });
});
