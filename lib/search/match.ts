import type { AttackFilter, EffectFilter, FilterJSON } from "./filter-schema";

/**
 * Pure JS mirror of the Prisma `attackWhere` / `effectWhere` / clause logic in
 * execute-search.ts. It exists because Prisma cannot count duplicate members
 * of a text[] column, so `energyTypeCounts` ("double fire" => two fire
 * symbols) has to be enforced after the DB prefilter. Keep in lockstep with
 * the Prisma builders.
 */

export type AttackRow = {
  tags: string[];
  damageBase: number | null;
  damageKind: string;
  energyCost: number;
  energyTypes: string[];
};

export type EffectRow = { tags: string[]; kind: string };

export function attackMatches(f: AttackFilter, a: AttackRow): boolean {
  if (f.tags?.length && !f.tags.every((t) => a.tags.includes(t))) return false;
  if (f.energyCost !== undefined) {
    if (a.energyCost !== f.energyCost) return false;
  } else {
    if (f.energyCostMin !== undefined && a.energyCost < f.energyCostMin) {
      return false;
    }
    if (f.energyCostMax !== undefined && a.energyCost > f.energyCostMax) {
      return false;
    }
  }
  if (f.damageMin !== undefined) {
    if (a.damageBase === null || a.damageBase < f.damageMin) return false;
  }
  if (f.damageKind && a.damageKind !== f.damageKind) return false;
  if (f.energyTypeCounts) {
    for (const [type, wanted] of Object.entries(f.energyTypeCounts)) {
      let have = 0;
      for (const t of a.energyTypes) if (t === type) have++;
      if (have < wanted) return false;
    }
  }
  return true;
}

export function effectMatches(f: EffectFilter, e: EffectRow): boolean {
  if (f.kind && e.kind !== f.kind) return false;
  if (f.tags?.length && !f.tags.every((t) => e.tags.includes(t))) return false;
  return true;
}

export function hasEnergyTypeCounts(filter: FilterJSON): boolean {
  if (filter.attack?.energyTypeCounts) return true;
  return (filter.anyOf ?? []).some((b) => b.attack?.energyTypeCounts);
}

/** Mirrors the attack/effect/anyOf clause composition of buildCardWhere. */
export function cardMatchesClauses(
  filter: FilterJSON,
  card: { attacks: AttackRow[]; effects: EffectRow[] },
): boolean {
  const attackFilter = filter.attack;
  const effectFilter = filter.effect;

  const attackOk = attackFilter
    ? card.attacks.some((a) => attackMatches(attackFilter, a))
    : null;
  const effectOk = effectFilter
    ? card.effects.some((e) => effectMatches(effectFilter, e))
    : null;

  if (filter.surface === "attack" && attackOk !== null) {
    if (!attackOk) return false;
  } else if (filter.surface === "effect" && effectOk !== null) {
    if (!effectOk) return false;
  } else if (attackOk !== null && effectOk !== null) {
    if (!attackOk && !effectOk) return false;
  } else if (attackOk === false || effectOk === false) {
    return false;
  }

  if (filter.anyOf?.length) {
    const anyBranch = filter.anyOf.some((branch) => {
      const bAttack = branch.attack;
      const bEffect = branch.effect;
      if (!bAttack && !bEffect) return false;
      const a = bAttack
        ? card.attacks.some((row) => attackMatches(bAttack, row))
        : true;
      const e = bEffect
        ? card.effects.some((row) => effectMatches(bEffect, row))
        : true;
      return a && e;
    });
    if (!anyBranch) return false;
  }

  return true;
}
