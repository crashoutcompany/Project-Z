import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";

// proxy.ts builds the real auth instance (Prisma); the matcher doesn't need it.
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const { config } = await import("./proxy");

const [matcher] = config.matcher;

function runsProxy(url: string, source: string = matcher) {
  return unstable_doesMiddlewareMatch({
    config: { matcher: [source] },
    url,
  });
}

// The same matcher minus its /api exclusion, so the static-file rule is the
// only thing left that could skip /api.
const staticRulesOnly = matcher.replace("api(?:/|$)|", "");

const PAGES = [
  "/",
  "/dex",
  "/dex?card=A1-1",
  "/builder",
  "/trading",
  "/trading/new",
  "/me",
  "/home",
  "/signin",
];

const STATIC_FILES = [
  "/back.png",
  "/favicon.ico",
  "/images/rarity/diamond.png",
  "/images/types/grass.png",
  "/next.svg",
  "/photo.jpg",
  "/photo.jpeg",
  "/photo.webp",
  "/photo.gif",
  "/photo.avif",
];

describe("proxy matcher", () => {
  it("keeps pages behind the auth proxy", () => {
    for (const url of PAGES) {
      expect(runsProxy(url), url).toBe(true);
    }
  });

  it("skips static files by extension, wherever they live", () => {
    for (const url of STATIC_FILES) {
      expect(runsProxy(url), url).toBe(false);
    }
  });

  it("does not exclude by folder: non-image paths under /images still match", () => {
    expect(runsProxy("/images")).toBe(true);
    expect(runsProxy("/images/rarity")).toBe(true);
  });

  it("skips Next internals", () => {
    expect(runsProxy("/_next/static/chunks/main.js")).toBe(false);
    expect(runsProxy("/_next/image?url=%2Fback.png&w=256&q=75")).toBe(false);
  });

  it("leaves /api to its own route auth, not to the static-file rule", () => {
    expect(staticRulesOnly).not.toBe(matcher);
    for (const url of ["/api", "/api/search", "/api/cards"]) {
      // Only the explicit api exclusion skips the proxy here...
      expect(runsProxy(url), url).toBe(false);
      // ...the extension rule alone does not treat it as a static file.
      expect(runsProxy(url, staticRulesOnly), url).toBe(true);
    }
  });

  it("does not let the static-file rule exclude pages", () => {
    for (const url of PAGES) {
      expect(runsProxy(url, staticRulesOnly), url).toBe(true);
    }
  });
});
