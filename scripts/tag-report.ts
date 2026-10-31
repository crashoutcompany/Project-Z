/**
 * Offline tag report: runs the tagger over a cards.json payload and prints
 * per-tag counts. Never touches the database.
 *
 *   pnpm exec tsx scripts/tag-report.ts [path/to/cards.json] [--json] [--examples=tag]
 *
 * Counts are unique (card name + text) entries, so reprints count once. This
 * matches how docs/tag-audit.md was measured.
 */
import fs from "node:fs";
import { SourcePayloadSchema } from "./lib/source-schema";
import { normalizeCard } from "./lib/normalize";
import { tagAttack, tagEffect } from "../lib/search/tagger";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? "scripts/cache/cards.json";
const asJson = args.includes("--json");
const examplesFor = args.find((a) => a.startsWith("--examples="))?.slice(11);

const cards = SourcePayloadSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));

const attackCounts: Record<string, number> = {};
const effectCounts: Record<string, number> = {};
const examples: string[] = [];
const seenAttacks = new Set<string>();
const seenEffects = new Set<string>();

for (const source of cards) {
  const card = normalizeCard(source, "", { rarityCode: "C", isTradeable: true }, 0);
  for (const atk of card.attacks) {
    const key = `${card.name}|${atk.effectText}`;
    if (seenAttacks.has(key)) continue;
    seenAttacks.add(key);
    const tags = tagAttack(atk);
    for (const t of tags) attackCounts[t] = (attackCounts[t] ?? 0) + 1;
    if (examplesFor && (tags as string[]).includes(examplesFor)) {
      examples.push(`[attack] ${card.name} / ${atk.name}: ${atk.effectText}`);
    }
  }
  for (const eff of card.effects) {
    const key = `${card.name}|${eff.effectText}`;
    if (seenEffects.has(key)) continue;
    seenEffects.add(key);
    const tags = tagEffect(eff.effectText, eff.kind);
    for (const t of tags) effectCounts[t] = (effectCounts[t] ?? 0) + 1;
    if (examplesFor && (tags as string[]).includes(examplesFor)) {
      examples.push(`[effect] ${card.name}: ${eff.effectText}`);
    }
  }
}

if (examplesFor) {
  console.log(examples.join("\n"));
} else if (asJson) {
  console.log(JSON.stringify({ attack: attackCounts, effect: effectCounts }, null, 2));
} else {
  console.log(`${seenAttacks.size} unique attacks, ${seenEffects.size} unique effects\n`);
  const tags = [...new Set([...Object.keys(attackCounts), ...Object.keys(effectCounts)])].sort();
  console.log(`${"tag".padEnd(22)} attacks  effects`);
  for (const t of tags) {
    console.log(
      `${t.padEnd(22)} ${String(attackCounts[t] ?? 0).padStart(7)}  ${String(effectCounts[t] ?? 0).padStart(7)}`,
    );
  }
}
