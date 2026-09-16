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
    expect(readTestAuthSecret(null)).toBeNull();
    expect(readTestAuthSecret("")).toBeNull();
    expect(readTestAuthSecret("   ")).toBeNull();
  });

  it("trims a configured secret", () => {
    expect(readTestAuthSecret(` ${SECRET} \n`)).toBe(SECRET);
  });
});

describe("isTestAuthEnabled", () => {
  it("allows Vercel Preview and Development when the secret is set", () => {
    expect(
      isTestAuthEnabled({ vercelEnv: "preview", secret: SECRET }),
    ).toBe(true);
    expect(
      isTestAuthEnabled({
        vercelEnv: "preview",
        nodeEnv: "production",
        secret: SECRET,
      }),
    ).toBe(true);
    expect(
      isTestAuthEnabled({ vercelEnv: "development", secret: SECRET }),
    ).toBe(true);
  });

  it("allows local only when VERCEL_ENV is absent and NODE_ENV is development", () => {
    expect(
      isTestAuthEnabled({ nodeEnv: "development", secret: SECRET }),
    ).toBe(true);
    expect(
      isTestAuthEnabled({
        vercelEnv: "",
        nodeEnv: "development",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("blocks Production and every other VERCEL_ENV even if the secret is set", () => {
    expect(
      isTestAuthEnabled({ vercelEnv: "production", secret: SECRET }),
    ).toBe(false);
    expect(
      isTestAuthEnabled({
        vercelEnv: "production",
        nodeEnv: "development",
        secret: SECRET,
      }),
    ).toBe(false);
    expect(
      isTestAuthEnabled({ vercelEnv: "staging", secret: SECRET }),
    ).toBe(false);
    expect(
      isTestAuthEnabled({ vercelEnv: "Preview", secret: SECRET }),
    ).toBe(false);
  });

  it("blocks local when NODE_ENV is not development", () => {
    expect(isTestAuthEnabled({ secret: SECRET })).toBe(false);
    expect(
      isTestAuthEnabled({ nodeEnv: "production", secret: SECRET }),
    ).toBe(false);
    expect(isTestAuthEnabled({ nodeEnv: "test", secret: SECRET })).toBe(
      false,
    );
  });

  it("blocks every environment when the secret is missing", () => {
    expect(isTestAuthEnabled({ vercelEnv: "preview" })).toBe(false);
    expect(isTestAuthEnabled({ vercelEnv: "preview", secret: "" })).toBe(
      false,
    );
    expect(
      isTestAuthEnabled({ nodeEnv: "development", secret: "   " }),
    ).toBe(false);
  });
});

describe("evaluateTestAuthRequest", () => {
  it("404s when disabled, including Production and unrecognized envs", () => {
    expect(
      evaluateTestAuthRequest(SECRET, {
        nodeEnv: "development",
        secret: null,
      }),
    ).toEqual({
      allow: false,
      status: 404,
    });
    expect(
      evaluateTestAuthRequest(SECRET, {
        vercelEnv: "production",
        secret: SECRET,
      }),
    ).toEqual({ allow: false, status: 404 });
    expect(
      evaluateTestAuthRequest(SECRET, {
        vercelEnv: "staging",
        secret: SECRET,
      }),
    ).toEqual({ allow: false, status: 404 });
    expect(evaluateTestAuthRequest(SECRET, { secret: SECRET })).toEqual({
      allow: false,
      status: 404,
    });
  });

  it("401s when enabled but the header is missing or wrong", () => {
    expect(
      evaluateTestAuthRequest(null, { vercelEnv: "preview", secret: SECRET }),
    ).toEqual({ allow: false, status: 401 });
    expect(
      evaluateTestAuthRequest("nope", {
        vercelEnv: "preview",
        secret: SECRET,
      }),
    ).toEqual({ allow: false, status: 401 });
  });

  it("allows Preview and local development when the header matches", () => {
    expect(
      evaluateTestAuthRequest(SECRET, {
        vercelEnv: "preview",
        secret: SECRET,
      }),
    ).toEqual({ allow: true, secret: SECRET });
    expect(
      evaluateTestAuthRequest(SECRET, {
        nodeEnv: "development",
        secret: SECRET,
      }),
    ).toEqual({ allow: true, secret: SECRET });
  });
});
