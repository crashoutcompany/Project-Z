import { describe, expect, it } from "vitest";
import { ENERGY_TYPES } from "@/lib/search/tags";
import { TYPE_INFO, isEnergyType, typeLabel } from "./type-info";

describe("type-info", () => {
  it("describes every energy type", () => {
    expect(Object.keys(TYPE_INFO).sort()).toEqual([...ENERGY_TYPES].sort());
  });

  it("recognises energy types but not inherited keys", () => {
    expect(isEnergyType("grass")).toBe(true);
    expect(isEnergyType("fairy")).toBe(false);
    expect(isEnergyType("toString")).toBe(false);
  });

  it("labels known types and passes unknown ones through", () => {
    expect(typeLabel("lightning")).toBe("Lightning");
    expect(typeLabel("fairy")).toBe("fairy");
  });
});
