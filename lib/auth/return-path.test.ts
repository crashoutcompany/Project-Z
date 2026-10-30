import { describe, expect, it } from "vitest";

import {
  AUTH_RETURN_QUERY,
  safeAuthReturnPath,
  signInRedirectUrl,
} from "./return-path";

const SIGN_IN = "/signin";

describe("safeAuthReturnPath", () => {
  it("keeps gated app paths and their query strings", () => {
    expect(safeAuthReturnPath("/builder?v=1&deck=A1-1,A1-94x2", SIGN_IN)).toBe(
      "/builder?v=1&deck=A1-1,A1-94x2",
    );
    expect(safeAuthReturnPath("/dex?set=A1", SIGN_IN)).toBe("/dex?set=A1");
    expect(safeAuthReturnPath("/trading/create", SIGN_IN)).toBe(
      "/trading/create",
    );
  });

  it("rejects open redirects and the sign-in page itself", () => {
    expect(safeAuthReturnPath("https://evil.example/phish", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath("//evil.example", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath("/\\evil.example", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath("/signin", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath("/signin/extra", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath("/signin?next=/builder", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath("", SIGN_IN)).toBeNull();
    expect(safeAuthReturnPath(null, SIGN_IN)).toBeNull();
  });

  it("drops hash fragments and rejects control characters", () => {
    expect(safeAuthReturnPath("/builder?v=1#tray", SIGN_IN)).toBe(
      "/builder?v=1",
    );
    expect(safeAuthReturnPath("/builder\r\n", SIGN_IN)).toBeNull();
  });
});

describe("signInRedirectUrl", () => {
  it("encodes the return path on the sign-in URL", () => {
    const url = signInRedirectUrl(
      "https://example.com/builder?v=1&deck=A1-1",
      SIGN_IN,
      "/builder?v=1&deck=A1-1",
    );

    expect(url.pathname).toBe("/signin");
    expect(url.searchParams.get(AUTH_RETURN_QUERY)).toBe(
      "/builder?v=1&deck=A1-1",
    );
    expect(url.search).toBe(
      `?${AUTH_RETURN_QUERY}=${encodeURIComponent("/builder?v=1&deck=A1-1")}`,
    );
  });

  it("omits next when the return path is unsafe", () => {
    const url = signInRedirectUrl(
      "https://example.com/signin",
      SIGN_IN,
      "//evil.example",
    );
    expect(url.searchParams.get(AUTH_RETURN_QUERY)).toBeNull();
  });
});
