import type { FilterJSON } from "./filter-schema";

/** How UI-picked tags combine: every tag ("all") or at least one ("any"). */
export type TagMode = "all" | "any";

/** Every tag the parsed filter asks for, deduplicated, in first-seen order. */
export function filterTags(filter: FilterJSON): string[] {
  const tags = new Set<string>();
  for (const t of filter.attack?.tags ?? []) tags.add(t);
  for (const t of filter.effect?.tags ?? []) tags.add(t);
  for (const branch of filter.anyOf ?? []) {
    for (const t of branch.attack?.tags ?? []) tags.add(t);
    for (const t of branch.effect?.tags ?? []) tags.add(t);
  }
  return [...tags];
}

function without<T extends { tags?: string[] }>(
  part: T | undefined,
  drop: Set<string>,
): T | undefined {
  if (!part?.tags) return part;
  const next: T = { ...part, tags: part.tags.filter((t) => !drop.has(t)) };
  if (!next.tags?.length) delete next.tags;
  return Object.keys(next).length ? next : undefined;
}

/**
 * Removes tags from a parsed filter, for when the user dismisses a tag that
 * came from their typed query. Attack/effect clauses and anyOf branches left
 * with no constraints are dropped rather than matching everything.
 */
export function withoutTags(filter: FilterJSON, tags: string[]): FilterJSON {
  if (!tags.length) return filter;
  const drop = new Set(tags);
  const { attack, effect, anyOf, ...rest } = filter;
  const next: FilterJSON = { ...rest };

  const a = without(attack, drop);
  const e = without(effect, drop);
  if (a) next.attack = a;
  if (e) next.effect = e;

  if (anyOf) {
    const branches = anyOf
      .map((b) => {
        const ba = without(b.attack, drop);
        const be = without(b.effect, drop);
        return ba || be ? { ...(ba && { attack: ba }), ...(be && { effect: be }) } : null;
      })
      .filter((b) => b !== null);
    if (branches.length) next.anyOf = branches;
  }
  return next;
}
