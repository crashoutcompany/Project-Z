import { DamageKind, EffectKind } from "../../prisma/generated/client/client";
import type { NormalizedAttack } from "./normalize";

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

export type AttackTag = (typeof ATTACK_TAGS)[number];

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

export type EffectTag = (typeof EFFECT_TAGS)[number];

export const ALL_TAGS = Array.from(new Set([...ATTACK_TAGS, ...EFFECT_TAGS]));

export function tagAttack(attack: {
  name?: string;
  damageRaw?: string;
  damageBase?: number | null;
  damageKind: DamageKind;
  energyCost: number;
  effectText: string;
}): AttackTag[] {
  const tags: Set<AttackTag> = new Set();
  const text = attack.effectText;

  // 1. bench_damage: /benched/ AND /damage/ AND target is opponent's
  if (
    /benched/i.test(text) &&
    /damage/i.test(text) &&
    /(opponent.*benched|benched.*opponent|opponent's benched)/i.test(text)
  ) {
    tags.add("bench_damage");
  }

  // 2. multi_target: each of your opponent's / all of your opponent's
  if (/each of your opponent's|all of your opponent's/i.test(text)) {
    tags.add("multi_target");
  }

  // 3. random_target: chosen at random
  if (/chosen at random/i.test(text)) {
    tags.add("random_target");
  }

  // 4. conditions
  let hasCondition = false;
  if (/is now poisoned/i.test(text)) {
    tags.add("condition_poison");
    hasCondition = true;
  }
  if (/is now burned/i.test(text)) {
    tags.add("condition_burn");
    hasCondition = true;
  }
  if (/is now asleep/i.test(text)) {
    tags.add("condition_sleep");
    hasCondition = true;
  }
  if (/is now confused/i.test(text)) {
    tags.add("condition_confused");
    hasCondition = true;
  }
  if (/is now paralyzed/i.test(text)) {
    tags.add("condition_paralyzed");
    hasCondition = true;
  }
  if (hasCondition) {
    tags.add("applies_condition");
  }

  // 5. coin_flip: flip .*coin
  if (/flip .*coin/i.test(text)) {
    tags.add("coin_flip");
  }

  // 6. damage_plus: damageKind === PLUS
  if (attack.damageKind === DamageKind.PLUS) {
    tags.add("damage_plus");
  }

  // 7. damage_scaling: damageKind === SCALING
  if (attack.damageKind === DamageKind.SCALING) {
    tags.add("damage_scaling");
  }

  // 8. energy_attach: attach AND energy
  if (/attach/i.test(text) && /energy/i.test(text)) {
    tags.add("energy_attach");
  }

  // 9. energy_discard: discard AND energy
  if (/discard/i.test(text) && /energy/i.test(text)) {
    tags.add("energy_discard");
  }

  // 10. draw: \bdraw\b
  if (/\bdraw\b/i.test(text)) {
    tags.add("draw");
  }

  // 11. heal: \bheal
  if (/\bheal/i.test(text)) {
    tags.add("heal");
  }

  // 12. ability_interaction: \bability\b
  if (/\bability\b/i.test(text)) {
    tags.add("ability_interaction");
  }

  // 13. free_attack: energyCost === 0
  if (attack.energyCost === 0) {
    tags.add("free_attack");
  }

  return Array.from(tags);
}

export function tagEffect(effectText: string, kind?: EffectKind): EffectTag[] {
  const tags: Set<EffectTag> = new Set();
  const text = effectText;

  // 1. once_per_turn
  if (/once during your turn/i.test(text)) {
    tags.add("once_per_turn");
  }

  // 2. energy_attach
  if (/attach/i.test(text) && /energy/i.test(text)) {
    tags.add("energy_attach");
  }

  // 3. heal
  if (/\bheal/i.test(text)) {
    tags.add("heal");
  }

  // 4. draw
  if (/\bdraw\b/i.test(text)) {
    tags.add("draw");
  }

  // 5. prevent
  if (/prevent|can't/i.test(text)) {
    tags.add("prevent");
  }

  // 6. search_deck
  if (/search.*deck|look at the top|from your deck/i.test(text)) {
    tags.add("search_deck");
  }

  // 7. switch
  if (/switch/i.test(text)) {
    tags.add("switch");
  }

  // 8. bench_damage
  if (/damage/i.test(text) && /bench/i.test(text)) {
    tags.add("bench_damage");
  }

  // 9. evolution
  if (/evolv/i.test(text)) {
    tags.add("evolution");
  }

  return Array.from(tags);
}
