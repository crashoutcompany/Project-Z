import { describe, it, expect } from "vitest";
import { parseCardId, getSetInfo } from "../lib/set-map";
import {
  blobPathname,
  cardImageKey,
  deriveImageUrl,
  fullSizeUrl,
  resolveCardImageUrls,
} from "../lib/image-url";
import { normalizeRarity } from "../lib/rarity-map";

describe("set-map and card id parsing", () => {
  it("parses standard set codes", () => {
    const res = parseCardId("A1-1");
    expect(res).toEqual({ setCode: "A1", number: 1 });
  });

  it("parses hyphenated set codes like P-A and P-B", () => {
    const promoA = parseCardId("P-A-12");
    expect(promoA).toEqual({ setCode: "P-A", number: 12 });

    const promoB = parseCardId("P-B-3");
    expect(promoB).toEqual({ setCode: "P-B", number: 3 });
  });

  it("throws on invalid card_id format", () => {
    expect(() => parseCardId("invalid")).toThrow(/Invalid card_id format/);
  });

  it("retrieves canonical set info", () => {
    const set = getSetInfo("A1a");
    expect(set.name).toBe("Mythical Island");
    expect(set.code).toBe("A1a");
  });

  it("throws on unknown set code", () => {
    expect(() => getSetInfo("UNKNOWN")).toThrow(/Unknown set code/);
  });
});

describe("image-url derivation", () => {
  it("pads numbers and derives small Limitless URL", () => {
    const url = deriveImageUrl("A1", 1);
    expect(url).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_001_EN_SM.webp"
    );

    const urlPromo = deriveImageUrl("P-A", 12);
    expect(urlPromo).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/P-A/P-A_012_EN_SM.webp"
    );
  });

  it("builds a stable Blob pathname from set code and number", () => {
    expect(blobPathname("A1", 1)).toBe("pocket/A1/A1_001_EN_SM.webp");
    expect(blobPathname("P-A", 12)).toBe("pocket/P-A/P-A_012_EN_SM.webp");
  });

  it("throws when uploads are requested without a Blob token", async () => {
    const previous = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    try {
      await expect(
        resolveCardImageUrls([{ setCode: "A1", number: 1 }])
      ).rejects.toThrow(/BLOB_READ_WRITE_TOKEN is not set/);
    } finally {
      if (previous === undefined) {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      } else {
        process.env.BLOB_READ_WRITE_TOKEN = previous;
      }
    }
  });

  it("falls back to source URLs on dry-run when Blob token is missing", async () => {
    const previous = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    try {
      const { urls, uploaded, reused } = await resolveCardImageUrls(
        [{ setCode: "A1", number: 1 }],
        { skipUpload: true }
      );
      expect(uploaded).toBe(0);
      expect(reused).toBe(0);
      expect(urls.get(cardImageKey("A1", 1))).toBe(deriveImageUrl("A1", 1));
    } finally {
      if (previous === undefined) {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      } else {
        process.env.BLOB_READ_WRITE_TOKEN = previous;
      }
    }
  });

  it("derives full-size URL by removing _SM suffix", () => {
    const sm = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_001_EN_SM.webp";
    expect(fullSizeUrl(sm)).toBe(
      "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/A1/A1_001_EN.webp"
    );
  });
});

describe("rarity normalization and tradeability", () => {
  it("maps diamond rarities correctly", () => {
    expect(normalizeRarity("◊")).toEqual({ rarityCode: "C", isTradeable: true });
    expect(normalizeRarity("◊◊◊◊")).toEqual({ rarityCode: "RR", isTradeable: true });
  });

  it("marks immersive, crown rare, and promo as non-tradeable", () => {
    expect(normalizeRarity("☆☆☆")).toEqual({ rarityCode: "IM", isTradeable: false });
    expect(normalizeRarity("Crown Rare")).toEqual({ rarityCode: "UR", isTradeable: false });
    expect(normalizeRarity("P")).toEqual({ rarityCode: "PROMO", isTradeable: false });
  });
});
