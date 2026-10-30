import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SourcePayloadSchema } from "../lib/source-schema";
import { SET_MAP, parseCardId } from "../lib/set-map";
import { SEED_CARDS_PER_SET } from "../lib/sample-cards";

describe("seed cards-sample payload", () => {
  it("parses and keeps at most SEED_CARDS_PER_SET cards per mapped set", () => {
    const seedPath = path.resolve(__dirname, "../seed/cards-sample.json");
    const cards = SourcePayloadSchema.parse(
      JSON.parse(fs.readFileSync(seedPath, "utf8"))
    );
    expect(cards.length).toBeGreaterThan(0);

    const counts: Record<string, number> = {};
    for (const card of cards) {
      const { setCode } = parseCardId(card.card_id);
      expect(SET_MAP[setCode]).toBeDefined();
      // Dual-type cards are always kept on top of the per-set limit.
      if (card.secondary_energy) continue;
      counts[setCode] = (counts[setCode] || 0) + 1;
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeLessThanOrEqual(SEED_CARDS_PER_SET);
    }
  });

  it("includes the newest sets and a dual-type card", () => {
    const seedPath = path.resolve(__dirname, "../seed/cards-sample.json");
    const cards = SourcePayloadSchema.parse(
      JSON.parse(fs.readFileSync(seedPath, "utf8"))
    );
    const sets = new Set(cards.map((c) => parseCardId(c.card_id).setCode));
    for (const code of ["B4b", "C1", "P-C"]) expect(sets.has(code)).toBe(true);
    expect(cards.some((c) => c.secondary_energy)).toBe(true);
  });
});
