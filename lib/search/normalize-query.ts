import { createHash } from "node:crypto";
import { TAG_VOCAB_VERSION } from "./tags";

export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cache key for a parsed query. The tag vocabulary version is folded in so a
 * vocabulary change does not keep serving parses made with the old tags.
 */
export function hashQuery(normalized: string): string {
  return createHash("sha256")
    .update(`tags-v${TAG_VOCAB_VERSION}:${normalized}`)
    .digest("hex");
}

export function validateQuery(
  raw: string,
): { ok: true; normalized: string } | { ok: false; error: string } {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Query is required" };
  }
  const normalized = normalizeQuery(raw);
  if (!normalized) {
    return { ok: false, error: "Query is empty after normalization" };
  }
  if (normalized.length > 200) {
    return { ok: false, error: "Query must be 200 characters or fewer" };
  }
  if (!/[a-z]/.test(normalized)) {
    return { ok: false, error: "Query must contain at least one letter" };
  }
  return { ok: true, normalized };
}
