export const CATALOG_SESSION_ENDED =
  "Your session has ended. Sign in to keep browsing.";

export const CATALOG_REQUEST_FAILED = "Search request failed";

export type CatalogActionOk<T> = { ok: true; value: T };
export type CatalogActionFail = {
  ok: false;
  signedOut: boolean;
  error: string;
};
export type CatalogActionResult<T> = CatalogActionOk<T> | CatalogActionFail;

/**
 * Maps a catalog server action to an in-page error instead of letting a
 * signed-out throw (or proxy redirect) escape a transition.
 */
export async function resolveCatalogAction<T extends { status: string }>(
  run: () => Promise<T>,
  hasSession: () => Promise<boolean>,
): Promise<CatalogActionResult<Exclude<T, { status: "signed_out" }>>> {
  try {
    const result = await run();
    if (result.status === "signed_out") {
      return {
        ok: false,
        signedOut: true,
        error: CATALOG_SESSION_ENDED,
      };
    }
    return {
      ok: true,
      value: result as Exclude<T, { status: "signed_out" }>,
    };
  } catch {
    if (await hasSession()) {
      return { ok: false, signedOut: false, error: CATALOG_REQUEST_FAILED };
    }
    return { ok: false, signedOut: true, error: CATALOG_SESSION_ENDED };
  }
}

/** Effects search hits `/api/search`, which returns 401 JSON without a session. */
export function effectsSearchFailure(
  status: number,
  message: string | undefined,
): CatalogActionFail {
  if (status === 401) {
    return { ok: false, signedOut: true, error: CATALOG_SESSION_ENDED };
  }
  return {
    ok: false,
    signedOut: false,
    error: message ?? "Search failed",
  };
}
