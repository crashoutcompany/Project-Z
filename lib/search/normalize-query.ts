import { createHash } from "node:crypto";

export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashQuery(normalized: string): string {
  return createHash("sha256").update(normalized).digest("hex");
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
