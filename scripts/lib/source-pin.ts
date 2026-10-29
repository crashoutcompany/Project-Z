/**
 * Pinned upstream payload for card imports and the Cloud Agent seed sample.
 * Single source of truth: bump this SHA when a new set appears upstream, then
 * regenerate the seed sample (`pnpm exec tsx scripts/seed/generate-sample.ts`).
 */
export const PINNED_COMMIT_SHA = "9fafc071e99e37c77263fdca4783d21e348caef5";
export const SOURCE_URL = `https://raw.githubusercontent.com/marcelpanse/tcg-pocket-collection-tracker/${PINNED_COMMIT_SHA}/frontend/assets/cards.json`;
