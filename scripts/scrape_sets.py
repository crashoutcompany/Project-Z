#!/usr/bin/env python3
"""Scrape TCG Pocket sets from Serebii using Playwright and parse them to JSON.

Usage:
    python scripts/scrape_sets.py team-rockets-ambition
    python scripts/scrape_sets.py                 # scrape every known set
"""

from __future__ import annotations

import json
import os
import sys

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from main import parse_table

# folder slug -> (display name, Serebii path)
SETS = [
    ("team-rockets-ambition", "Team Rocket's Ambition", "/tcgpocket/teamrocket'sambition/"),
    ("ruler-of-the-skies", "Ruler of the Skies", "/tcgpocket/ruleroftheskies/"),
    ("everyday-wonders", "Everyday Wonders", "/tcgpocket/everydaywonders/"),
    ("paradox-drive", "Paradox Drive", "/tcgpocket/paradoxdrive/"),
    ("pulsing-aura", "Pulsing Aura", "/tcgpocket/pulsingaura/"),
    ("mega-shine", "Mega Shine", "/tcgpocket/megashine/"),
    ("paldean-wonders", "Paldean Wonders", "/tcgpocket/paldeanwonders/"),
    ("fantastical-parade", "Fantastical Parade", "/tcgpocket/fantasticalparade/"),
    ("crimson-blaze", "Crimson Blaze", "/tcgpocket/crimsonblaze/"),
    ("mega-rising", "Mega Rising", "/tcgpocket/megarising/"),
    ("deluxe-pack-ex", "Deluxe Pack ex", "/tcgpocket/deluxepackex/"),
    ("secluded-springs", "Secluded Springs", "/tcgpocket/secludedsprings/"),
    ("wisdom-of-sea-and-sky", "Wisdom of Sea and Sky", "/tcgpocket/wisdomofseaandsky/"),
    ("eevee-grove", "Eevee Grove", "/tcgpocket/eeveegrove/"),
    ("extradimensional-crisis", "Extradimensional Crisis", "/tcgpocket/extradimensionalcrisis/"),
    ("celestial-guardians", "Celestial Guardians", "/tcgpocket/celestialguardians/"),
    ("shining-revelry", "Shining Revelry", "/tcgpocket/shiningrevelry/"),
    ("triumphant-light", "Triumphant Light", "/tcgpocket/triumphantlight/"),
    ("space-time-smackdown", "Space-time Smackdown", "/tcgpocket/space-timesmackdown/"),
    ("mythical-islands", "Mythical Island", "/tcgpocket/mythicalisland/"),
    ("genetic-apex", "Genetic Apex", "/tcgpocket/geneticapex/"),
    ("promo-a", "Promo-A", "/tcgpocket/promo-a/"),
    ("promo-b", "Promo-B", "/tcgpocket/promo-b/"),
]

BASE_URL = "https://www.serebii.net"

EXTRACT_CARD_TABLE_JS = """() => {
  const tables = Array.from(document.querySelectorAll('table.dextable'));
  const cardTable = tables.find((table) => {
    const header = table.querySelector('tr');
    const text = header ? header.textContent || '' : '';
    return text.includes('Set Number') && text.includes('Card Name');
  });
  return cardTable ? cardTable.outerHTML : null;
}"""

CARD_TABLE_READY_JS = """() => {
  const tables = Array.from(document.querySelectorAll('table.dextable'));
  const cardTable = tables.find((table) => {
    const header = table.querySelector('tr');
    const text = header ? header.textContent || '' : '';
    return text.includes('Set Number') && text.includes('Card Name');
  });
  if (!cardTable) return false;
  return cardTable.querySelectorAll('tr').length > 2;
}"""


def scrape_set(page, folder: str, set_name: str, path: str) -> int:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    set_dir = os.path.join(script_dir, folder)
    os.makedirs(set_dir, exist_ok=True)

    html_path = os.path.join(set_dir, f"{folder}.html")
    json_path = os.path.join(set_dir, f"{folder}.json")

    url = BASE_URL + path.replace("'", "%27")
    print(f"Fetching {set_name} from {url}...")
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_function(CARD_TABLE_READY_JS, timeout=45000)
    except PlaywrightTimeoutError as exc:
        raise RuntimeError(
            f"{set_name}: card list table never populated at {url}. "
            "The set page may not be published yet."
        ) from exc

    table_html = page.evaluate(EXTRACT_CARD_TABLE_JS)
    if not table_html:
        raise ValueError(f"No card list dextable found at {url}")

    with open(html_path, "w", encoding="utf-8") as handle:
        handle.write(table_html)

    cards = json.loads(parse_table(table_html))
    if not cards:
        raise RuntimeError(
            f"{set_name}: parsed 0 cards from {url}. HTML saved to {html_path}."
        )

    with open(json_path, "w", encoding="utf-8") as handle:
        json.dump(cards, handle, indent=4)
        handle.write("\n")

    print(f"  ✓ {set_name}: {len(cards)} cards")
    return len(cards)


def main() -> None:
    if len(sys.argv) > 1:
        requested = sys.argv[1:]
        known = {entry[0]: entry for entry in SETS}
        unknown = [slug for slug in requested if slug not in known]
        if unknown:
            raise SystemExit(f"Unknown set slug(s): {', '.join(unknown)}")
        sets_to_scrape = [known[slug] for slug in requested]
    else:
        sets_to_scrape = SETS

    total = 0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            for folder, set_name, path in sets_to_scrape:
                total += scrape_set(page, folder, set_name, path)
        finally:
            browser.close()

    print(f"\nDone. {total} cards across {len(sets_to_scrape)} sets.")


if __name__ == "__main__":
    main()
