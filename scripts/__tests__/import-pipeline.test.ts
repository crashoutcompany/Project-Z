import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SourcePayloadSchema, type SourceCard } from "../lib/source-schema";
import { SET_MAP, getSetInfo, parseCardId } from "../lib/set-map";
import { normalizeRarity } from "../lib/rarity-map";
import { deriveImageUrl } from "../lib/image-url";
import { normalizeCard } from "../lib/normalize";
import { tagAttack, tagEffect } from "../lib/tagger";

describe("import pipeline end-to-end payload test", () => {
  const cachePath = path.resolve(__dirname, "../cache/cards.json");
  const hasCache = fs.existsSync(cachePath);

  it.skipIf(!hasCache)(
    "successfully parses, normalizes, and tags all 3879 cards from source payload",
    () => {

    const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const validated = SourcePayloadSchema.parse(raw);
    expect(validated.length).toBe(3879);

    const setCounts: Record<string, number> = {};
    let totalAttacks = 0;
    let totalEffects = 0;
    let attacksWithZeroTags = 0;

    for (const card of validated) {
      const { setCode, number } = parseCardId(card.card_id);
      expect(number).toBeGreaterThan(0);

      // Verify set exists
      const setInfo = getSetInfo(setCode);
      expect(setInfo.code).toBe(setCode);

      setCounts[setCode] = (setCounts[setCode] || 0) + 1;

      const imageUrl = deriveImageUrl(setCode, number);
      expect(imageUrl).toMatch(
        /^https:\/\/limitlesstcg\.nyc3\.cdn\.digitaloceanspaces\.com\/pocket\//
      );

      const rarity = normalizeRarity(card.rarity);
      expect(typeof rarity.rarityCode).toBe("string");

      const normalized = normalizeCard(card, imageUrl, rarity, number);
      expect(normalized.number).toBe(number);
      expect(normalized.imageUrl).toBe(imageUrl);

      for (const atk of normalized.attacks) {
        totalAttacks++;
        const tags = tagAttack(atk);
        if (tags.length === 0) attacksWithZeroTags++;
      }

      for (const eff of normalized.effects) {
        totalEffects++;
        const tags = tagEffect(eff.effectText, eff.kind);
        expect(Array.isArray(tags)).toBe(true);
      }
    }

    // Verify all 23 sets were present and accounted for
    expect(Object.keys(setCounts).sort()).toEqual(Object.keys(SET_MAP).sort());
    expect(totalAttacks).toBeGreaterThan(3000);
    expect(totalEffects).toBeGreaterThan(500);
  },
  );
});
