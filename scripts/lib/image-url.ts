import { list, put } from "@vercel/blob";

const SOURCE_HOST = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com";
const BLOB_PATH_PREFIX = "pocket";
const UPLOAD_CONCURRENCY = 8;
const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function paddedCardNumber(number: number): string {
  return String(number).padStart(3, "0");
}

export function blobPathname(setCode: string, number: number): string {
  const pad = paddedCardNumber(number);
  return `${BLOB_PATH_PREFIX}/${setCode}/${setCode}_${pad}_EN_SM.webp`;
}

/** Limitless CDN URL used only as the one-time copy source. */
export function deriveImageUrl(setCode: string, number: number): string {
  const pad = paddedCardNumber(number);
  return `${SOURCE_HOST}/pocket/${setCode}/${setCode}_${pad}_EN_SM.webp`;
}

export function fullSizeUrl(imageUrl: string): string {
  return imageUrl.replace(/_SM\.webp$/, ".webp");
}

export function cardImageKey(setCode: string, number: number): string {
  return `${setCode}-${number}`;
}

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env.local (and the Vercel project) before importing card images."
    );
  }
  return token;
}

export async function listExistingCardImages(): Promise<Map<string, string>> {
  const token = requireBlobToken();
  const urls = new Map<string, string>();
  let cursor: string | undefined;

  do {
    const result = await list({
      prefix: `${BLOB_PATH_PREFIX}/`,
      cursor,
      limit: 1000,
      token,
    });
    for (const blob of result.blobs) {
      urls.set(blob.pathname, blob.url);
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return urls;
}

export async function uploadCardImage(
  setCode: string,
  number: number
): Promise<string> {
  const token = requireBlobToken();
  const pathname = blobPathname(setCode, number);
  const sourceUrl = deriveImageUrl(setCode, number);
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source image ${sourceUrl}: ${res.status}`);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  const blob = await put(pathname, bytes, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/webp",
    cacheControlMaxAge: YEAR_IN_SECONDS,
    token,
  });
  return blob.url;
}

export interface ResolveCardImagesResult {
  urls: Map<string, string>;
  uploaded: number;
  reused: number;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Math.min(concurrency, items.length);
  if (workers === 0) return results;
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/**
 * Reuses blobs already in the store; copies missing cards from Limitless.
 * Dry-run lists the store when a token is present, otherwise falls back to source URLs.
 */
export async function resolveCardImageUrls(
  cards: { setCode: string; number: number }[],
  options: { skipUpload?: boolean } = {}
): Promise<ResolveCardImagesResult> {
  const urls = new Map<string, string>();
  let uploaded = 0;
  let reused = 0;

  if (options.skipUpload && !process.env.BLOB_READ_WRITE_TOKEN) {
    for (const card of cards) {
      urls.set(cardImageKey(card.setCode, card.number), deriveImageUrl(card.setCode, card.number));
    }
    return { urls, uploaded, reused };
  }

  const existing = await listExistingCardImages();
  const missing: { setCode: string; number: number }[] = [];

  for (const card of cards) {
    const pathname = blobPathname(card.setCode, card.number);
    const key = cardImageKey(card.setCode, card.number);
    const already = existing.get(pathname);
    if (already) {
      urls.set(key, already);
      reused += 1;
    } else {
      missing.push(card);
    }
  }

  if (options.skipUpload) {
    for (const card of missing) {
      urls.set(cardImageKey(card.setCode, card.number), deriveImageUrl(card.setCode, card.number));
    }
    return { urls, uploaded, reused };
  }

  await mapPool(missing, UPLOAD_CONCURRENCY, async (card) => {
    const url = await uploadCardImage(card.setCode, card.number);
    urls.set(cardImageKey(card.setCode, card.number), url);
    uploaded += 1;
  });

  return { urls, uploaded, reused };
}
