/**
 * Recompute Attack.tags and CardEffect.tags from the text already stored in
 * the database. Lighter than `pnpm import:cards --full`: no source fetch, no
 * image uploads, and only rows whose tags actually change are written.
 *
 *   pnpm exec tsx scripts/retag.ts                          # dry run (default)
 *   pnpm exec tsx scripts/retag.ts --write --host=<db-host> # apply
 *
 * --write requires --host to repeat the database host printed by the dry run,
 * so a stray DATABASE_URL cannot be retagged by accident.
 */
import { DamageKind, EffectKind } from "../prisma/generated/client/client";
import { tagAttack, tagEffect } from "../lib/search/tagger";

export type AttackRow = {
  id: number;
  effectText: string;
  damageKind: DamageKind;
  energyCost: number;
  tags: string[];
};
export type EffectRow = {
  id: number;
  effectText: string;
  kind: EffectKind;
  tags: string[];
};
export type RetagUpdate = { id: number; before: string[]; after: string[] };

function sameTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((t) => set.has(t));
}

/** Pure: which rows change, and to what. */
export function planRetag(attacks: AttackRow[], effects: EffectRow[]) {
  const attackUpdates: RetagUpdate[] = [];
  for (const a of attacks) {
    const after = tagAttack(a);
    if (!sameTags(a.tags, after)) attackUpdates.push({ id: a.id, before: a.tags, after });
  }
  const effectUpdates: RetagUpdate[] = [];
  for (const e of effects) {
    const after = tagEffect(e.effectText, e.kind);
    if (!sameTags(e.tags, after)) effectUpdates.push({ id: e.id, before: e.tags, after });
  }
  return { attackUpdates, effectUpdates };
}

/**
 * Pure: bucket updates by their new tag list so each bucket is one
 * `updateMany`. A few hundred distinct tag lists cover thousands of rows.
 */
export function groupByTags(updates: RetagUpdate[], chunkSize = 1000) {
  const buckets = new Map<string, { tags: string[]; ids: number[] }>();
  for (const u of updates) {
    const tags = [...u.after].sort();
    const key = JSON.stringify(tags);
    const bucket = buckets.get(key) ?? { tags, ids: [] };
    bucket.ids.push(u.id);
    buckets.set(key, bucket);
  }
  const groups: Array<{ tags: string[]; ids: number[] }> = [];
  for (const { tags, ids } of buckets.values()) {
    for (let i = 0; i < ids.length; i += chunkSize) {
      groups.push({ tags, ids: ids.slice(i, i + chunkSize) });
    }
  }
  return groups;
}

function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const write = process.argv.includes("--write");
  const confirmedHost = process.argv.find((a) => a.startsWith("--host="))?.slice(7);
  const { default: prisma } = await import("../prisma/db");
  const host = databaseHost();
  console.log(`Database host: ${host}`);
  if (write && confirmedHost !== host) {
    throw new Error(`--write needs --host=${host} to confirm the target database.`);
  }

  try {
    const [attacks, effects] = await Promise.all([
      prisma.attack.findMany({
        select: { id: true, effectText: true, damageKind: true, energyCost: true, tags: true },
      }),
      prisma.cardEffect.findMany({
        select: { id: true, effectText: true, kind: true, tags: true },
      }),
    ]);
    const { attackUpdates, effectUpdates } = planRetag(attacks, effects);
    console.log(
      `${attackUpdates.length}/${attacks.length} attacks and ${effectUpdates.length}/${effects.length} effects would change.`,
    );
    if (!write) {
      console.log("Dry run; pass --write --host=<host> to apply.");
      return;
    }

    // No wrapping transaction: over the Neon adapter a batch of single-row
    // updates outlives Prisma's 5s interactive-transaction timeout. Each
    // updateMany is atomic, and a rerun is safe because tags are recomputed
    // from the stored text and only rows that still differ are written.
    let updated = 0;
    for (const { tags, ids } of groupByTags(attackUpdates)) {
      updated += (await prisma.attack.updateMany({ where: { id: { in: ids } }, data: { tags } })).count;
    }
    for (const { tags, ids } of groupByTags(effectUpdates)) {
      updated += (await prisma.cardEffect.updateMany({ where: { id: { in: ids } }, data: { tags } })).count;
    }
    console.log(`Updated ${updated} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("retag.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
