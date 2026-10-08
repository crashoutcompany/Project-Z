import { describe, expect, it } from "vitest";
import { clientKeyFromRequest, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit, then rejects", () => {
    const key = `allow-${Math.random()}`;
    const now = 1_000_000;
    const opts = { limit: 2, windowMs: 60_000 };

    expect(rateLimit(key, opts, now)).toMatchObject({ ok: true, remaining: 1 });
    expect(rateLimit(key, opts, now + 10)).toMatchObject({
      ok: true,
      remaining: 0,
    });
    const blocked = rateLimit(key, opts, now + 20);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const key = `window-${Math.random()}`;
    const now = 5_000_000;
    const opts = { limit: 1, windowMs: 1_000 };

    expect(rateLimit(key, opts, now).ok).toBe(true);
    expect(rateLimit(key, opts, now + 10).ok).toBe(false);
    expect(rateLimit(key, opts, now + 1_000).ok).toBe(true);
  });
});

describe("clientKeyFromRequest", () => {
  it("prefers the first x-forwarded-for hop", () => {
    const request = new Request("http://localhost/api/search", {
      headers: {
        "x-forwarded-for": " 203.0.113.9, 10.0.0.1 ",
        "x-real-ip": "10.0.0.2",
      },
    });
    expect(clientKeyFromRequest(request)).toBe("203.0.113.9");
  });

  it("falls back to x-real-ip, then anonymous", () => {
    expect(
      clientKeyFromRequest(
        new Request("http://localhost/api/search", {
          headers: { "x-real-ip": "198.51.100.4" },
        }),
      ),
    ).toBe("198.51.100.4");
    expect(clientKeyFromRequest(new Request("http://localhost/api/search"))).toBe(
      "anonymous",
    );
  });
});
