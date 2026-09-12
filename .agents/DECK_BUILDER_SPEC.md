# Deck Builder + NL Attack Search — Implementation Spec

Consolidated plan from design review (Aug 2026), revised Sep 2026 after auditing the source payload and existing schema. Use this as the source of truth for implementation.

**Revision notes (Sep 2026):** image URLs are now derived from `card_id` (source `image` paths don't resolve); source data-quality fixes added (damage/name split bug, `"No Cost"`, trainer text junk); copy limit corrected to per-name; trainers added to scope; card-level fields flattened onto `Card`; filter semantics, ranking, de-duping, indexes, abuse controls, and a verification plan added.

---

## Summary

Build a **deck builder with natural language card search** for Pokémon TCG Pocket. Users query by semantics ("bench damage, 2 energy, poison", "supporter that draws"), get matching cards with the tags that matched, and assemble a 20-card deck shareable via URL.

---

## Decisions

| Area | Decision |
|------|----------|
| **Card data** | Import from [tcg-pocket-collection-tracker](https://github.com/marcelpanse/tcg-pocket-collection-tracker) `frontend/assets/cards.json`, **pinned to a commit SHA** and validated with Zod on import |
| **Query engine** | Hybrid: LLM → structured `FilterJSON` → SQL; full-text fallback on raw effect text when SQL returns 0 |
| **Search surfaces** | Attacks, Pokémon abilities, **and trainer effects** — one model (`CardEffect`) with a `kind` |
| **v1 scope** | NL search + manual 20-card deck assembly. No auto-deck-gen, no deck-aware search |
| **Deck persistence** | URL-only (`/builder?v=1&deck=A1-1,A1-94x2,...`). No DB storage in v1 |
| **Card refs** | `{setCode}-{number}` (e.g. `A1-1`, `P-A-12`) via new `Set.code` + `Card.number` |
| **Deck rules** | Hard enforce: exactly 20 cards, **max 2 cards sharing a `name`** (Pocket's rule is per name, not per print). Share disabled until valid |
| **LLM** | Vercel AI SDK + Google AI Studio (`GOOGLE_GENERATIVE_AI_API_KEY`), `generateObject` with a closed Zod schema |
| **Parse cache** | Postgres `SearchQueryCache` — caches query → `FilterJSON` only (never result sets). Upstash deferred |
| **Tagging** | Deterministic rules at import time (no LLM). Raw effect text kept for fallback |
| **Search UI** | Extend `SearchBox` with Name / Effects toggle; tag chips in Effects mode; per-route defaults |
| **Results** | Card grid with `groupPrints` query param: `true` on `/builder` (one canonical print + alt-art picker), `false` on `/dex` (full collector binder) |
| **Images** | Limitless CDN URL **derived from set code + number** for v1 (Cloudflare R2 as production path). Attribution in README/footer |
| **Abuse controls** | Query length cap, per-IP rate limit (Vercel WAF rule), closed tag enum in the LLM schema. Sign-in required for Effects mode if quota becomes a problem |
| **Data sync** | Manual `npm run import:cards` for v1; automate later. Import is idempotent and never deletes cards |

---

## Source Data: What the Payload Actually Looks Like

Audited 3,879 entries (Sep 12, 2026). Fields present on every card:

```
expansion, card_id, image, hp, energy, name, card_type, evolution_type,
attacks[], ability, weakness, retreat, rarity, ex, baby, pack,
alternate_versions[], artist, internal_id
```

Key facts that shape the import:

- `card_id` is `"{setCode}-{number}"` (`"A1-1"`, `"P-A-12"`). Unique, no gaps in format. **Set codes can contain hyphens.**
- `card_type` is `"pokémon"` (3,566) or `"trainer"` (313). `evolution_type` is `basic | stage1 | stage2` for Pokémon and `supporter | item | tool | stadium` for trainers.
- `image` is a **relative path** (`/images/en-US/A1-1.webp`) that does not resolve on any public host. Ignore it.
- `ability` is `null` or `{ name, effect }`. Trainers store their card text here with `name: ""`.
- `attacks[].cost` is an array of lowercase type strings; **30 attacks use the sentinel `["No Cost"]`**.
- `attacks[].damage` is `"N"`, `"N+"`, `"Nx"`, `"N-"`, `""` — **except 254 attacks where the last word of the attack name was pushed into `damage`** (`name: "Find a", damage: "Friend"`).
- **All 313 trainer `ability.effect` strings end with `"\n\n … Illustrated by <Artist>"`** and sentences are sometimes joined without a space.
- `rarity` is a symbol string: `◊ ◊◊ ◊◊◊ ◊◊◊◊ ☆ ☆☆ ☆☆☆ ✵ ✵✵ Crown Rare P`.
- `weakness` is a type string, `"none"`, or `"N/A"` (trainers). `hp`/`retreat` are `null` for trainers (fossils have `hp: 40`).
- 1,382 distinct names across 3,879 entries; 633 names have more than 2 prints (alt arts). 557 names have more than one distinct attack/ability set (real reprints with new text across sets).
- No set names in the payload — only codes. The set-code → name map is load-bearing.

### Import-time normalization (required)

```ts
// 1. Damage/name split bug
const DAMAGE_RE = /^\d+[+x\-]?$/;
if (attack.damage && !DAMAGE_RE.test(attack.damage)) {
  attack.name = `${attack.name} ${attack.damage}`.trim();
  attack.damage = "";
}

// 2. "No Cost" sentinel
const cost = attack.cost.filter((c) => c !== "No Cost");
energyCost = cost.length;          // 0 for free attacks
energyTypes = cost;

// 3. Trainer text junk
effect = effect
  .replace(/\s*Illustrated by[\s\S]*$/i, "")
  .replace(/\.(?=[A-Z])/g, ". ")   // "Pokémon.At any time" → "Pokémon. At any time"
  .replace(/\s+/g, " ")
  .trim();

// 4. Nullables
weakness = weakness === "N/A" || weakness === "none" ? null : weakness;
hp = hp ?? null; retreat = retreat ?? null;

// 5. Unknown set code → throw. Never import a card under an unmapped set.
```

### Set code → name map (`scripts/lib/set-map.ts`)

Verified against flibustier `sets.json` (Sep 2026):

```
A1  Genetic Apex            A4   Wisdom of Sea and Sky    B2b Mega Shine
A1a Mythical Island         A4a  Secluded Springs         B3  Pulsing Aura
A2  Space-Time Smackdown    A4b  Deluxe Pack: ex          B3a Paradox Drive
A2a Triumphant Light        B1   Mega Rising              B3b Everyday Wonders
A2b Shining Revelry         B1a  Crimson Blaze            B4  Ruler of the Skies
A3  Celestial Guardians     B2   Fantastical Parade       B4a Team Rocket's Ambition
A3a Extradimensional Crisis B2a  Paldean Wonders          P-A Promo-A
A3b Eevee Grove                                           P-B Promo-B
```

Existing DB `setName` values differ in casing/punctuation from the canonical names above (e.g. `"Space-time Smackdown"`, `"Deluxe Pack ex"`). The migration maps existing rows by their current `setName`; going forward `code` is the identity and `setName` is display-only.

### Rarity map (`scripts/lib/rarity-map.ts`)

Normalize symbols to codes and derive `isTradeable` from the flibustier `rarities.json` flags (currently: Diamond, ☆, ☆☆, ✵, ✵✵ tradeable; ☆☆☆ Immersive, Crown, Promo not). Keep this as data, not hardcoded booleans — the game has changed trade rules before.

```
◊ C   ◊◊ U   ◊◊◊ R   ◊◊◊◊ RR   ☆ AR   ☆☆ SR   ☆☆☆ IM   ✵ S   ✵✵ SSR   Crown Rare UR   P PROMO
```

---

## Schema Changes

### Migration principle

**Migrate existing `Card` rows in place. Never delete and recreate.** `Trade.cards` is a many-to-many on `Card.id`; regenerating IDs orphans every trade. Backfill:

```sql
-- Set.code from a setName → code map (fail if any set is unmapped)
-- Card.number = CAST(split_part(pokedex, ' / ', 1) AS INT)
```

Then upsert everything else on `(setId, number)`. After migration, drop `@@unique([name, setId, pokedex])` in favour of `@@unique([setId, number])`.

### Set

```prisma
model Set {
  id          Int      @id @default(autoincrement()) @map("set_id")
  code        String   @unique              // "A1", "A1a", "P-A"
  setName     String   @unique              // display name
  image       String                        // set icon URL
  releaseDate DateTime?
  cards       Card[]
}
```

### Card

Flatten the Serebii-shaped `Details` / `WeaknessType` / `RetreatCost` tables (their composite keys are image paths) onto `Card`, then drop them.

```prisma
enum CardType   { POKEMON TRAINER }
enum Stage      { BASIC STAGE1 STAGE2 }
enum TrainerType { SUPPORTER ITEM TOOL STADIUM }

model Card {
  id          Int          @id @default(autoincrement()) @map("card_id")
  setId       Int          @map("set_id")
  set         Set          @relation(fields: [setId], references: [id])
  number      Int                            // within set
  name        String
  cardType    CardType
  imageUrl    String                          // derived Limitless URL
  rarity      String                          // normalized code: C, U, R, RR, AR, SR, IM, S, SSR, UR, PROMO
  isTradeable Boolean      @default(false) @map("is_tradeable")
  pack        String?

  // Pokémon-only (null for trainers)
  energyType  String?                         // grass, fire, ... (the Pokémon's type)
  hp          Int?
  stage       Stage?
  isEx        Boolean      @default(false)
  isBaby      Boolean      @default(false)
  weakness    String?
  retreatCost Int?

  // Trainer-only
  trainerType TrainerType?

  attacks     Attack[]
  effects     CardEffect[]                    // ability (Pokémon) or card text (trainer)
  trades      Trade[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([setId, number])
  @@index([name])
  @@index([cardType, stage])
  @@index([energyType])
}
```

Removed: `type` (→ `energyType`), `image`, `thumbnail`, `url`, `expansion`, `pokedex`, `details`. Keep a Limitless card page link derivable in code (`https://pocket.limitlesstcg.com/cards/{code}/{number}`) rather than storing it.

### Attack

```prisma
enum DamageKind { NONE FIXED PLUS SCALING MINUS }

model Attack {
  id          Int        @id @default(autoincrement())
  cardId      Int        @map("card_id")
  card        Card       @relation(fields: [cardId], references: [id], onDelete: Cascade)
  position    Int                             // 0 or 1, order on card
  name        String
  damageRaw   String                          // "40", "40+", "20x", ""
  damageBase  Int?                            // 40, 40, 20, null
  damageKind  DamageKind
  energyCost  Int                             // 0 for free attacks
  energyTypes String[]                        // ["water","water","colorless"]
  effectText  String
  tags        String[]

  // Postgres full-text vector, maintained by a generated column (see Indexes)
  // effectTsv  Unsupported("tsvector")?

  @@unique([cardId, position])
  @@index([energyCost])
  @@index([tags], type: Gin)
}
```

### CardEffect (abilities + trainer text)

```prisma
enum EffectKind { ABILITY TRAINER }

model CardEffect {
  id         Int        @id @default(autoincrement())
  cardId     Int        @map("card_id")
  card       Card       @relation(fields: [cardId], references: [id], onDelete: Cascade)
  kind       EffectKind
  name       String?                          // ability name; null for trainers
  effectText String
  tags       String[]

  @@unique([cardId, kind])
  @@index([tags], type: Gin)
}
```

### SearchQueryCache

```prisma
model SearchQueryCache {
  id         Int      @id @default(autoincrement())
  queryHash  String   @unique                 // SHA-256 of normalized query
  queryText  String
  filterJson Json
  hitCount   Int      @default(0)
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @updatedAt
}
```

### Indexes that Prisma can't fully express

Add in the migration SQL:

```sql
-- Full-text fallback
ALTER TABLE "Attack"     ADD COLUMN effect_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "effectText")) STORED;
ALTER TABLE "CardEffect" ADD COLUMN effect_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "effectText")) STORED;
CREATE INDEX attack_effect_tsv_idx      ON "Attack"     USING GIN (effect_tsv);
CREATE INDEX card_effect_effect_tsv_idx ON "CardEffect" USING GIN (effect_tsv);
```

`@@index([tags], type: Gin)` is required for `hasEvery` / `hasSome` to use an index on `String[]`.

---

## Tags (import-time, rule-based)

Tags are the vocabulary the LLM is allowed to emit. **The Zod schema's `tags` field is a closed enum of exactly this list.** Adding a tag = add the rule, add the enum member, re-run import, truncate the parse cache.

### Attack tags

| Tag | Rule (case-insensitive on effectText unless noted) |
|-----|-----|
| `bench_damage` | `/benched/` AND `/damage/` AND target is opponent's |
| `multi_target` | `/each of your opponent's/` or `/all of your opponent's/` |
| `random_target` | `/chosen at random/` |
| `applies_condition` | any `condition_*` matched |
| `condition_poison` / `_burn` / `_sleep` / `_confused` / `_paralyzed` | `/is now (Poisoned\|Burned\|Asleep\|Confused\|Paralyzed)/` |
| `coin_flip` | `/flip .*coin/` |
| `damage_plus` | `damageKind === PLUS` |
| `damage_scaling` | `damageKind === SCALING` |
| `energy_attach` | `/attach/` AND `/energy/` |
| `energy_discard` | `/discard/` AND `/energy/` |
| `draw` | `/\bdraw\b/` |
| `heal` | `/\bheal/` |
| `ability_interaction` | `/\bability\b/` |
| `free_attack` | `energyCost === 0` |

### Effect tags (abilities and trainers share the vocabulary)

| Tag | Rule |
|-----|-----|
| `once_per_turn` | `/once during your turn/` |
| `energy_attach` | `/attach/` AND `/energy/` |
| `heal` | `/\bheal/` |
| `draw` | `/\bdraw\b/` |
| `prevent` | `/prevent/` or `/can't/` |
| `search_deck` | `/look at the top/` or `/from your deck/` |
| `switch` | `/switch/` |
| `bench_damage` | `/damage/` AND `/bench/` |
| `evolution` | `/evolv/` |

### Structured columns (not tags)

`energyCost`, `energyTypes[]`, `damageBase`, `damageKind`, plus card-level `energyType`, `stage`, `isEx`, `hp`, `cardType`, `trainerType`, `setId`.

### v1.1 candidates (promote when `hitCount` shows demand)

`self_damage`, `cant_attack`, `cant_retreat`, `prevent_damage` (attack), `retreat_interaction`, `ex_interaction`, `copy_attack`, `move_energy`.

### Tagger contract

`scripts/lib/tagger.ts` exports pure functions: `tagAttack(attack) → string[]`, `tagEffect(effect, kind) → string[]`. No I/O. Golden tests live next to it (see Verification).

---

## Image Strategy

**Do not** store card images in `public/` and **do not** use the source's `image` path. Derive one URL per card at import:

```ts
const pad = (n: number) => String(n).padStart(3, "0");
imageUrl = `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${pad(number)}_EN_SM.webp`;
// Full-size variant: drop "_SM". Both verified live for A1, P-A, B4a.
```

Store the `_SM` URL; a helper `fullSizeUrl(card.imageUrl)` swaps the suffix where a large image is needed.

### next.config.ts

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com", pathname: "/pocket/**" },
    { protocol: "https", hostname: "serebii.net", pathname: "/tcgpocket/**" }, // remove in Phase 4
  ],
}
```

### Every Serebii touchpoint to update

| File | Current | Change |
|------|---------|--------|
| `components/CardBrowser/CardItem.tsx` | `serebii.net${card.thumbnail.replace("/th","")}` | `card.imageUrl` |
| `components/Dex.tsx` | thumbnail hack + `href` to Serebii card page | `card.imageUrl`; link to Limitless page or drop link |
| `app/(routes)/trading/create/TradingCreateClient.tsx` | thumbnail hack | `card.imageUrl` |
| `app/(routes)/trading/page.tsx` | `select: { image: true }` | `select: { imageUrl: true }` |
| `app/(routes)/home/Hero.tsx` | hardcoded Serebii thumbnail paths | query real cards or hardcode Limitless URLs |
| `components/FeaturedCards.tsx` | mock data with Serebii paths | same as Hero |
| `next.config.ts` | Serebii only | add Limitless; remove Serebii in Phase 4 |

**Check Limitless's hotlinking/terms and collection-tracker's license before shipping.** If hotlinking is disallowed, the fallback is a one-time copy to Vercel Blob with the same derived key — the schema doesn't change.

---

## NL Query Flow

```
User query
  → guard: non-empty, ≤ 200 chars, contains a letter, rate limit OK
  → normalize + SHA-256
  → SearchQueryCache lookup
      HIT  → FilterJSON (increment hitCount)
      MISS → Gemini generateObject(FilterJSON schema) → upsert into cache
  → SQL (fast path)  — EXISTS-per-attack semantics, see below
  → 0 rows AND filter.textFallback → full-text query on effect_tsv
  → group by (name, set) → canonical print → rank → paginate
  → return { cards, cached, filter }   // return filter so the UI can show chips
```

### FilterJSON schema

```ts
const Tag = z.enum([...ATTACK_TAGS, ...EFFECT_TAGS]);

const AttackFilter = z.object({
  tags:             z.array(Tag).optional(),          // AND within one attack
  energyCost:       z.number().int().min(0).max(5).optional(),
  energyCostMin:    z.number().int().optional(),
  energyCostMax:    z.number().int().optional(),
  energyTypeCounts: z.record(EnergyType, z.number().int().min(1)).optional(), // {"water": 2} = at least 2 water
  damageMin:        z.number().int().optional(),
  damageKind:       z.enum(["FIXED","PLUS","SCALING"]).optional(),
});

const EffectFilter = z.object({
  kind: z.enum(["ABILITY","TRAINER"]).optional(),
  tags: z.array(Tag).optional(),
});

export const FilterJSON = z.object({
  surface:      z.enum(["attack","effect","any"]).default("any"),
  attack:       AttackFilter.optional(),
  effect:       EffectFilter.optional(),
  anyOf:        z.array(z.object({ attack: AttackFilter.optional(), effect: EffectFilter.optional() })).optional(),

  // card-level
  cardType:     z.enum(["POKEMON","TRAINER"]).optional(),
  trainerType:  z.enum(["SUPPORTER","ITEM","TOOL","STADIUM"]).optional(),
  energyType:   z.array(EnergyType).optional(),       // the Pokémon's type
  stage:        z.array(z.enum(["BASIC","STAGE1","STAGE2"])).optional(),
  isEx:         z.boolean().optional(),
  hpMin:        z.number().int().optional(),
  setCodes:     z.array(z.string()).optional(),

  textFallback: z.string().max(100).optional(),        // keywords for FTS if SQL is empty
});
```

### Semantics (these shape the SQL)

- **All attack-level conditions must match the same attack.** `bench_damage` + `energyCost: 2` means one attack that is both, not one attack with bench damage and another that costs 2. Implement as `EXISTS (SELECT 1 FROM "Attack" a WHERE a.card_id = c.card_id AND a.tags @> $tags AND a."energyCost" = 2)`.
- **Tags within a filter are AND.** OR is expressed only through `anyOf` (each branch is a complete attack/effect filter; branches are OR'd).
- **`energyTypeCounts`** compares counts inside `energyTypes[]`: "double water" → `{"water": 2}`; "2 energy" → `energyCost: 2`; "2 colorless" → `{"colorless": 2}`.
- **`surface: "any"`** matches a card if either an attack or an effect satisfies its respective filter.
- Card-level filters apply to the card regardless of surface.

### Examples

```
"bench damage 2 energy poison"
→ { attack: { tags: ["bench_damage","condition_poison"], energyCost: 2 } }

"supporter that draws"
→ { cardType: "TRAINER", trainerType: "SUPPORTER", effect: { kind: "TRAINER", tags: ["draw"] } }

"basic fire pokemon with a coin flip attack that does more damage"
→ { cardType: "POKEMON", stage: ["BASIC"], energyType: ["fire"], attack: { tags: ["coin_flip","damage_plus"] } }

"triple water"
→ { attack: { energyTypeCounts: { water: 3 } } }

"bench damage or poison"
→ { anyOf: [ { attack: { tags: ["bench_damage"] } }, { attack: { tags: ["condition_poison"] } } ] }
```

### Results: grouping, ranking, pagination

- **Group** matching rows by `(name, setId, attackSignature)` where `attackSignature = hash(attacks + effects text)`. Alt-art prints of the same card in the same set collapse to one result; genuine reprints with new text stay separate.
- **Canonical print** = lowest rarity code in the group. Return `otherPrints: [{ ref, rarity, imageUrl }]` so the deck panel can offer a print picker.
- **Rank:** number of matched tags desc → `damageBase` desc (nulls last) → `Set.releaseDate` desc → `number` asc.
- **Paginate** with the same cursor style as name search (20/page). Cursor is `(rankScore, cardId)`. Cache nothing here; the parse cache is the only cache.
- Return `matchedTags` per result (union across the card's matching attacks/effects) for the chip display.

---

## NL Search Cache

Caches **query → FilterJSON** only. SQL always re-runs so imports need no invalidation.

### Normalization

```ts
export function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")  // é → e
    .replace(/[^a-z0-9\s]/g, " ")                        // all punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}
```

### Route sketch

```ts
// POST /api/search  { query: string, cursor?: string }
const normalized = normalizeQuery(query);
if (!normalized || normalized.length > 200 || !/[a-z]/.test(normalized)) return 400;

const queryHash = sha256(normalized);
const hit = await prisma.searchQueryCache.findUnique({ where: { queryHash } });

let filter: FilterJSON;
if (hit) {
  filter = FilterJSON.parse(hit.filterJson);            // re-validate: schema may have changed
  void prisma.searchQueryCache.update({ where: { queryHash }, data: { hitCount: { increment: 1 } } });
} else {
  filter = await parseWithGemini(query);                // generateObject({ schema: FilterJSON })
  await prisma.searchQueryCache.upsert({                // upsert: concurrent misses must not throw
    where: { queryHash },
    create: { queryHash, queryText: query, filterJson: filter },
    update: {},
  });
}

return Response.json(await runSearch(filter, cursor));
```

If `FilterJSON.parse(hit.filterJson)` fails (schema drift), treat as a miss and overwrite.

### Invalidation

| Event | Action |
|-------|--------|
| `import:cards` (new set) | none |
| Tagger rule or tag enum change | `TRUNCATE "SearchQueryCache"` |
| Prompt or FilterJSON schema change | `TRUNCATE "SearchQueryCache"` |
| Hygiene | optional cron: delete rows unused > 90 days |

### Do not cache

Empty/invalid queries, Gemini errors, output that fails Zod.

### Abuse controls (v1, no new infra)

- 200-char cap and letter check before any DB or LLM call.
- Vercel WAF rate-limit rule on `/api/search`: e.g. 30 req/min per IP.
- Gemini call has a 5 s timeout; on timeout return 503 with `retryAfter`.
- Closed `Tag` enum — the model cannot introduce tags, so no query can widen SQL beyond known columns.
- Escalation path if quota is still abused: require a session for Effects mode (Better Auth is already wired).

---

## Routes & UI

| Route | Default mode | Notes |
|-------|--------------|-------|
| `/builder` | Effects | Split pane: results left, 20-slot deck right. Copy link enabled only when valid |
| `/dex` | Name | Effects toggle available |
| `/trading/*` | Name only | No toggle |

### SearchBox

- **Name** mode: existing `fetchCards` ILIKE. Unchanged.
- **Effects** mode: NL input + chips. Chips are the tag list; clicking one appends its label to the query text (keeps one code path: everything goes through the parser/cache). Placeholder and icon change with mode. Mode is a prop with a per-route default.
- Show the parsed `filter` back to the user as removable chips ("Bench damage × · 2 energy × · Poison ×") so a wrong parse is visible and fixable. Removing a chip re-submits.

### Results card

Card image, name, and matched tags. Group indicator "+2 prints" when `otherPrints.length > 0`. Clicking a result in `/builder` adds the canonical print; a small print picker lets the user swap art.

### Deck panel

- 20 slots, count badge per card, running total.
- Validation messages: "Need N more cards", "Only 2 copies of {name} allowed".
- Optional deck energy types (1–3), encoded in the URL as `e=`.
- Copy link, Clear.

---

## Deck URL Format

```
/builder?v=1&deck=A1-1,A1-94x2,P-A-12,B2a-7&e=water,grass
```

- `v` — format version (start at 1).
- `deck` — comma-separated refs `{setCode}-{number}` with optional `x{count}` (1–2). Set codes contain hyphens, so parse with a regex, not `split("-")`:

  ```ts
  const REF_RE = /^([A-Za-z0-9]+(?:-[A-Za-z]+)?)-(\d{1,3})(?:x([12]))?$/;
  ```
- `e` — optional deck energy types.
- Decode is server-tolerant: unknown refs are dropped with a toast, never a crash. Validation (20 cards, ≤ 2 per name) runs on the decoded deck before enabling share.

---

## Data Import Pipeline

### Source (pinned)

```
https://raw.githubusercontent.com/marcelpanse/tcg-pocket-collection-tracker/<COMMIT_SHA>/frontend/assets/cards.json
```

Bump the SHA deliberately when adopting a new set. Validate the whole payload with a Zod `SourceCard` schema first; unknown shape → abort before touching the DB.

### `scripts/import-cards.ts`

1. Fetch + Zod-validate payload.
2. Upsert `Set` rows from `set-map.ts` (throw on unknown code).
3. For each card: normalize (see Source Data), derive `imageUrl`, `rarity`, `isTradeable`, `cardType`, `stage`/`trainerType`.
4. Upsert `Card` on `(setId, number)`. **Never delete.** Cards present in DB but absent from source are reported, not removed.
5. Replace `Attack` and `CardEffect` rows for that card (delete + insert inside a transaction — these have no external references).
6. Run `tagAttack` / `tagEffect`.
7. Print a diff report: sets touched, cards created/updated/unchanged, cards-only-in-DB, per-set counts vs source, tagger stats (attacks with 0 tags, most common tags).
8. Exit non-zero if any set's imported count ≠ source count.

```json
"import:cards": "tsx scripts/import-cards.ts",
"import:cards:dry": "tsx scripts/import-cards.ts --dry-run"
```

### When a new set drops

1. Wait for collection-tracker to ship it (typically days).
2. Add the code → name entry to `set-map.ts`; bump the pinned SHA.
3. `npm run import:cards:dry` → review report → `npm run import:cards`.
4. If tagger rules changed: truncate `SearchQueryCache`.
5. Fallback if the tracker is slow: scrape [pocket.limitlesstcg.com](https://pocket.limitlesstcg.com) into the same `SourceCard` shape (selectors in [LucachuTW `card.py`](https://github.com/LucachuTW/CARDS-PokemonPocket-scrapper)). **Do not** use an LLM to extract card text.

---

## Scripts Cleanup

### End state

```
scripts/
  import-cards.ts
  lib/
    source-schema.ts     # Zod for collection-tracker payload
    normalize.ts         # damage/name fix, No Cost, trainer junk, nullables
    set-map.ts           # code → name (+ existing setName → code for migration)
    rarity-map.ts        # symbol → code, tradeable flags
    tagger.ts            # pure tag functions
    image-url.ts         # derive Limitless URLs
  __tests__/
    tagger.golden.test.ts
    normalize.test.ts
    deck-url.test.ts
```

### Remove in Phase 4

`scripts/main.py`, `scrape_sets.py`, `parse_sets.py`, `findErrors.py`, `requirements.txt`, and all `scripts/{set}/*.html|json` caches. `prisma/seed.ts` becomes a thin wrapper that calls the importer (or is removed if the import script is the seed).

---

## Verification Plan

| Check | How | When |
|-------|-----|------|
| Tagger golden set | ~40 hand-picked attacks/effects → expected tags (`tagger.golden.test.ts`) | CI |
| Normalizer | damage/name repair, `No Cost`, trainer junk stripping, nullables | CI |
| Deck URL round-trip | encode → decode for hyphenated set codes, counts, invalid refs | CI |
| Import idempotency | run import twice → second run reports 0 created/updated | manual, each import |
| Count assertions | per-set imported count == source count; script exits non-zero otherwise | each import |
| Trade integrity | `SELECT count(*) FROM "_CardToTrade" t LEFT JOIN "Card" c ON … WHERE c.card_id IS NULL` = 0 after migration | once, post-migration |
| Image URLs | HEAD 1 random card per set → 200 | each import |
| LLM eval set | ~30 queries → expected FilterJSON (exact for structured fields, tag-set equality) | manual, on prompt/schema change |
| Search smoke | the five example queries above return ≥ 1 card each against prod data | after import / deploy |

---

## Dependencies to Add

- `ai`, `@ai-sdk/google`
- `zod`
- `vitest` (or reuse whatever test runner exists) for `scripts/__tests__`

---

## Implementation Phases

### Phase 1 — Data foundation

- [ ] Migration: `Set.code`, `Set.releaseDate`; flatten `Card`; `Attack`, `CardEffect`; drop `Details`/`WeaknessType`/`RetreatCost`; GIN + tsvector indexes
- [ ] In-place backfill of `Set.code` and `Card.number`; trade-integrity check
- [ ] `scripts/lib/*` + `import-cards.ts` with dry-run and report
- [ ] Golden tests for tagger, normalizer
- [ ] Run import; verify counts, image HEADs
- [ ] Replace every Serebii touchpoint (table above); add Limitless to `remotePatterns`

### Phase 2 — Search

- [ ] `SearchQueryCache` migration
- [ ] `FilterJSON` schema + Gemini prompt + LLM eval set
- [ ] `POST /api/search` — guards, cache, SQL with EXISTS semantics, FTS fallback, grouping/ranking/pagination
- [ ] WAF rate-limit rule
- [ ] `SearchBox` Name/Effects toggle, chips, parsed-filter chips
- [ ] Results grid with matched tags and print grouping
- [ ] Wire into `/dex`

### Phase 3 — Deck builder

- [ ] `/builder` split pane, deck state, print picker
- [ ] URL encode/decode (`v`, `deck`, `e`) + tests
- [ ] Validation: 20 cards, ≤ 2 per name
- [ ] Copy link

### Phase 4 — Cleanup

- [ ] Delete Serebii scripts and caches; slim/remove `seed.ts`
- [ ] Rewrite `ADD_NEW_SETS.md` for the import workflow
- [ ] Remove Serebii from `remotePatterns`

---

## Out of Scope (v1)

- Auto deck generation; deck-aware search
- DB-persisted decks, user collections, public deck gallery
- LLM extraction of card text on import
- Card images in `public/`; Vercel Blob (only if hotlinking is disallowed)
- Upstash / Redis (only if WAF rate limiting proves insufficient)
- Result-set caching
- Multi-language card text

---

## Resolved Decisions

- **Image hosting & licensing**: Limitless CDN URLs used directly for v1 (Next.js Image optimizes and caches at Vercel edge). Cloudflare R2 ($0 egress) planned for production migration if needed. Factual card data is credited to community resources (Limitless TCG & collection-tracker) in README / app footer.
- **Print grouping**: Controlled via `groupPrints: boolean` query param. Defaults to `true` on `/builder` (clean tactical view, no duplicate prints) and `false` on `/dex` (complete collector binder with all 286+ cards per set).

---

## References

- [collection-tracker cards.json](https://github.com/marcelpanse/tcg-pocket-collection-tracker/blob/main/frontend/assets/cards.json) — primary source
- [flibustier sets.json / rarities.json](https://github.com/flibustier/pokemon-tcg-pocket-database) — set code map, tradeable flags
- [LucachuTW Limitless scraper](https://github.com/LucachuTW/CARDS-PokemonPocket-scrapper) — fallback scrape selectors
- [R4PH1 effect indexes](https://github.com/R4PH1/PTCGP-Data/tree/main/data) — tag pattern reference
