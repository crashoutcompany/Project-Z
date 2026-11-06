import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  formatShinedust,
  getRarityInfo,
  getShinedustCost,
  RARITY_CODES,
  RARITY_ICON_SRC,
} from "./rarity";

describe("rarity display", () => {
  it("maps stored codes to names and symbols", () => {
    expect(getRarityInfo("C")).toMatchObject({ name: "Common", symbol: "◊" });
    expect(getRarityInfo("RR")).toMatchObject({
      name: "Double Rare",
      symbol: "◊◊◊◊",
    });
  });

  it("falls back for unknown codes", () => {
    expect(getRarityInfo("XYZ").name).toBe("XYZ");
    expect(getRarityInfo("XYZ").mark).toBeNull();
  });

  it("draws each rarity with the official Pocket mark", () => {
    expect(getRarityInfo("C").mark).toEqual({ icon: "diamond", count: 1 });
    expect(getRarityInfo("RR").mark).toEqual({ icon: "diamond", count: 4 });
    expect(getRarityInfo("SR").mark).toEqual({ icon: "star", count: 2 });
    expect(getRarityInfo("IM").mark).toEqual({ icon: "star", count: 3 });
    expect(getRarityInfo("SSR").mark).toEqual({ icon: "shiny", count: 2 });
    expect(getRarityInfo("UR").mark).toEqual({ icon: "crown", count: 1 });
    expect(getRarityInfo("PROMO").mark).toBeNull();
    // Every mark except promos is drawn, and every icon ships in public/.
    for (const code of RARITY_CODES.filter((c) => c !== "PROMO")) {
      expect(getRarityInfo(code).mark).not.toBeNull();
    }
    for (const src of Object.values(RARITY_ICON_SRC)) {
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
  });
});

describe("Shinedust cost", () => {
  it("is 0 for 1–2 diamond and scales for higher tradeable rarities", () => {
    expect(getShinedustCost("C", true)).toBe(0);
    expect(getShinedustCost("U", true)).toBe(0);
    expect(getShinedustCost("R", true)).toBe(1_200);
    expect(getShinedustCost("RR", true)).toBe(5_000);
    expect(getShinedustCost("AR", true)).toBe(4_000);
    expect(getShinedustCost("SR", true)).toBe(25_000);
    expect(getShinedustCost("S", true)).toBe(10_000);
    expect(getShinedustCost("SSR", true)).toBe(30_000);
  });

  it("is null when the print is not tradeable", () => {
    expect(getShinedustCost("C", false)).toBeNull();
    expect(getShinedustCost("IM", true)).toBeNull();
    expect(getShinedustCost("UR", true)).toBeNull();
    expect(getShinedustCost("PROMO", true)).toBeNull();
  });

  it("formats with thousands separators", () => {
    expect(formatShinedust(0)).toBe("0");
    expect(formatShinedust(1_200)).toBe("1,200");
    expect(formatShinedust(25_000)).toBe("25,000");
  });
});
