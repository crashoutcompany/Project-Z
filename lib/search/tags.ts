/**
 * Closed tag vocabulary. This is the single definition; scripts/lib/tagger.ts
 * imports from here so the importer and the search layer always agree.
 */

export const ATTACK_TAGS = [
  "bench_damage",
  "multi_target",
  "random_target",
  "applies_condition",
  "condition_poison",
  "condition_burn",
  "condition_sleep",
  "condition_confused",
  "condition_paralyzed",
  "coin_flip",
  "damage_plus",
  "damage_scaling",
  "energy_attach",
  "energy_discard",
  "draw",
  "heal",
  "ability_interaction",
  "free_attack",
] as const;

export const EFFECT_TAGS = [
  "once_per_turn",
  "energy_attach",
  "heal",
  "draw",
  "prevent",
  "search_deck",
  "switch",
  "bench_damage",
  "evolution",
] as const;

export const ALL_TAGS = Array.from(
  new Set<string>([...ATTACK_TAGS, ...EFFECT_TAGS]),
) as [string, ...string[]];

export type AttackTag = (typeof ATTACK_TAGS)[number];
export type EffectTag = (typeof EFFECT_TAGS)[number];
export type Tag = (typeof ALL_TAGS)[number];

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
