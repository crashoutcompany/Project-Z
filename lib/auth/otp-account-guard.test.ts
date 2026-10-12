import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: "email-id" }, error: null })),
);

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmail };
  },
}));

import { createEmailOtpPlugins, type EmailOtpConfig } from "./email-otp";
import { isOtpSignInBlocked, otpExistingAccountGuardPlugin } from "./otp-account-guard";

const ORIGIN = "http://localhost:3000";
const SECRET = "test-better-auth-secret-at-least-32-characters";
const EMAIL = "bot@example.com";
const CONFIG: EmailOtpConfig = {
  allowlist: [EMAIL],
  from: "auth@example.com",
  resendApiKey: "re_test",
};

type Row = Record<string, unknown>;
type Db = {
  user: Row[];
  session: Row[];
  account: Row[];
  verification: Row[];
};

const NOW = new Date();

function userRow(id: string, extra: Row = {}): Row {
  return {
    id,
    name: "Existing",
    email: EMAIL,
    emailVerified: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  };
}

function accountRow(userId: string, providerId: string): Row {
  return {
    id: `account-${userId}-${providerId}`,
    accountId: `${providerId}-id`,
    providerId,
    userId,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function buildDb(seed: Partial<Db> = {}): Db {
  return {
    user: [],
    session: [],
    account: [],
    verification: [],
    ...seed,
  };
}

function buildAuth(db: Db) {
  return betterAuth({
    appName: "App",
    baseURL: ORIGIN,
    secret: SECRET,
    trustedOrigins: [ORIGIN],
    database: memoryAdapter(db),
    rateLimit: { enabled: false },
    user: {
      additionalFields: {
        role: { type: "string", required: false, input: false },
      },
    },
    plugins: [
      ...createEmailOtpPlugins(CONFIG, "App"),
      otpExistingAccountGuardPlugin,
    ],
  });
}

type TestAuth = ReturnType<typeof buildAuth>;

function post(auth: TestAuth, path: string, body: Record<string, unknown>) {
  return auth.handler(
    new Request(`${ORIGIN}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN },
      body: JSON.stringify(body),
    }),
  );
}

async function sendCodeAndSignIn(auth: TestAuth) {
  await post(auth, "/email-otp/send-verification-otp", {
    email: EMAIL,
    type: "sign-in",
  });
  const otp = (sendEmail.mock.lastCall?.[0].text as string).match(
    /\b(\d{6})\b/,
  )?.[1];
  return post(auth, "/sign-in/email-otp", { email: EMAIL, otp });
}

/**
 * Issues a valid sign-in code without sending it, for tests that need the
 * sign-in guard to see a correct code. Blocked accounts get no emailed code.
 */
async function signInWithIssuedCode(auth: TestAuth) {
  const otp = await auth.api.createVerificationOTP({
    body: { email: EMAIL, type: "sign-in" },
  });
  return post(auth, "/sign-in/email-otp", { email: EMAIL, otp });
}

afterEach(() => {
  sendEmail.mockClear();
  vi.restoreAllMocks();
});

describe("isOtpSignInBlocked", () => {
  it("allows a user with no linked accounts and no elevated role", () => {
    expect(isOtpSignInBlocked({ user: { id: "u1" }, accounts: [] })).toBe(
      false,
    );
  });

  it("blocks a user with any linked OAuth or password account", () => {
    expect(
      isOtpSignInBlocked({
        user: { id: "u1" },
        accounts: [accountRow("u1", "github")],
      }),
    ).toBe(true);
    expect(
      isOtpSignInBlocked({
        user: { id: "u1" },
        accounts: [accountRow("u1", "credential")],
      }),
    ).toBe(true);
  });

  it("blocks admin and owner roles even without linked accounts", () => {
    expect(
      isOtpSignInBlocked({ user: { id: "u1", role: "admin" }, accounts: [] }),
    ).toBe(true);
    expect(
      isOtpSignInBlocked({ user: { id: "u1", role: "owner" }, accounts: [] }),
    ).toBe(true);
  });

  it("does not block an ordinary role", () => {
    expect(
      isOtpSignInBlocked({ user: { id: "u1", role: "member" }, accounts: [] }),
    ).toBe(false);
  });
});

describe("otpExistingAccountGuardPlugin", () => {
  it("lets a new email-code user sign in", async () => {
    const db = buildDb();
    const response = await sendCodeAndSignIn(buildAuth(db));

    expect(response.status).toBe(200);
    expect(db.session).toHaveLength(1);
    expect(db.user).toHaveLength(1);
  });

  it("lets an email-code user with no linked accounts sign in again", async () => {
    const db = buildDb({ user: [userRow("otp-user")] });
    const response = await sendCodeAndSignIn(buildAuth(db));

    expect(response.status).toBe(200);
    expect(db.session).toHaveLength(1);
  });

  it("keeps a code-created user code-only across repeat sign-ins", async () => {
    const db = buildDb();
    const auth = buildAuth(db);

    const first = await sendCodeAndSignIn(auth);
    expect(first.status).toBe(200);
    const userId = db.user[0]?.id;

    const second = await sendCodeAndSignIn(auth);
    expect(second.status).toBe(200);
    expect(db.session).toHaveLength(2);
    expect(db.user).toHaveLength(1);
    expect(db.account.filter((row) => row.userId === userId)).toHaveLength(0);
  });

  it("sends no email to a blocked account but answers exactly like an unlisted one", async () => {
    const blockedDb = buildDb({
      user: [userRow("oauth-user")],
      account: [accountRow("oauth-user", "github")],
    });
    const blocked = await post(buildAuth(blockedDb), "/email-otp/send-verification-otp", {
      email: EMAIL,
      type: "sign-in",
    });
    expect(sendEmail).not.toHaveBeenCalled();

    const unlisted = await post(buildAuth(buildDb()), "/email-otp/send-verification-otp", {
      email: "stranger@example.com",
      type: "sign-in",
    });
    expect(sendEmail).not.toHaveBeenCalled();

    expect(blocked.status).toBe(unlisted.status);
    expect(await blocked.json()).toEqual(await unlisted.json());
  });

  it("sends no email to an admin account", async () => {
    const db = buildDb({ user: [userRow("admin-user", { role: "admin" })] });
    const response = await post(buildAuth(db), "/email-otp/send-verification-otp", {
      email: EMAIL,
      type: "sign-in",
    });

    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.verification).toHaveLength(0);
  });

  it("still emails a code-only account", async () => {
    const db = buildDb({ user: [userRow("otp-user")] });
    const response = await post(buildAuth(db), "/email-otp/send-verification-otp", {
      email: EMAIL,
      type: "sign-in",
    });

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("refuses email-code sign-in into an existing OAuth account", async () => {
    const db = buildDb({
      user: [userRow("oauth-user")],
      account: [accountRow("oauth-user", "github")],
    });

    const response = await signInWithIssuedCode(buildAuth(db));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_OTP" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(db.session).toHaveLength(0);
  });

  it("refuses email-code sign-in into an existing admin account", async () => {
    const db = buildDb({
      user: [userRow("admin-user", { role: "admin" })],
    });

    const response = await signInWithIssuedCode(buildAuth(db));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_OTP" });
    expect(db.session).toHaveLength(0);
  });

  it("returns the same INVALID_OTP body as a wrong code, not a distinct error", async () => {
    const guarded = buildDb({
      user: [userRow("oauth-user")],
      account: [accountRow("oauth-user", "google")],
    });
    const blocked = await signInWithIssuedCode(buildAuth(guarded));
    const wrongCode = await post(buildAuth(buildDb()), "/sign-in/email-otp", {
      email: EMAIL,
      otp: "000000",
    });

    expect(blocked.status).toBe(wrongCode.status);
    expect(await blocked.json()).toEqual(await wrongCode.json());
  });
});
