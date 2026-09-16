import { describe, expect, it } from "vitest";
import {
  formatShinedust,
  getRarityInfo,
  getShinedustCost,
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
