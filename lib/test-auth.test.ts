import { describe, expect, it } from "vitest";
import {
  evaluateTestAuthRequest,
  isTestAuthEnabled,
  readTestAuthSecret,
} from "./test-auth";

const SECRET = "preview-only-test-secret";

describe("readTestAuthSecret", () => {
  it("rejects missing and whitespace-only values", () => {
    expect(readTestAuthSecret(undefined)).toBeNull();
    expect(readTestAuthSecret("")).toBeNull();
    expect(readTestAuthSecret("   ")).toBeNull();
  });

  it("trims a configured secret", () => {
    expect(readTestAuthSecret(` ${SECRET} \n`)).toBe(SECRET);
  });
});

describe("isTestAuthEnabled", () => {
  it("allows only when EXPOSE_TESTING_API=1 and a secret are set (non-Vercel)", () => {
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(true);
  });

  it("never auto-enables from NODE_ENV or VERCEL_ENV alone", () => {
    expect(
      isTestAuthEnabled({
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(false);
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "0",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(false);
  });

  it("blocks Vercel runtimes even when the testing API flag is set", () => {
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
        VERCEL: "1",
      }),
    ).toBe(false);
  });

  it("blocks when the secret is missing", () => {
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: "   ",
      }),
    ).toBe(false);
    expect(isTestAuthEnabled({ EXPOSE_TESTING_API: "1" })).toBe(false);
  });
});

describe("evaluateTestAuthRequest", () => {
  it("404s when disabled", () => {
    expect(
      evaluateTestAuthRequest(SECRET, {
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toEqual({ allow: false, status: 404 });
    expect(
      evaluateTestAuthRequest(SECRET, {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
        VERCEL: "1",
      }),
    ).toEqual({ allow: false, status: 404 });
  });

  it("401s when enabled but the header is missing or wrong", () => {
    expect(
      evaluateTestAuthRequest(null, {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toEqual({ allow: false, status: 401 });
    expect(
      evaluateTestAuthRequest("nope", {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toEqual({ allow: false, status: 401 });
  });

  it("allows an exposed local request when the header matches", () => {
    expect(
      evaluateTestAuthRequest(SECRET, {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toEqual({ allow: true });
  });
});
