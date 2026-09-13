import fs from "node:fs";
import path from "node:path";
import prisma from "../prisma/db";
import { SourcePayloadSchema, type SourceCard } from "./lib/source-schema";
import { SET_MAP, getSetInfo, parseCardId } from "./lib/set-map";
import { normalizeRarity } from "./lib/rarity-map";
import { deriveImageUrl } from "./lib/image-url";
import { normalizeCard, type NormalizedCard } from "./lib/normalize";
import { tagAttack, tagEffect } from "./lib/tagger";

export const PINNED_COMMIT_SHA = "dc4a37d4fb7978265a27836b893d8f8b3aabee56";
export const SOURCE_URL = `https://raw.githubusercontent.com/marcelpanse/tcg-pocket-collection-tracker/${PINNED_COMMIT_SHA}/frontend/assets/cards.json`;

interface ImportStats {
  setsTouched: number;
  cardsCreated: number;
  cardsUpdated: number;
  cardsUnchanged: number;
  cardsOnlyInDb: number;
  perSetCounts: Record<string, { source: number; db: number }>;
  attacksCount: number;
  effectsCount: number;
  attacksWithZeroTags: number;
  tagFrequency: Record<string, number>;
}

async function loadSourceData(): Promise<SourceCard[]> {
  const localCachePath = path.resolve(__dirname, "cache", "cards.json");
  let jsonString: string | null = null;

  try {
    const res = await fetch(SOURCE_URL);
    if (res.ok) {
      jsonString = await res.text();
    }
  } catch (err) {
    // Network fetch failed, try local cache
  }

  if (!jsonString && fs.existsSync(localCachePath)) {
    console.log(`Using cached source data from ${localCachePath}`);
    jsonString = fs.readFileSync(localCachePath, "utf8");
  }

  if (!jsonString) {
    throw new Error(
      `Failed to fetch card payload from ${SOURCE_URL} and no local cache found at ${localCachePath}.`
    );
  }

  const parsedJson = JSON.parse(jsonString);
  const validated = SourcePayloadSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.error("Source payload validation failed:", validated.error.issues.slice(0, 5));
    throw new Error("Source payload failed Zod schema validation.");
  }

  return validated.data;
}

export async function runImport(options: { dryRun?: boolean } = {}) {
  const { dryRun = false } = options;
  console.log(`\n======================================================`);
  console.log(`🚀 Starting Card Import Pipeline ${dryRun ? "(DRY RUN)" : ""}`);
  console.log(`Pinned commit: ${PINNED_COMMIT_SHA}`);
  console.log(`======================================================\n`);

  const sourceCards = await loadSourceData();
  console.log(`Loaded and validated ${sourceCards.length} cards from source payload.\n`);

  const stats: ImportStats = {
    setsTouched: 0,
    cardsCreated: 0,
    cardsUpdated: 0,
    cardsUnchanged: 0,
    cardsOnlyInDb: 0,
    perSetCounts: {},
    attacksCount: 0,
    effectsCount: 0,
    attacksWithZeroTags: 0,
    tagFrequency: {},
  };

  // 1. Ensure Sets exist in DB
  const setCodeToDbId = new Map<string, number>();
  const dbSets = await prisma.set.findMany();
  for (const set of dbSets) {
    setCodeToDbId.set(set.code, set.id);
  }

  for (const [code, info] of Object.entries(SET_MAP)) {
    if (!setCodeToDbId.has(code)) {
      if (!dryRun) {
        const created = await prisma.set.create({
          data: {
            code: info.code,
            setName: info.name,
            image: `/images/sets/${info.code.toLowerCase()}.png`,
            releaseDate: info.releaseDate ? new Date(info.releaseDate) : null,
          },
        });
        setCodeToDbId.set(code, created.id);
      } else {
        setCodeToDbId.set(code, -1);
      }
    }
  }

  stats.setsTouched = Object.keys(SET_MAP).length;

  // 2. Fetch all existing cards in DB for diffing
  const existingCards = await prisma.card.findMany({
    select: {
      id: true,
      setId: true,
      number: true,
      name: true,
      imageUrl: true,
      rarity: true,
      hp: true,
      weakness: true,
      retreatCost: true,
    },
  });

  const existingCardMap = new Map<string, typeof existingCards[0]>();
  for (const c of existingCards) {
    existingCardMap.set(`${c.setId}-${c.number}`, c);
  }

  // Count source cards per set
  for (const card of sourceCards) {
    const { setCode } = parseCardId(card.card_id);
    if (!stats.perSetCounts[setCode]) {
      stats.perSetCounts[setCode] = { source: 0, db: 0 };
    }
    stats.perSetCounts[setCode].source++;
  }

  const sourceCardKeySet = new Set<string>();

  // 3. Process cards
  for (const sourceCard of sourceCards) {
    const { setCode, number } = parseCardId(sourceCard.card_id);
    const setId = setCodeToDbId.get(setCode);
    if (!setId) {
      throw new Error(`Unmapped set code: ${setCode} for card ${sourceCard.card_id}`);
    }

    const key = `${setId}-${number}`;
    sourceCardKeySet.add(key);

    const derivedImageUrl = deriveImageUrl(setCode, number);
    const normalizedRarity = normalizeRarity(sourceCard.rarity);
    const normalized = normalizeCard(sourceCard, derivedImageUrl, normalizedRarity, number);

    // Compute tags & tag frequencies
    for (const atk of normalized.attacks) {
      stats.attacksCount++;
      const tags = tagAttack(atk);
      if (tags.length === 0) {
        stats.attacksWithZeroTags++;
      }
      for (const t of tags) {
        stats.tagFrequency[t] = (stats.tagFrequency[t] || 0) + 1;
      }
    }

    for (const eff of normalized.effects) {
      stats.effectsCount++;
      const tags = tagEffect(eff.effectText, eff.kind);
      for (const t of tags) {
        stats.tagFrequency[t] = (stats.tagFrequency[t] || 0) + 1;
      }
    }

    const existing = existingCardMap.get(key);
    if (!existing) {
      stats.cardsCreated++;
    } else {
      const isUnchanged =
        existing.name === normalized.name &&
        existing.imageUrl === normalized.imageUrl &&
        existing.rarity === normalized.rarity &&
        existing.hp === normalized.hp &&
        existing.weakness === normalized.weakness &&
        existing.retreatCost === normalized.retreatCost;

      if (isUnchanged) {
        stats.cardsUnchanged++;
      } else {
        stats.cardsUpdated++;
      }
    }

    stats.perSetCounts[setCode].db++;

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        const cardRecord = await tx.card.upsert({
          where: {
            setId_number: {
              setId,
              number,
            },
          },
          update: {
            name: normalized.name,
            cardType: normalized.cardType,
            imageUrl: normalized.imageUrl,
            rarity: normalized.rarity,
            isTradeable: normalized.isTradeable,
            pack: normalized.pack,
            energyType: normalized.energyType,
            hp: normalized.hp,
            stage: normalized.stage,
            isEx: normalized.isEx,
            isBaby: normalized.isBaby,
            weakness: normalized.weakness,
            retreatCost: normalized.retreatCost,
            trainerType: normalized.trainerType,
          },
          create: {
            setId,
            number,
            name: normalized.name,
            cardType: normalized.cardType,
            imageUrl: normalized.imageUrl,
            rarity: normalized.rarity,
            isTradeable: normalized.isTradeable,
            pack: normalized.pack,
            energyType: normalized.energyType,
            hp: normalized.hp,
            stage: normalized.stage,
            isEx: normalized.isEx,
            isBaby: normalized.isBaby,
            weakness: normalized.weakness,
            retreatCost: normalized.retreatCost,
            trainerType: normalized.trainerType,
          },
        });

        // Replace attacks
        await tx.attack.deleteMany({ where: { cardId: cardRecord.id } });
        if (normalized.attacks.length > 0) {
          await tx.attack.createMany({
            data: normalized.attacks.map((atk) => ({
              cardId: cardRecord.id,
              position: atk.position,
              name: atk.name,
              damageRaw: atk.damageRaw,
              damageBase: atk.damageBase,
              damageKind: atk.damageKind,
              energyCost: atk.energyCost,
              energyTypes: atk.energyTypes,
              effectText: atk.effectText,
              tags: tagAttack(atk),
            })),
          });
        }

        // Replace effects
        await tx.cardEffect.deleteMany({ where: { cardId: cardRecord.id } });
        if (normalized.effects.length > 0) {
          await tx.cardEffect.createMany({
            data: normalized.effects.map((eff) => ({
              cardId: cardRecord.id,
              kind: eff.kind,
              name: eff.name,
              effectText: eff.effectText,
              tags: tagEffect(eff.effectText, eff.kind),
            })),
          });
        }
      });
    }
  }

  // Count cards only in DB
  for (const [key] of existingCardMap.entries()) {
    if (!sourceCardKeySet.has(key)) {
      stats.cardsOnlyInDb++;
    }
  }

  // 4. Print Report
  console.log(`------------------------------------------------------`);
  console.log(`📊 IMPORT SUMMARY REPORT:`);
  console.log(`------------------------------------------------------`);
  console.log(`Sets Touched:           ${stats.setsTouched}`);
  console.log(`Cards Created:          ${stats.cardsCreated}`);
  console.log(`Cards Updated:          ${stats.cardsUpdated}`);
  console.log(`Cards Unchanged:        ${stats.cardsUnchanged}`);
  console.log(`Cards Only in DB:       ${stats.cardsOnlyInDb}`);
  console.log(`Total Attacks Processed:${stats.attacksCount}`);
  console.log(`Attacks with 0 tags:    ${stats.attacksWithZeroTags}`);
  console.log(`Total Effects Processed:${stats.effectsCount}`);

  console.log(`\nPer-Set Card Counts (Source vs Processed):`);
  let hasCountMismatch = false;
  for (const [code, counts] of Object.entries(stats.perSetCounts).sort()) {
    const match = counts.source === counts.db;
    if (!match) hasCountMismatch = true;
    console.log(
      `  ${code.padEnd(5)}: Source=${String(counts.source).padStart(4)} | Processed=${String(counts.db).padStart(4)} ${match ? "✓" : "❌ MISMATCH"}`
    );
  }

  console.log(`\nTop Tags Distribution:`);
  const sortedTags = Object.entries(stats.tagFrequency).sort((a, b) => b[1] - a[1]);
  for (const [tag, count] of sortedTags.slice(0, 10)) {
    console.log(`  ${tag.padEnd(22)}: ${count}`);
  }

  console.log(`\n======================================================`);
  if (hasCountMismatch) {
    console.error(`❌ ERROR: Set count mismatch detected! Aborting with exit code 1.`);
    process.exit(1);
  } else {
    console.log(`✅ SUCCESS: Card import completed cleanly without mismatches.`);
  }
}

// CLI entry point
if (require.main === module || process.argv[1]?.endsWith("import-cards.ts")) {
  const isDryRun = process.argv.includes("--dry-run");
  runImport({ dryRun: isDryRun })
    .catch((err) => {
      console.error("❌ Fatal error in import-cards:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
