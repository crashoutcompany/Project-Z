import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SourcePayloadSchema } from "../lib/source-schema";
import { SET_MAP, parseCardId } from "../lib/set-map";
import { SEED_CARDS_PER_SET, sampleCardsPerSet } from "../lib/sample-cards";

describe("seed cards-sample payload", () => {
  const seedPath = path.resolve(__dirname, "../seed/cards-sample.json");
  const cards = SourcePayloadSchema.parse(JSON.parse(fs.readFileSync(seedPath, "utf8")));

  it("exists and stays within the per-set seed limit", () => {
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(
      Object.keys(SET_MAP).length * SEED_CARDS_PER_SET
    );
    expect(sampleCardsPerSet(cards, SEED_CARDS_PER_SET)).toHaveLength(cards.length);
  });

  it("has at most SEED_CARDS_PER_SET cards per mapped set", () => {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      const { setCode } = parseCardId(card.card_id);
      expect(SET_MAP[setCode]).toBeDefined();
      counts[setCode] = (counts[setCode] || 0) + 1;
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeLessThanOrEqual(SEED_CARDS_PER_SET);
    }
  });
});
