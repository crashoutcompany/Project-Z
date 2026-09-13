# Adding New TCG Pocket Sets

Use the collection-tracker import pipeline. Card data (attacks, abilities/effects, tags) is imported from a pinned upstream payload — not scraped from Serebii. Images are copied to Vercel Blob during import.

## Prerequisites

- `DATABASE_URL` / `DIRECT_URL` configured in `.env` / `.env.local`
- `BLOB_STORE_ID` and `BLOB_READ_WRITE_TOKEN` in `.env.local` (and on the Vercel project)
- Dependencies installed (`pnpm install`)
- Prisma migrations applied (`pnpm exec prisma migrate deploy`)

## Process

### 1. Confirm the pinned source

`scripts/import-cards.ts` pins a commit SHA for  
[marcelpanse/tcg-pocket-collection-tracker](https://github.com/marcelpanse/tcg-pocket-collection-tracker) `frontend/assets/cards.json`.

When a new set appears upstream:

1. Update `PINNED_COMMIT_SHA` in `scripts/import-cards.ts` to a commit that includes the set.
2. Ensure `scripts/lib/set-map.ts` maps the new set code → display name (and release date if available). Unknown set codes must fail the import — never invent rows.

### 2. Dry-run (optional)

```bash
pnpm import:cards:dry
```

Review the report: sets touched, creates/updates, tag frequency, attacks with zero tags.

### 3. Import

```bash
pnpm import:cards
```

The importer is idempotent. It upserts sets/cards/attacks/effects and never deletes cards (trades reference card IDs).

### 4. Verify

- Per-set source vs processed counts match in the summary report
- Spot-check a few cards in `/dex` (images load from Vercel Blob)
- Effects search on `/dex` finds tagged attacks (e.g. `coin flip`, `bench damage`)

### 5. Search cache

`SearchQueryCache` stores NL query → FilterJSON only. After changing the FilterJSON schema or tag vocabulary, truncate the cache:

```sql
TRUNCATE "SearchQueryCache";
```

## Tag vocabulary

Tags are assigned at import time by `scripts/lib/tagger.ts`. The NL search LLM may only emit that closed list. Adding a tag = update the tagger rule + `lib/search/tags.ts` + re-import + truncate the parse cache.

## Images

Limitless CDN is the **import copy source only**. Dex, builder, and trades serve `Card.imageUrl` (Vercel Blob) through `next/image`.

- Pathname: `pocket/{code}/{code}_{pad}_EN_SM.webp` (`addRandomSuffix: false`)
- Blob `Cache-Control`: 1 year (origin). Users hit the image optimizer cache, which only re-fetches Blob on a miss.
- Re-import reuses existing Blob keys; it does not re-upload.

Do not store Serebii paths. Attribution belongs in the README/footer.

### Future: Cloudflare R2

If Vercel Image Optimization (transformations, cache, Fast Data Transfer) or Blob ops/transfer get too expensive, copy the same keys to a public R2 bucket + custom domain and point `imageUrl` at that host. Schema stays a string. Do not use `*.r2.dev` in production. See **Image Strategy** in `DECK_BUILDER_SPEC.md`.

## Out of scope for set adds

- Do not scrape Serebii HTML or commit set HTML dumps for new sets
- Do not regenerate card IDs (breaks trade foreign keys)
- Do not hand-edit attack/effect rows unless fixing a tagger bug, then re-import
