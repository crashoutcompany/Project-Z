import type { FilterJSON } from "./filter-schema";
import {
  ATTACK_TAGS,
  EFFECT_TAGS,
  ENERGY_TYPES,
  type EnergyType,
  type Tag,
} from "./tags";

/**
 * Deterministic keyword → FilterJSON parser used when GOOGLE_GENERATIVE_AI_API_KEY
 * is missing, and as a fallback if the LLM call fails.
 */
export function heuristicParse(normalized: string): FilterJSON {
  const filter: FilterJSON = { surface: "any" };
  const attackTags: string[] = [];
  const effectTags: string[] = [];
  const attackScope = new Set<string>(ATTACK_TAGS);
  const effectScope = new Set<string>(EFFECT_TAGS);

  // Adds the tag to whichever surfaces it exists on (see tags.ts), so a tag
  // never lands on a surface the tagger cannot produce it for.
  const addTag = (tag: Tag) => {
    if (attackScope.has(tag) && !attackTags.includes(tag)) attackTags.push(tag);
    if (effectScope.has(tag) && !effectTags.includes(tag)) effectTags.push(tag);
  };
  const q = normalized;
  // normalizeQuery turns apostrophes into spaces: "can't" → "can t".
  const cant = String.raw`(can t|cant|cannot|can not)`;

  const cure = /\bcure|\bremove[sd]? (a |all )?(special )?conditions?|recover[s]? from|immune to (special )?conditions/.test(q);
  if (cure) {
    addTag("cure_condition");
  } else {
    if (/\bpoison/.test(q)) addTag("condition_poison");
    if (/\bburn/.test(q)) addTag("condition_burn");
    if (/\bsleep|asleep/.test(q)) addTag("condition_sleep");
    if (/\bconfus/.test(q)) addTag("condition_confused");
    if (/\bparalys|paralyze/.test(q)) addTag("condition_paralyzed");
    if (attackTags.some((t) => t.startsWith("condition_"))) {
      addTag("applies_condition");
    }
  }

  // Bench-related phrasing, most specific first; plain "bench" means damage.
  const benchSearch = /\bbench search|onto (the |your )?bench|from (the |your )?deck (on)?to (the |your )?bench|\bfill(s)? (the |your )?bench/.test(q);
  const snipe = /\bsnip(e|es|ing|er)\b|\btarget(s|ed)? (a |any |one |1 )?(benched|bench)|\bchoose (a |the )?target/.test(q);
  const gust =
    /\bgust|\bpull(s)? up|\bdrag(s)? (out|up)|\bbring(s)? up|switch(es)? (in|out) (the |your )?(opponent|enemy|their)|force(s)? (a )?switch|opponent s (benched |bench )?pokemon (in)?to (the )?active/.test(q);
  if (benchSearch) addTag("bench_search");
  if (snipe) addTag("snipe");
  if (gust) addTag("gust");
  if (/\bbench/.test(q) && !benchSearch && !snipe && !gust && !/\bswitch/.test(q)) {
    addTag("bench_damage");
  }
  if (!gust && /\bswitch|\bpivot/.test(q)) addTag("self_switch");

  if (/\bcoin/.test(q)) addTag("coin_flip");
  if (/\bdoes nothing|\b(may|can|might) fail|\bfail(s)? on tails|\bunreliable/.test(q)) {
    addTag("may_fail");
  }
  if (/\b(more damage|extra damage|damage plus)\b/.test(q)) addTag("damage_plus");
  if (/\bscal(e|ing)|for each\b/.test(q)) addTag("damage_scaling");
  if (/\b(damage )?boost|\bbuff(s)? (attacks|damage)|\bincrease(s)? (attack )?damage/.test(q)) {
    addTag("damage_boost");
  }
  if (/\b(free attack|no (energy )?cost|zero cost)\b/.test(q)) addTag("free_attack");
  if (/\bmulti(ple)? target|\bspread|all (of )?your opponent|each of your opponent/.test(q)) {
    addTag("multi_target");
  }
  if (/\brandom/.test(q)) addTag("random_target");
  if (/\brecoil|\bself ?damage|damages? (itself|its?self)|hurts? itself|damage to itself/.test(q)) {
    addTag("self_damage");
  }
  if (new RegExp(`\\b${cant} attack (next|again|during)|\\battack lock`).test(q)) {
    addTag("attack_lock_self");
  }
  const exCounter =
    /\b(against|vs|versus|counter(s)?|beats?|anti|bonus (to|vs|against)|more damage (to|against|vs)) (pokemon )?ex\b|\bex (counter|killer)/.test(q);
  if (exCounter) addTag("ex_counter");
  if (/\bknock(ed|s)? ?out|\bko\b|\brevenge|\bavenge/.test(q)) addTag("ko_trigger");

  if (/\bdraw/.test(q)) addTag("draw");
  if (/\bheal/.test(q) && !cure) addTag("heal");

  // Energy. "discard pile" is a place, not an Energy discard.
  const energy = /\benergy/.test(q);
  const qNoPile = q.replace(/discard pile|from (the |your )?discard\b/g, "");
  if (/\benergy zone/.test(q)) addTag("energy_zone_attach");
  else if (energy && /\b(attach|accelerat|ramp)/.test(q)) addTag("energy_attach");
  else if (/\b(energy )?(acceleration|ramp)\b/.test(q)) addTag("energy_attach");
  if (energy && /\b(move[sd]?|transfer[s]?|shift[s]?)\b/.test(q)) addTag("energy_move");
  if (energy && /\b(discard|remove|strip|destroy)/.test(qNoPile)) {
    if (/\b(opponent|enemy|their|defending)/.test(q) || /\b(energy removal|remove)/.test(q)) {
      addTag("energy_removal");
    } else if (/\b(own|its|itself|this pokemon|self)\b/.test(q)) {
      addTag("self_energy_discard");
    } else {
      addTag("energy_discard");
    }
  }

  if (/\bonce per turn/.test(q)) addTag("once_per_turn");
  if (/\bsearch|from your deck|look at the top/.test(q) && !benchSearch) {
    addTag("search_deck");
  }
  if (/\b(from|out of) (the |your )?discard( pile)?|\bdiscard (pile )?recovery|\brecover(s|y)? (cards?|pokemon|items?)|\bretrieve/.test(q) && !/\benergy/.test(q)) {
    addTag("discard_recovery");
  }
  if (/\bhand (disruption|disrupt|control|reset)|\bdisrupt|opponent s hand|their hand/.test(q)) {
    addTag("hand_disruption");
  }
  const supporterLock = new RegExp(
    `\\bsupporter lock|\\block(s)? supporters?|\\bblock(s)? supporters?|${cant} (use|play) (any )?(supporters?|trainers?)|\\bno supporters`,
  ).test(q);
  if (supporterLock) addTag("supporter_lock");

  const retreatCost = /\bretreat cost|\bfree retreat|\bno retreat cost|\b(cheaper|reduce[sd]?|lower) retreat/.test(q);
  if (retreatCost) addTag("retreat_modifier");
  if (!retreatCost && new RegExp(`${cant} retreat|\\btrap(s|ped|ping)?\\b|\\b(stop|prevent|block)s? retreat|\\bno retreat`).test(q)) {
    addTag("cant_retreat");
  }
  if (/\bprevent|\bprotect|\breduc(e|es|ed|tion)|\bless damage|\bdamage reduction|\bwall\b|\btank/.test(q) && !/retreat/.test(q) && !supporterLock) {
    addTag("damage_reduction");
  }
  if (/\bretaliat|\bcounter ?attack|\bpunish|\battacking pokemon|\bthorns|\bdamages? (back|the attacker)|\bwhen (hit|damaged)/.test(q)) {
    addTag("retaliate");
  }
  const toolSynergy = /\btools? (synergy|related|attached)|\b(with|has|have|uses?) (a |any )?tools?\b|\bpokemon tools?\b/.test(q);
  if (toolSynergy) addTag("tool_synergy");
  if (/\bevolv/.test(q)) addTag("evolution");
  let effectKind: "ABILITY" | undefined;
  if (/\bability\b/.test(normalized)) {
    if (/\b(interact|disable|copy)\b/.test(normalized)) {
      addTag("ability_interaction");
    } else {
      effectKind = "ABILITY";
    }
  }

  // "blocks supporters" / "pokémon with a tool" describe an effect, not the
  // card type being searched for.
  if (/\bsupporter\b/.test(normalized) && !supporterLock) {
    filter.cardType = "TRAINER";
    filter.trainerType = "SUPPORTER";
    filter.surface = "effect";
  } else if (/\bitem\b/.test(normalized) && !/\btool\b/.test(normalized)) {
    filter.cardType = "TRAINER";
    filter.trainerType = "ITEM";
    filter.surface = "effect";
  } else if (/\btool\b/.test(normalized) && !toolSynergy) {
    filter.cardType = "TRAINER";
    filter.trainerType = "TOOL";
    filter.surface = "effect";
  } else if (/\bstadium\b/.test(normalized)) {
    filter.cardType = "TRAINER";
    filter.trainerType = "STADIUM";
    filter.surface = "effect";
  } else if (/\btrainer\b/.test(normalized)) {
    filter.cardType = "TRAINER";
    filter.surface = "effect";
  } else if (/\bpokemon|pokémon\b/.test(normalized) && !/\bpokemon tools?\b/.test(normalized)) {
    filter.cardType = "POKEMON";
  }

  if (/\bex\b/.test(normalized) && !exCounter) filter.isEx = true;

  const stages: Array<"BASIC" | "STAGE1" | "STAGE2"> = [];
  if (/\bbasic\b/.test(normalized)) stages.push("BASIC");
  if (/\bstage\s*1\b/.test(normalized)) stages.push("STAGE1");
  if (/\bstage\s*2\b/.test(normalized)) stages.push("STAGE2");
  if (stages.length) filter.stage = stages;

  const energyTypes = ENERGY_TYPES.filter((t) =>
    new RegExp(`\\b${t}\\b`).test(normalized),
  ) as EnergyType[];
  if (energyTypes.length && /\b(type|pokemon|pokémon)\b/.test(normalized)) {
    filter.energyType = energyTypes;
  }

  // Attack energy cost. Only treat "N energy" as a cost when the phrasing is
  // about cost ("costs 2 energy", "with 1 energy", "2 energy attack",
  // "2 energy for"). Effect phrases like "discard 1 energy" / "attach 2 energy"
  // are tags (energy_discard / energy_attach), not cost constraints.
  const costExact = normalized.match(
    /\b(?:costs?|with|for)\s+(\d)\s+energy\b|\b(\d)\s+energy\s+(?:attack|cost|move)s?\b/,
  );
  const costNum = costExact ? Number(costExact[1] ?? costExact[2]) : undefined;

  const typedCount = normalized.match(
    /\b(single|double|triple|1|2|3)\s+(grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless)\b/,
  );

  // Damage floor. The number must sit next to damage language ("50 damage",
  // "damage of 50", "does 50"), so unrelated numbers such as "100 hp" are not
  // mistaken for a damage minimum. Note: normalizeQuery strips "+", so
  // "50+" arrives here as "50".
  const damageMinMatch = normalized.match(
    /\b(\d{2,3})\s+(?:plus\s+|or more\s+)?damage\b|\bdamage\s+(?:of\s+)?(?:at least\s+)?(\d{2,3})\b|\b(?:does|deals?|hits? for|at least)\s+(\d{2,3})\b(?!\s*hp)/,
  );
  const damageMin = damageMinMatch
    ? Number(damageMinMatch[1] ?? damageMinMatch[2] ?? damageMinMatch[3])
    : undefined;

  if (
    attackTags.length ||
    costNum !== undefined ||
    typedCount ||
    damageMin !== undefined
  ) {
    filter.attack = {};
    if (attackTags.length) {
      filter.attack.tags = attackTags as NonNullable<
        FilterJSON["attack"]
      >["tags"];
    }
    if (costNum !== undefined && !Number.isNaN(costNum)) {
      filter.attack.energyCost = costNum;
    }
    if (typedCount) {
      const countWord = typedCount[1]!;
      const type = typedCount[2] as EnergyType;
      const count =
        countWord === "single" || countWord === "1"
          ? 1
          : countWord === "double" || countWord === "2"
            ? 2
            : 3;
      filter.attack.energyTypeCounts = { [type]: count };
    }
    if (damageMin !== undefined && !Number.isNaN(damageMin)) {
      filter.attack.damageMin = damageMin;
    }
    if (/\bplus\b|\bmore damage\b/.test(normalized)) {
      filter.attack.damageKind = "PLUS";
    } else if (/\bscal/.test(normalized)) {
      filter.attack.damageKind = "SCALING";
    }
  }

  if (effectTags.length || effectKind) {
    filter.effect = {
      ...(effectTags.length
        ? {
            tags: effectTags as NonNullable<FilterJSON["effect"]>["tags"],
          }
        : {}),
      ...(filter.trainerType
        ? { kind: "TRAINER" as const }
        : effectKind
          ? { kind: effectKind }
          : {}),
    };
  }

  if (filter.attack && !filter.effect && filter.surface === "any") {
    filter.surface = "attack";
  } else if (filter.effect && !filter.attack && filter.surface === "any") {
    filter.surface = "effect";
  }

  const hp = normalized.match(/\b(?:at least\s+)?(\d{2,3})\s*hp\b/);
  if (hp) filter.hpMin = Number(hp[1]);

  const hasStructured =
    filter.attack ||
    filter.effect ||
    filter.anyOf ||
    filter.cardType ||
    filter.trainerType ||
    filter.energyType ||
    filter.stage ||
    filter.isEx !== undefined ||
    filter.hpMin !== undefined ||
    filter.setCodes;
  if (!hasStructured) {
    filter.textFallback = normalized.slice(0, 100);
  }

  return filter;
}
