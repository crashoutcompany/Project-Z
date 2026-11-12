import { describe, expect, it } from "vitest";
import { clientKeyFromRequest, rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit, then rejects", async () => {
    const key = `allow-${Math.random()}`;
    const opts = { limit: 2, windowMs: 60_000 };

    expect((await rateLimit(key, opts)).ok).toBe(true);
    expect((await rateLimit(key, opts)).ok).toBe(true);
    const blocked = await rateLimit(key, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys independently", async () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const a = `a-${Math.random()}`;
    expect((await rateLimit(a, opts)).ok).toBe(true);
    expect((await rateLimit(a, opts)).ok).toBe(false);
    expect((await rateLimit(`b-${Math.random()}`, opts)).ok).toBe(true);
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
    expect(
      clientKeyFromRequest(new Request("http://localhost/api/search")),
    ).toBe("anonymous");
  });
});
