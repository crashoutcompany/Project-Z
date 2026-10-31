import { DamageKind, EffectKind } from "../../prisma/generated/client/client";
// Single source of truth for the closed tag vocabulary. The search layer
// (lib/search/filter-schema.ts) validates LLM/heuristic output against the
// same lists, so the importer and the query side cannot drift apart.
import { type AttackTag, type EffectTag } from "./tags";

/**
 * Lowercase, strip accents ("Pokémon" → "pokemon") and fold typographic
 * apostrophes/minus signs so the rules below can be plain ASCII. Card text
 * uses "−20 damage" (U+2212) and both ' and ’.
 */
export function normalizeEffectText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[−–]/g, "-");
}

// ---------------------------------------------------------------------------
// Rules shared by attacks and effects. `t` is normalized text. `[^.]*` keeps a
// match inside one sentence, so a clause in one sentence cannot pair with a
// keyword in the next.
// ---------------------------------------------------------------------------

/** Takes Energy from the Energy Zone and attaches it ("Stoke", Blastoise). */
const ZONE_ATTACH = /\b(take|produce)\b[^.]*energy from your energy zone[^.]*\battach/;
/** Attaches Energy from the discard pile (Flame Patch, Dragonair). */
const DISCARD_ATTACH = /\battach\b[^.]*\benergy from your discard pile/;

const SELF_ENERGY_DISCARD = [
  /\bdiscard\b[^.]*\benergy (from|attached to) (this|that) pokemon/,
  /\bdiscard\b[^.]*\benergy attached to all (of your )?pokemon\b/,
  /\bdiscard\b[^.]*\benergy from both active pokemon/,
];
const ENERGY_REMOVAL = [
  /\bdiscard\b[^.]*\benergy from (your opponent's|the defending|both active)/,
  /\bdiscard\b[^.]*\benergy attached to all (of your opponent's )?pokemon\b/,
];

const SNIPE = /damage to \d of your opponent's (benched )?pokemon(?![^.]*chosen at random)/;

const DAMAGE_REDUCTION = [
  /\btakes? -\d+ damage/,
  /\bdo -\d+ damage/, // "attacks used by the Defending Pokémon do −20 damage"
  /\bprevent (all|that) (damage|effects)/,
];

const GUST = /\bswitch (in|out) (1 of )?your opponent's/;
const SELF_SWITCH =
  /\bswitch (this pokemon|it|your active[^.]*?) with (1 of )?your (benched|active)/;

const DAMAGE_BOOST = /\bdo \+\d+ damage/;
const BENCH_SEARCH = /from your deck onto your bench|deck[^.]*put them onto your bench/;

const HAND_DISRUPTION = [
  /\bdiscard\b[^.]*from your opponent's hand/,
  /\b(choose|chosen)\b[^.]*\bcard\b[^.]*\b(discard it|shuffle it into)/,
  /(opponent's|their) hand and shuffles? it into/,
  /reveals that card and shuffles it into/,
  /opponent shuffles? their hand into their deck/,
  /opponent discards cards from their hand/,
  /each player shuffles the cards in their hand/,
  /opponent's hand and put[^.]*onto your opponent's bench/, // Team Rocket's Boss
];

const TOOL_SYNERGY = /\bpokemon tools?\b|\bthis card is attached to\b/;
const ENERGY_MOVE = /\bmove\b[^.]*\benergy\b/;
const RETALIATE = /\bthe attacking pokemon\b/;
const RETREAT_MODIFIER =
  /\bno retreat cost|\bretreat cost (of [^.]*? )?is \d+ (\[\w\] )?(more|less)/;
const CURE_CONDITION =
  /recovers? from all (special conditions|of them)|remove a random special condition|can't be affected by any special conditions/;
const EX_COUNTER = /opponent's (active )?pokemon (is a pokemon )?ex\b/;
const KO_TRIGGER = /knocked out (by|during)|been knocked out|this pokemon is knocked out/;
const SUPPORTER_LOCK = /can't (use|play) any (supporter|trainer) cards/;
const DISCARD_RECOVERY = /from your discard pile[^.]*into your hand/;

function anyMatch(patterns: RegExp[], t: string): boolean {
  return patterns.some((re) => re.test(t));
}

type SharedTag = AttackTag & EffectTag;

/** Tags whose rule is identical on attacks and effects. */
function sharedTags(t: string): SharedTag[] {
  const tags: SharedTag[] = [];
  const add = (tag: SharedTag, hit: boolean) => {
    if (hit) tags.push(tag);
  };

  const zoneAttach = ZONE_ATTACH.test(t);
  add("energy_zone_attach", zoneAttach);
  add("energy_attach", zoneAttach || DISCARD_ATTACH.test(t));

  const selfDiscard = anyMatch(SELF_ENERGY_DISCARD, t);
  const removal = anyMatch(ENERGY_REMOVAL, t);
  add("self_energy_discard", selfDiscard);
  add("energy_removal", removal);
  // Umbrella tag. "discard pile" is a zone, not an Energy discard.
  add(
    "energy_discard",
    selfDiscard ||
      removal ||
      /\bdiscard\b[^.]*\benergy\b/.test(t.replaceAll("discard pile", "")),
  );
  add("energy_move", ENERGY_MOVE.test(t));

  // Claydol's "can't be healed" blocks healing rather than healing.
  add("heal", /\bheal/.test(t.replaceAll("can't be healed", "")));
  add("draw", /\bdraw\b/.test(t));
  add("damage_reduction", anyMatch(DAMAGE_REDUCTION, t));
  add("gust", GUST.test(t));
  add("self_switch", SELF_SWITCH.test(t));
  add("damage_boost", DAMAGE_BOOST.test(t));
  add("bench_search", BENCH_SEARCH.test(t));
  add("hand_disruption", anyMatch(HAND_DISRUPTION, t));
  add("tool_synergy", TOOL_SYNERGY.test(t));
  add("retaliate", RETALIATE.test(t));
  add("retreat_modifier", RETREAT_MODIFIER.test(t));
  add("cure_condition", CURE_CONDITION.test(t));
  add("ex_counter", EX_COUNTER.test(t));
  add("ko_trigger", KO_TRIGGER.test(t));
  add("supporter_lock", SUPPORTER_LOCK.test(t));
  add("discard_recovery", DISCARD_RECOVERY.test(t));

  return tags;
}

export function tagAttack(attack: {
  name?: string;
  damageRaw?: string;
  damageBase?: number | null;
  damageKind: DamageKind;
  energyCost: number;
  effectText: string;
}): AttackTag[] {
  const t = normalizeEffectText(attack.effectText);
  const tags: Set<AttackTag> = new Set(sharedTags(t));

  // bench_damage: damage that lands on the opponent's Bench
  if (/benched/.test(t) && /damage/.test(t) && /opponent's benched|benched[^.]*opponent's/.test(t)) {
    tags.add("bench_damage");
  }
  if (SNIPE.test(t)) tags.add("snipe");

  if (/each of your opponent's|all of your opponent's/.test(t)) {
    tags.add("multi_target");
  }
  if (/chosen at random/.test(t)) tags.add("random_target");

  const conditions = [
    ["poisoned", "condition_poison"],
    ["burned", "condition_burn"],
    ["asleep", "condition_sleep"],
    ["confused", "condition_confused"],
    ["paralyzed", "condition_paralyzed"],
  ] as const;
  for (const [word, tag] of conditions) {
    if (new RegExp(`is now ${word}`).test(t)) {
      tags.add(tag);
      tags.add("applies_condition");
    }
  }

  if (/flip .*coin/.test(t)) tags.add("coin_flip");
  if (/this attack does nothing/.test(t)) tags.add("may_fail");

  if (attack.damageKind === DamageKind.PLUS) tags.add("damage_plus");
  if (attack.damageKind === DamageKind.SCALING) tags.add("damage_scaling");

  if (/damage to itself/.test(t)) tags.add("self_damage");
  if (/during your next turn, this pokemon can't (attack|use)/.test(t)) {
    tags.add("attack_lock_self");
  }
  if (/(defending|that) pokemon can't retreat/.test(t)) tags.add("cant_retreat");

  if (/\bability\b/.test(t)) tags.add("ability_interaction");
  if (attack.energyCost === 0) tags.add("free_attack");

  return Array.from(tags);
}

export function tagEffect(effectText: string, kind?: EffectKind): EffectTag[] {
  const t = normalizeEffectText(effectText);
  const tags: Set<EffectTag> = new Set(sharedTags(t));

  if (/once during your turn/.test(t)) tags.add("once_per_turn");
  if (/search.*deck|look at the top|from your deck/.test(t)) {
    tags.add("search_deck");
  }
  // Only damage aimed at the opponent's Pokémon (Spiritomb, Pyukumuku), not
  // any text that mentions both "damage" and "Bench" (Lyra, Cyrus), and not
  // "+30 damage to your opponent's Pokémon" boosts (Lorelei).
  if (/(?<![+\d])\d+ damage to (each of |\d of )?your opponent's (benched )?pokemon\b/.test(t)) {
    tags.add("bench_damage");
  }
  if (/do \d+ damage to this pokemon/.test(t)) tags.add("self_damage");
  if (/evolv/.test(t)) tags.add("evolution");

  return Array.from(tags);
}
