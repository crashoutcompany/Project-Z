import { describe, expect, it, vi } from "vitest";
import {
  CATALOG_REQUEST_FAILED,
  CATALOG_SESSION_ENDED,
  effectsSearchFailure,
  resolveCatalogAction,
} from "./resolve-catalog-action";

describe("resolveCatalogAction", () => {
  it("returns the page when the action succeeds", async () => {
    const page = { status: "ok" as const, cards: [1], nextCursor: null };
    const outcome = await resolveCatalogAction(
      async () => page,
      () => Promise.resolve(true),
    );
    expect(outcome).toEqual({ ok: true, value: page });
  });

  it("does not take the catalog down when the action reports signed_out", async () => {
    const hasSession = vi.fn(() => Promise.resolve(true));
    const outcome = await resolveCatalogAction(
      async () => ({ status: "signed_out" as const }),
      hasSession,
    );
    expect(hasSession).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      ok: false,
      signedOut: true,
      error: CATALOG_SESSION_ENDED,
    });
  });

  it("treats a thrown action as signed-out when the session is gone", async () => {
    const outcome = await resolveCatalogAction(
      async () => {
        throw new Error("An unexpected response was received from the server.");
      },
      () => Promise.resolve(false),
    );
    expect(outcome).toEqual({
      ok: false,
      signedOut: true,
      error: CATALOG_SESSION_ENDED,
    });
  });

  it("keeps a generic error when a signed-in request fails", async () => {
    const outcome = await resolveCatalogAction(
      async () => {
        throw new Error("database down");
      },
      () => Promise.resolve(true),
    );
    expect(outcome).toEqual({
      ok: false,
      signedOut: false,
      error: CATALOG_REQUEST_FAILED,
    });
  });
});

describe("effectsSearchFailure", () => {
  it("maps 401 to the same session-ended copy as fetchCards", () => {
    expect(effectsSearchFailure(401, "Unauthorized")).toEqual({
      ok: false,
      signedOut: true,
      error: CATALOG_SESSION_ENDED,
    });
  });

  it("keeps the API message for other failures", () => {
    expect(effectsSearchFailure(500, "Search failed")).toEqual({
      ok: false,
      signedOut: false,
      error: "Search failed",
    });
    expect(effectsSearchFailure(429, undefined)).toEqual({
      ok: false,
      signedOut: false,
      error: "Search failed",
    });
  });
});
