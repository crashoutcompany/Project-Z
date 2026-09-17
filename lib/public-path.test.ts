import { describe, expect, it } from "vitest";
import { isPublicPath, shouldBypassAuth } from "./public-path";

describe("isPublicPath", () => {
  it("allows the marketing home, sign-in, API, and static assets", () => {
    expect(isPublicPath("/")).toBe(true);
    expect(isPublicPath("/signin")).toBe(true);
    expect(isPublicPath("/api/search")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/back.png")).toBe(true);
  });

  it("requires a session for app routes", () => {
    expect(isPublicPath("/dex")).toBe(false);
    expect(isPublicPath("/builder")).toBe(false);
    expect(isPublicPath("/trading")).toBe(false);
    expect(isPublicPath("/me")).toBe(false);
    expect(isPublicPath("/signin/extra")).toBe(false);
  });
});

describe("shouldBypassAuth", () => {
  it("is off unless E2E_AUTH_BYPASS=1", () => {
    expect(shouldBypassAuth({})).toBe(false);
    expect(shouldBypassAuth({ E2E_AUTH_BYPASS: "0" })).toBe(false);
    expect(shouldBypassAuth({ E2E_AUTH_BYPASS: "1" })).toBe(true);
  });
});
