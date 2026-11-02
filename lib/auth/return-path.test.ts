import { describe, expect, it } from "vitest";

import {
  AUTH_RETURN_QUERY,
  authCallbackFromSearch,
  authCallbackFromWindow,
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
    expect(
      safeAuthReturnPath("https://evil.example/phish", SIGN_IN),
    ).toBeNull();
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

describe("authCallbackFromSearch", () => {
  it("reads a gated next path from the sign-in query string", () => {
    expect(
      authCallbackFromSearch(
        `?${AUTH_RETURN_QUERY}=${encodeURIComponent("/builder?v=1&deck=A1-1,A1-94x2")}`,
        SIGN_IN,
      ),
    ).toBe("/builder?v=1&deck=A1-1,A1-94x2");
    expect(
      authCallbackFromSearch(
        new URLSearchParams({ [AUTH_RETURN_QUERY]: "/dex?set=A1" }),
        SIGN_IN,
      ),
    ).toBe("/dex?set=A1");
  });

  it("falls back to / when next is missing or unsafe", () => {
    expect(authCallbackFromSearch("", SIGN_IN)).toBe("/");
    expect(authCallbackFromSearch(null, SIGN_IN)).toBe("/");
    expect(
      authCallbackFromSearch(
        `?${AUTH_RETURN_QUERY}=https://evil.example`,
        SIGN_IN,
      ),
    ).toBe("/");
  });
});

describe("authCallbackFromWindow", () => {
  it("prefers an explicit destination over the URL", () => {
    expect(authCallbackFromWindow(SIGN_IN, "/dex", "?next=/builder")).toBe(
      "/dex",
    );
  });

  it("reads next from the provided search string when no explicit value is set", () => {
    expect(
      authCallbackFromWindow(
        SIGN_IN,
        undefined,
        `?${AUTH_RETURN_QUERY}=${encodeURIComponent("/builder?v=1&deck=A1-1,A1-94x2")}`,
      ),
    ).toBe("/builder?v=1&deck=A1-1,A1-94x2");
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
