import { describe, expect, it } from "vitest";
import { buildDexCardPath, parseDexCardParam } from "./dex-url";

describe("parseDexCardParam", () => {
  it("parses set/number refs including hyphenated set codes", () => {
    expect(parseDexCardParam("A1-94")).toEqual({
      setCode: "A1",
      number: 94,
      ref: "A1-94",
    });
    expect(parseDexCardParam(" P-A-12 ")).toEqual({
      setCode: "P-A",
      number: 12,
      ref: "P-A-12",
    });
  });

  it("returns null for missing or invalid refs", () => {
    expect(parseDexCardParam(undefined)).toBeNull();
    expect(parseDexCardParam("")).toBeNull();
    expect(parseDexCardParam("not-a-ref")).toBeNull();
    expect(parseDexCardParam("A1")).toBeNull();
  });
});

describe("buildDexCardPath", () => {
  it("builds a Dex deep-link with set and card", () => {
    expect(buildDexCardPath("A1", "A1-94")).toBe("/dex?set=A1&card=A1-94");
    expect(buildDexCardPath("P-A", "P-A-12")).toBe("/dex?set=P-A&card=P-A-12");
  });
});
