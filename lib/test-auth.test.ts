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
  it("allows preview, local development, and exposed local e2e", () => {
    expect(
      isTestAuthEnabled({
        TEST_AUTH_SECRET: SECRET,
        VERCEL: "1",
        VERCEL_ENV: "preview",
      }),
    ).toBe(true);
    expect(
      isTestAuthEnabled({
        NODE_ENV: "development",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(true);
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(true);
  });

  it("blocks production and unclassified Vercel runtimes", () => {
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
        VERCEL: "1",
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
        VERCEL: "1",
      }),
    ).toBe(false);
  });

  it("blocks when the API is not exposed or the secret is missing", () => {
    expect(isTestAuthEnabled({ TEST_AUTH_SECRET: SECRET })).toBe(false);
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: "   ",
      }),
    ).toBe(false);
  });
});

describe("evaluateTestAuthRequest", () => {
  it("404s when disabled or running in production", () => {
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
        VERCEL_ENV: "production",
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
