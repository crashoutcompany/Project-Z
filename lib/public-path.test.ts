import { describe, expect, it } from "vitest";
import { isPublicPath, shouldBypassAuth } from "./public-path";

describe("isPublicPath", () => {
  it("allows home, sign-in, and shareable listing URLs", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/signin")).toBe(true);
    expect(isPublicPath("/trading/t/abc123")).toBe(true);
    expect(isPublicPath("/api/search")).toBe(true);
  });

  it("protects the trade board and create/confirm flow", () => {
    expect(isPublicPath("/trading")).toBe(false);
    expect(isPublicPath("/trading/create")).toBe(false);
    expect(isPublicPath("/trading/create/confirm")).toBe(false);
    expect(isPublicPath("/builder")).toBe(false);
  });
});

describe("shouldBypassAuth", () => {
  it("is CI-only when E2E_AUTH_BYPASS=1", () => {
    expect(shouldBypassAuth({ E2E_AUTH_BYPASS: "1" })).toBe(true);
    expect(shouldBypassAuth({ E2E_AUTH_BYPASS: "0" })).toBe(false);
    expect(shouldBypassAuth({})).toBe(false);
  });
});
