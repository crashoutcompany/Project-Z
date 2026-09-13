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
  if (/\bability\b/.test(normalized)) addAttack("ability_interaction");

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

  const costExact = normalized.match(
    /\b(?:costs?|with)\s+(\d)\s+energy\b|\b(\d)\s+energy\b/,
  );
  const costNum = costExact ? Number(costExact[1] ?? costExact[2]) : undefined;

  const typedCount = normalized.match(
    /\b(single|double|triple|1|2|3)\s+(grass|fire|water|lightning|psychic|fighting|darkness|metal|dragon|colorless)\b/,
  );

  const damageMinMatch = normalized.match(/\b(\d{2,3})\s*\+?\b/);

  if (
    attackTags.length ||
    costNum !== undefined ||
    typedCount ||
    (damageMinMatch && /\b(damage|attack|energy|\+)\b/.test(normalized))
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
    if (damageMinMatch && /\b(damage|attack|energy|\+)\b/.test(normalized)) {
      filter.attack.damageMin = Number(damageMinMatch[1]);
    }
    if (/\bplus\b|\bmore damage\b/.test(normalized)) {
      filter.attack.damageKind = "PLUS";
    } else if (/\bscal/.test(normalized)) {
      filter.attack.damageKind = "SCALING";
    }
  }

  if (effectTags.length) {
    filter.effect = {
      tags: effectTags as NonNullable<FilterJSON["effect"]>["tags"],
      ...(filter.trainerType ? { kind: "TRAINER" as const } : {}),
    };
  }

  if (filter.attack && !filter.effect && filter.surface === "any") {
    filter.surface = "attack";
  } else if (filter.effect && !filter.attack && filter.surface === "any") {
    filter.surface = "effect";
  }

  if (!filter.attack && !filter.effect && !filter.anyOf) {
    filter.textFallback = normalized.slice(0, 100);
  }

  const hp = normalized.match(/\b(?:at least\s+)?(\d{2,3})\s*hp\b/);
  if (hp) filter.hpMin = Number(hp[1]);

  return filter;
}
