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
import { tagAttack, tagEffect } from "./lib/tagger";

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

    const BATCH = 200;
    const ops = [
      ...attackUpdates.map((u) => prisma.attack.update({ where: { id: u.id }, data: { tags: u.after } })),
      ...effectUpdates.map((u) => prisma.cardEffect.update({ where: { id: u.id }, data: { tags: u.after } })),
    ];
    for (let i = 0; i < ops.length; i += BATCH) {
      await prisma.$transaction(ops.slice(i, i + BATCH));
    }
    console.log(`Updated ${ops.length} rows.`);
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
