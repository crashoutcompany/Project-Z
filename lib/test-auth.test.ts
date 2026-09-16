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
  it("allows local and Preview when the secret is set", () => {
    expect(isTestAuthEnabled({ secret: SECRET })).toBe(true);
    expect(
      isTestAuthEnabled({ vercelEnv: "preview", secret: SECRET }),
    ).toBe(true);
    expect(
      isTestAuthEnabled({ vercelEnv: "development", secret: SECRET }),
    ).toBe(true);
  });

  it("blocks Vercel Production even if the secret is set", () => {
    expect(
      isTestAuthEnabled({ vercelEnv: "production", secret: SECRET }),
    ).toBe(false);
  });

  it("blocks every environment when the secret is missing", () => {
    expect(isTestAuthEnabled({ vercelEnv: "preview" })).toBe(false);
    expect(isTestAuthEnabled({ vercelEnv: "preview", secret: "" })).toBe(
      false,
    );
    expect(isTestAuthEnabled({ secret: "   " })).toBe(false);
  });
});

describe("evaluateTestAuthRequest", () => {
  it("404s when disabled, including Production with a matching header", () => {
    expect(evaluateTestAuthRequest(SECRET, { secret: null })).toEqual({
      allow: false,
      status: 404,
    });
    expect(
      evaluateTestAuthRequest(SECRET, {
        vercelEnv: "production",
        secret: SECRET,
      }),
    ).toEqual({ allow: false, status: 404 });
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

  it("allows Preview and local when the header matches", () => {
    expect(
      evaluateTestAuthRequest(SECRET, {
        vercelEnv: "preview",
        secret: SECRET,
      }),
    ).toEqual({ allow: true, secret: SECRET });
    expect(evaluateTestAuthRequest(SECRET, { secret: SECRET })).toEqual({
      allow: true,
      secret: SECRET,
    });
  });
});
