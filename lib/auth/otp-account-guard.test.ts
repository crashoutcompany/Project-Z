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
import {
  isOtpSignInBlocked,
  otpExistingAccountGuardPlugin,
} from "./otp-account-guard";

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

/**
 * Builds auth on the in-memory adapter. The first `failingAccountReads` calls
 * to read the account table throw, to exercise the guard's lookup retry.
 */
function buildAuth(db: Db, failingAccountReads = 0) {
  let remainingFailures = failingAccountReads;
  return betterAuth({
    appName: "App",
    baseURL: ORIGIN,
    secret: SECRET,
    trustedOrigins: [ORIGIN],
    database: (options) => {
      const base = memoryAdapter(db)(options);
      return {
        ...base,
        findMany: async (args: Parameters<typeof base.findMany>[0]) => {
          if (args.model === "account" && remainingFailures > 0) {
            remainingFailures -= 1;
            throw new Error("account table unavailable");
          }
          return base.findMany(args);
        },
      };
    },
    rateLimit: { enabled: false },
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

function sendCode(auth: TestAuth, email: string) {
  return post(auth, "/email-otp/send-verification-otp", {
    email,
    type: "sign-in",
  });
}

async function sendCodeAndSignIn(auth: TestAuth) {
  await sendCode(auth, EMAIL);
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
  it("allows an account list that is empty", () => {
    expect(isOtpSignInBlocked([])).toBe(false);
  });

  it("blocks a user with any linked OAuth or password account", () => {
    expect(isOtpSignInBlocked([accountRow("u1", "github")])).toBe(true);
    expect(isOtpSignInBlocked([accountRow("u1", "credential")])).toBe(true);
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

  it("sends no email and stores no code for a blocked account, and answers like an unlisted one", async () => {
    const blockedDb = buildDb({
      user: [userRow("oauth-user")],
      account: [accountRow("oauth-user", "github")],
    });
    const blocked = await sendCode(buildAuth(blockedDb), EMAIL);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(blockedDb.verification).toHaveLength(0);

    const unlistedDb = buildDb();
    const unlisted = await sendCode(buildAuth(unlistedDb), "stranger@example.com");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(unlistedDb.verification).toHaveLength(0);

    expect(blocked.status).toBe(unlisted.status);
    expect(await blocked.json()).toEqual(await unlisted.json());
  });

  it("still emails a code-only account", async () => {
    const db = buildDb({ user: [userRow("otp-user")] });
    const response = await sendCode(buildAuth(db), EMAIL);

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(db.verification).toHaveLength(1);
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

  it("lets a code-only user sign in when the account lookup fails once", async () => {
    const db = buildDb({ user: [userRow("otp-user")] });
    const response = await signInWithIssuedCode(buildAuth(db, 1));

    expect(response.status).toBe(200);
    expect(db.session).toHaveLength(1);
  });

  it("denies sign-in and logs when the account lookup fails twice", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = buildDb({ user: [userRow("otp-user")] });

    const response = await signInWithIssuedCode(buildAuth(db, 2));

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(db.session).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(
      "otp_guard_lookup_failed",
      expect.objectContaining({ attempts: 2 }),
    );
  });

  it("denies a send and stores no code when the account lookup fails twice", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = buildDb({ user: [userRow("otp-user")] });

    const response = await sendCode(buildAuth(db, 2), EMAIL);

    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.verification).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(
      "otp_guard_lookup_failed",
      expect.any(Object),
    );
  });
});
