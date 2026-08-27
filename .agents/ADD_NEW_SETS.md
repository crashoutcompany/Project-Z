# Adding New TCG Pocket Sets

This guide documents the process for adding new Pokémon TCG Pocket card sets to the project when they are released.

## Overview

Card set data is scraped from [Serebii.net TCG Pocket Sets](https://www.serebii.net/tcgpocket/sets.shtml) and parsed into JSON format for use in the application.

## Prerequisites

- Python 3.x installed
- Scraper dependencies: `pip install -r scripts/requirements.txt && python3 -m playwright install chromium`

## Process

### Step 1: Check for New Sets

1. Visit https://www.serebii.net/tcgpocket/sets.shtml
2. Compare the sets listed on Serebii with the folders in `/scripts/`
3. Identify any sets that are missing from the `/scripts/` folder

### Step 2: Add the Set to the Scraper

Use kebab-case folder names (lowercase, spaces to hyphens). Examples: `genetic-apex`, `space-time-smackdown`, `team-rockets-ambition`.

Add a `(folder, display name, serebii-path)` entry to `SETS` in `scripts/scrape_sets.py`. The scraper creates the folder if needed.

### Step 3: Scrape HTML + JSON with Playwright

```bash
cd scripts
python3 scrape_sets.py {set-name}
```

This fetches the live Serebii card list table and writes `{set-name}.html` and `{set-name}.json`. Do not fetch Serebii HTML with curl or BeautifulSoup; Playwright is required. `WebFetch` returns Markdown, not the card table.

### Step 4: Confirm Parser Output

`scrape_sets.py` already runs `parse_table` from `scripts/main.py`. To re-parse saved HTML without refetching, point `get_Input()` in `main.py` at the set files and run `python3 main.py`.

### Step 5: Verify the JSON Output

1. Check that the JSON file was created
2. Verify the JSON structure matches other sets (array of card objects)
3. Spot-check a few cards to ensure data was parsed correctly

### Step 6: Update Database Seed Script

Update `prisma/seed.ts` to include the new set:

1. **Add the import** at the top of the file:
   ```typescript
   import newSetName from "../scripts/{set-name}/{set-name}.json";
   ```

2. **Add the set upsert** (after the existing set upserts):
   ```typescript
   const newSetNameSet = await prisma.set.upsert({
     where: { setName: "Set Name" }, // Use exact set name from Serebii
     update: {},
     create: {
       setName: "Set Name",
       image: "/tcgpocket/sets/{set-name}.png",
     },
   });
   ```

3. **Add to the cards array**:
   ```typescript
   const cards = [
     // ... existing sets
     newSetName,
   ];
   ```

4. **Add the switch case** (in the switch statement for set IDs):
   ```typescript
   case "Set Name":
     setId = newSetNameSet.id;
     break;
   ```

**Important:** The `setName` in the switch case must match exactly what appears in the JSON file's `card.set.setName` field.

### Step 7: Run Database Seed

After updating the seed script, run it to populate the database:

```bash
npx prisma db seed
```

Or if using pnpm:

```bash
pnpm prisma db seed
```

## Set URL Patterns on Serebii

| Set Name | Serebii URL Path |
|----------|------------------|
| Genetic Apex | `/tcgpocket/geneticapex/` |
| Mythical Island | `/tcgpocket/mythicalisland/` |
| Space-time Smackdown | `/tcgpocket/space-timesmackdown/` |
| Triumphant Light | `/tcgpocket/triumphantlight/` |
| Shining Revelry | `/tcgpocket/shiningrevelry/` |
| Celestial Guardians | `/tcgpocket/celestialguardians/` |
| Extradimensional Crisis | `/tcgpocket/extradimensionalcrisis/` |
| Eevee Grove | `/tcgpocket/eeveegrove/` |
| Wisdom of Sea and Sky | `/tcgpocket/wisdomofseaandsky/` |
| Secluded Springs | `/tcgpocket/secludedsprings/` |
| Deluxe Pack ex | `/tcgpocket/deluxepackex/` |
| Mega Rising | `/tcgpocket/megarising/` |
| Crimson Blaze | `/tcgpocket/crimsonblaze/` |
| Fantastical Parade | `/tcgpocket/fantasticalparade/` |
| Paldean Wonders | `/tcgpocket/paldeanwonders/` |
| Mega Shine | `/tcgpocket/megashine/` |
| Pulsing Aura | `/tcgpocket/pulsingaura/` |
| Paradox Drive | `/tcgpocket/paradoxdrive/` |
| Everyday Wonders | `/tcgpocket/everydaywonders/` |
| Ruler of the Skies | `/tcgpocket/ruleroftheskies/` |
| Team Rocket's Ambition | `/tcgpocket/teamrocket'sambition/` |
| Promo-A | `/tcgpocket/promo-a/` |
| Promo-B | `/tcgpocket/promo-b/` |

## JSON Output Structure

Each card in the JSON array has the following structure:

```json
{
    "set": {
        "setName": "Genetic Apex",
        "image": "/tcgpocket/image/diamond1.png",
        "pokedex": "Genetic Apex1 / 226"
    },
    "thumbnail": "/tcgpocket/th/geneticapex/1.jpg",
    "name": "Bulbasaur",
    "url": "/tcgpocket/geneticapex/001.shtml",
    "details": {
        "hp": "70HP",
        "type": "/tcgpocket/image/grass.png",
        "weakness": {
            "image": "/tcgpocket/image/fire.png",
            "value": "20"
        },
        "retreat": {
            "image": "/tcgpocket/image/colorless.png",
            "count": "1"
        }
    },
    "expansion": "mewtwo.png",
    "rarity": "/tcgpocket/image/diamond1.png"
}
```

## Troubleshooting

### Only a few rows in extracted table (e.g. 4 rows instead of 90+)
Serebii’s card list table has **nested tables** (each card’s “Card Details” cell contains an inner `<table>`). `scripts/scrape_sets.py` uses Playwright to serialize the live DOM `outerHTML` of the table whose header contains “Set Number” and “Card Name”, which preserves nested tables.

If you are debugging a saved full page instead: extract the card list table by **bracket counting** rather than BeautifulSoup `find('table', class_='dextable')`, which may stop at the first inner `</table>`.

The parser expects a single table; it skips rows with fewer than 5 `<td>`s, so inner detail rows are ignored.

### Unicode/encoding errors when reading HTML
If you see `UnicodeDecodeError` (e.g. `byte 0xe9`) when opening the saved HTML, the page may use Latin-1 or contain characters like é (e.g. in “Pokémon”). Open the file with `encoding='utf-8', errors='replace'` (or the appropriate encoding) when reading.

### Parser skips rows
- Check if the HTML table structure matches expected format
- Ensure rows have at least 5 columns (`<td>` elements)
- Check the `findErrors.py` script for debugging

### Missing data in JSON
- Trainer cards may have different structure (no HP, weakness, retreat)
- Check if the source HTML has the expected nested table structure
- Serebii HTML can occasionally have malformed tags (e.g. extra `</td>`); the parser skips bad rows and continues

## Current Sets (as of August 2026)

**In `/scripts/` folder (21 main sets + 2 promo sets):**
| Set Name | Folder | Cards |
|----------|--------|-------|
| Genetic Apex | genetic-apex | 286 |
| Mythical Island | mythical-islands | 86 |
| Space-time Smackdown | space-time-smackdown | 207 |
| Triumphant Light | triumphant-light | 96 |
| Shining Revelry | shining-revelry | 112 |
| Celestial Guardians | celestial-guardians | 239 |
| Extradimensional Crisis | extradimensional-crisis | 103 |
| Eevee Grove | eevee-grove | 107 |
| Wisdom of Sea and Sky | wisdom-of-sea-and-sky | 241 |
| Secluded Springs | secluded-springs | 105 |
| Deluxe Pack ex | deluxe-pack-ex | 379 |
| Mega Rising | mega-rising | 331 |
| Crimson Blaze | crimson-blaze | 103 |
| Fantastical Parade | fantastical-parade | 234 |
| Paldean Wonders | paldean-wonders | 131 |
| Mega Shine | mega-shine | 117 |
| Pulsing Aura | pulsing-aura | 234 |
| Paradox Drive | paradox-drive | 109 |
| Everyday Wonders | everyday-wonders | 106 |
| Ruler of the Skies | ruler-of-the-skies | 233 |
| Team Rocket's Ambition | team-rockets-ambition | 110 |
| Promo-A | promo-a | 109 |
| Promo-B | promo-b | 86 |

**Note:** Serebii loads card tables via JavaScript. Use `scripts/scrape_sets.py` (Playwright) to scrape new sets rather than raw HTTP requests.
