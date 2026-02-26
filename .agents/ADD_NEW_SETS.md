# Adding New TCG Pocket Sets

This guide documents the process for adding new Pokémon TCG Pocket card sets to the project when they are released.

## Overview

Card set data is scraped from [Serebii.net TCG Pocket Sets](https://www.serebii.net/tcgpocket/sets.shtml) and parsed into JSON format for use in the application.

## Prerequisites

- Python 3.x installed
- `beautifulsoup4` package installed (`pip install beautifulsoup4`)

## Process

### Step 1: Check for New Sets

1. Visit https://www.serebii.net/tcgpocket/sets.shtml
2. Compare the sets listed on Serebii with the folders in `/scripts/`
3. Identify any sets that are missing from the `/scripts/` folder

### Step 2: Create Set Folder

Create a new folder in `/scripts/` using the set name in kebab-case (lowercase with hyphens):

```bash
mkdir scripts/{set-name}
```

**Naming Convention:**
- Use lowercase letters only
- Replace spaces with hyphens
- Examples:
  - "Genetic Apex" → `genetic-apex`
  - "Space-time Smackdown" → `space-time-smackdown`
  - "Wisdom of Sea and Sky" → `wisdom-of-sea-and-sky`
  - "Deluxe Pack ex" → `deluxe-pack-ex`

### Step 3: Fetch the Set Table HTML

**For AI Agents (Recommended):**

Use the `cursor-browser-extension` MCP to extract raw HTML:

1. Navigate to the set page using `browser_navigate`:
   ```
   browser_navigate({ url: "https://www.serebii.net/tcgpocket/{serebii-path}/" })
   ```

2. Extract the table HTML using `browser_evaluate`:
   ```
   browser_evaluate({ function: "() => { const table = document.querySelector('table.dextable'); return table ? table.outerHTML : 'No table found'; }" })
   ```

3. The output is a JavaScript string - you'll need to unescape it:
   - Remove the leading and trailing quotes
   - Replace `\"` with `"`
   - Replace `\n` with newlines
   - Replace `\t` with tabs

4. Save the unescaped HTML to `scripts/{set-name}/{set-name}.html`

**For Manual Process:**

1. Go to the specific set page on Serebii (e.g., `https://www.serebii.net/tcgpocket/geneticapex/`)
2. Open browser Developer Tools (F12 or right-click → Inspect)
3. Find the `<table class="dextable">` element containing the card data
4. Copy the entire table HTML including the opening and closing `<table>` tags
5. Save it to `scripts/{set-name}/{set-name}.html`

**Note:** The `WebFetch` tool returns Markdown, not raw HTML, so it cannot be used for this task.

### Step 4: Run the Parser Script

Update `scripts/main.py` to point to your new set:

```python
# Get input file paths
file_to_read, file_to_write = get_Input(
    "{set-name}/{set-name}.html",
    "{set-name}/{set-name}.json"
)
```

Then run the script:

```bash
cd scripts
python main.py
```

This will generate the `{set-name}.json` file in the same folder.

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

### Parser skips rows
- Check if the HTML table structure matches expected format
- Ensure rows have at least 5 columns (`<td>` elements)
- Check the `findErrors.py` script for debugging

### Missing data in JSON
- Trainer cards may have different structure (no HP, weakness, retreat)
- Check if the source HTML has the expected nested table structure

## Current Sets (as of February 2026)

**In `/scripts/` folder (14 main sets):**
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

**Promo sets (optional):**
- promo-a
- promo-b
