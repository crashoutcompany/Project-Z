import type { FilterJSON } from "./filter-schema";
import { ENERGY_TYPES, type EnergyType } from "./tags";

/**
 * Deterministic keyword → FilterJSON parser used when GOOGLE_GENERATIVE_AI_API_KEY
 * is missing, and as a fallback if the LLM call fails.
 */
export function heuristicParse(normalized: string): FilterJSON {
  const filter: FilterJSON = { surface: "any" };
  const attackTags: string[] = [];
  const effectTags: string[] = [];

  const addAttack = (tag: string) => {
    if (!attackTags.includes(tag)) attackTags.push(tag);
  };
  const addEffect = (tag: string) => {
    if (!effectTags.includes(tag)) effectTags.push(tag);
  };

  if (/\bpoison/.test(normalized)) addAttack("condition_poison");
  if (/\bburn/.test(normalized)) addAttack("condition_burn");
  if (/\bsleep|asleep/.test(normalized)) addAttack("condition_sleep");
  if (/\bconfus/.test(normalized)) addAttack("condition_confused");
  if (/\bparalys|paralyze/.test(normalized)) addAttack("condition_paralyzed");
  if (attackTags.some((t) => t.startsWith("condition_"))) {
    addAttack("applies_condition");
  }

  if (/\bbench/.test(normalized)) {
    addAttack("bench_damage");
    addEffect("bench_damage");
  }
  if (/\bcoin/.test(normalized)) addAttack("coin_flip");
  if (/\b(more damage|extra damage|damage plus)\b/.test(normalized)) {
    addAttack("damage_plus");
  }
  if (/\bscal(e|ing)|for each\b/.test(normalized)) addAttack("damage_scaling");
  if (/\b(free attack|no (energy )?cost|zero cost)\b/.test(normalized)) {
    addAttack("free_attack");
  }
  if (
    /\bmulti(ple)? target|all (of )?your opponent|each of your opponent/.test(
      normalized,
    )
  ) {
    addAttack("multi_target");
  }
  if (/\brandom/.test(normalized)) addAttack("random_target");

  if (/\bdraw/.test(normalized)) {
    addAttack("draw");
    addEffect("draw");
  }
  if (/\bheal/.test(normalized)) {
    addAttack("heal");
    addEffect("heal");
  }
  if (/\battach/.test(normalized) && /\benergy/.test(normalized)) {
    addAttack("energy_attach");
    addEffect("energy_attach");
  }
  if (/\bdiscard/.test(normalized) && /\benergy/.test(normalized)) {
    addAttack("energy_discard");
  }
  if (/\bonce per turn/.test(normalized)) addEffect("once_per_turn");
  if (/\bsearch|from your deck|look at the top/.test(normalized)) {
    addEffect("search_deck");
  }
  if (/\bswitch/.test(normalized)) addEffect("switch");
  if (/\bprevent|can'?t\b/.test(normalized)) addEffect("prevent");
  if (/\bevolv/.test(normalized)) addEffect("evolution");
  const plainAbility = /\bability\b/.test(normalized);
  const abilityInteraction =
    plainAbility &&
    /\b(interact|disable|copy|ignore|against)\b/.test(normalized);
  if (abilityInteraction) addAttack("ability_interaction");

  if (/\bsupporter\b/.test(normalized)) {
    filter.cardType = "TRAINER";
    filter.trainerType = "SUPPORTER";
    filter.surface = "effect";
  } else if (/\bitem\b/.test(normalized) && !/\btool\b/.test(normalized)) {
    filter.cardType = "TRAINER";
    filter.trainerType = "ITEM";
    filter.surface = "effect";
  } else if (/\btool\b/.test(normalized)) {
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
  } else if (/\bpokemon|pokémon\b/.test(normalized)) {
    filter.cardType = "POKEMON";
  }

  if (/\bex\b/.test(normalized)) filter.isEx = true;

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

  if (effectTags.length || (plainAbility && !abilityInteraction)) {
    filter.effect = {
      ...(effectTags.length
        ? {
            tags: effectTags as NonNullable<FilterJSON["effect"]>["tags"],
          }
        : {}),
      ...(filter.trainerType
        ? { kind: "TRAINER" as const }
        : plainAbility && !abilityInteraction
          ? { kind: "ABILITY" as const }
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
    Boolean(filter.attack) ||
    Boolean(filter.effect) ||
    Boolean(filter.anyOf) ||
    Boolean(filter.cardType) ||
    Boolean(filter.trainerType) ||
    Boolean(filter.energyType) ||
    Boolean(filter.stage) ||
    filter.isEx !== undefined ||
    filter.hpMin !== undefined ||
    Boolean(filter.setCodes);

  if (!hasStructured) {
    filter.textFallback = normalized.slice(0, 100);
  }

  return filter;
}
