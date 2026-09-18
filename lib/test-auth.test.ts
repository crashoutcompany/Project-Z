import { describe, expect, it } from "vitest";
import {
  evaluateTestAuthRequest,
  isTestAuthEnabled,
  isValidTestAuthSecret,
  readConfiguredTestAuthSecret,
  readTestAuthSecret,
  TEST_AUTH_HEADER,
} from "./test-auth";

const SECRET = "preview-only-test-secret";

describe("readConfiguredTestAuthSecret", () => {
  it("rejects missing and whitespace-only values", () => {
    expect(readConfiguredTestAuthSecret(undefined)).toBeNull();
    expect(readConfiguredTestAuthSecret("")).toBeNull();
    expect(readConfiguredTestAuthSecret("   ")).toBeNull();
    expect(readTestAuthSecret(undefined)).toBeNull();
  });

  it("trims a configured secret", () => {
    expect(readConfiguredTestAuthSecret(` ${SECRET} \n`)).toBe(SECRET);
  });
});

describe("isTestAuthEnabled (shared:test-auth v2)", () => {
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
        NODE_ENV: "development",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(false);
    expect(
      isTestAuthEnabled({
        VERCEL_ENV: "preview",
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

  it("blocks Vercel production and Vercel runtimes", () => {
    expect(
      isTestAuthEnabled({
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
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

describe("isValidTestAuthSecret", () => {
  it("compares the configured secret", () => {
    expect(
      isValidTestAuthSecret(SECRET, {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(true);
    expect(
      isValidTestAuthSecret("wrong", {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(false);
    expect(
      isValidTestAuthSecret(null, {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toBe(false);
  });
});

describe("evaluateTestAuthRequest", () => {
  it("404s when disabled or production", () => {
    expect(
      evaluateTestAuthRequest(SECRET, {
        TEST_AUTH_SECRET: SECRET,
      }),
    ).toEqual({ allow: false, status: 404 });
    expect(
      evaluateTestAuthRequest(SECRET, {
        EXPOSE_TESTING_API: "1",
        TEST_AUTH_SECRET: SECRET,
        VERCEL_ENV: "production",
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
    expect(TEST_AUTH_HEADER).toBe("x-test-auth-secret");
  });
});
