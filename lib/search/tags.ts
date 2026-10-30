/**
 * Closed tag vocabulary. This is the single definition; scripts/lib/tagger.ts
 * imports from here so the importer and the search layer always agree.
 * See docs/tag-audit.md for how the tags were chosen.
 */

export const ATTACK_TAGS = [
  "bench_damage",
  "snipe",
  "multi_target",
  "random_target",
  "applies_condition",
  "condition_poison",
  "condition_burn",
  "condition_sleep",
  "condition_confused",
  "condition_paralyzed",
  "cure_condition",
  "coin_flip",
  "may_fail",
  "damage_plus",
  "damage_scaling",
  "damage_boost",
  "ex_counter",
  "ko_trigger",
  "self_damage",
  "attack_lock_self",
  "energy_attach",
  "energy_zone_attach",
  "energy_move",
  "energy_discard",
  "self_energy_discard",
  "energy_removal",
  "draw",
  "heal",
  "bench_search",
  "discard_recovery",
  "hand_disruption",
  "supporter_lock",
  "gust",
  "self_switch",
  "cant_retreat",
  "retreat_modifier",
  "damage_reduction",
  "retaliate",
  "tool_synergy",
  "ability_interaction",
  "free_attack",
] as const;

export const EFFECT_TAGS = [
  "once_per_turn",
  "bench_damage",
  "cure_condition",
  "damage_boost",
  "ex_counter",
  "ko_trigger",
  "self_damage",
  "energy_attach",
  "energy_zone_attach",
  "energy_move",
  "energy_discard",
  "self_energy_discard",
  "energy_removal",
  "heal",
  "draw",
  "search_deck",
  "bench_search",
  "discard_recovery",
  "hand_disruption",
  "supporter_lock",
  "gust",
  "self_switch",
  "retreat_modifier",
  "damage_reduction",
  "retaliate",
  "tool_synergy",
  "evolution",
] as const;

export type AttackTag = (typeof ATTACK_TAGS)[number];
export type EffectTag = (typeof EFFECT_TAGS)[number];
export type Tag = AttackTag | EffectTag;

export const ALL_TAGS = Array.from(
  new Set<Tag>([...ATTACK_TAGS, ...EFFECT_TAGS]),
) as [Tag, ...Tag[]];

/**
 * Bump when tags are added, removed or re-scoped. It is folded into the
 * search-cache key so cached LLM parses made against the old vocabulary are
 * not reused.
 */
export const TAG_VOCAB_VERSION = 2;

export const TAG_GROUPS = [
  "Damage",
  "Energy",
  "Conditions",
  "Switching",
  "Defense",
  "Disruption",
  "Cards",
  "Other",
] as const;

export type TagGroup = (typeof TAG_GROUPS)[number];

/** Human-readable label and UI group for every tag. */
export const TAG_INFO: Record<Tag, { label: string; group: TagGroup }> = {
  bench_damage: { label: "Damages the Bench", group: "Damage" },
  snipe: { label: "Hits a chosen Pokémon", group: "Damage" },
  multi_target: { label: "Hits all opponent's Pokémon", group: "Damage" },
  random_target: { label: "Random target", group: "Damage" },
  damage_plus: { label: "Bonus damage (+)", group: "Damage" },
  damage_scaling: { label: "Scaling damage (×)", group: "Damage" },
  damage_boost: { label: "Boosts other attacks", group: "Damage" },
  ex_counter: { label: "Counters Pokémon ex", group: "Damage" },
  ko_trigger: { label: "Triggers on a Knock Out", group: "Damage" },
  self_damage: { label: "Damages itself", group: "Damage" },
  free_attack: { label: "Free attack (no Energy)", group: "Damage" },

  energy_attach: { label: "Attaches extra Energy", group: "Energy" },
  energy_zone_attach: { label: "Attaches from the Energy Zone", group: "Energy" },
  energy_move: { label: "Moves Energy", group: "Energy" },
  energy_discard: { label: "Discards Energy", group: "Energy" },
  self_energy_discard: { label: "Discards its own Energy", group: "Energy" },
  energy_removal: { label: "Discards opponent's Energy", group: "Energy" },

  applies_condition: { label: "Inflicts a Special Condition", group: "Conditions" },
  condition_poison: { label: "Poisons", group: "Conditions" },
  condition_burn: { label: "Burns", group: "Conditions" },
  condition_sleep: { label: "Puts to Sleep", group: "Conditions" },
  condition_confused: { label: "Confuses", group: "Conditions" },
  condition_paralyzed: { label: "Paralyzes", group: "Conditions" },
  cure_condition: { label: "Cures Special Conditions", group: "Conditions" },

  gust: { label: "Pull up opponent's Pokémon", group: "Switching" },
  self_switch: { label: "Switches your Active Pokémon", group: "Switching" },
  cant_retreat: { label: "Opponent can't retreat", group: "Switching" },
  retreat_modifier: { label: "Changes Retreat Cost", group: "Switching" },

  damage_reduction: { label: "Reduces or prevents damage", group: "Defense" },
  retaliate: { label: "Damages the attacker", group: "Defense" },
  heal: { label: "Heals", group: "Defense" },

  hand_disruption: { label: "Disrupts opponent's hand", group: "Disruption" },
  supporter_lock: { label: "Blocks opponent's Supporters", group: "Disruption" },
  ability_interaction: { label: "Interacts with Abilities", group: "Disruption" },

  draw: { label: "Draws cards", group: "Cards" },
  search_deck: { label: "Searches the deck", group: "Cards" },
  bench_search: { label: "Benches Pokémon from the deck", group: "Cards" },
  discard_recovery: { label: "Recovers from the discard pile", group: "Cards" },
  tool_synergy: { label: "Pokémon Tool related", group: "Cards" },
  evolution: { label: "Evolution related", group: "Cards" },

  coin_flip: { label: "Coin flip", group: "Other" },
  may_fail: { label: "Can do nothing (tails)", group: "Other" },
  attack_lock_self: { label: "Can't attack next turn", group: "Other" },
  once_per_turn: { label: "Once per turn", group: "Other" },
};

export function tagLabel(tag: string): string {
  return (TAG_INFO as Record<string, { label: string }>)[tag]?.label ?? tag;
}

export function isTag(value: string): value is Tag {
  return Object.hasOwn(TAG_INFO, value);
}

export const ENERGY_TYPES = [
  "grass",
  "fire",
  "water",
  "lightning",
  "psychic",
  "fighting",
  "darkness",
  "metal",
  "dragon",
  "colorless",
] as const;

export type EnergyType = (typeof ENERGY_TYPES)[number];
