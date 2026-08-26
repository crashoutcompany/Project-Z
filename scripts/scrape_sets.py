#!/usr/bin/env python3
"""Scrape missing TCG Pocket sets from Serebii using Playwright and parse to JSON."""

import json
import os
import sys

from playwright.sync_api import sync_playwright

from main import parse_table

SETS = [
    ("team-rockets-ambition", "Team Rocket's Ambition", "/tcgpocket/teamrocket'sambition/"),
    ("ruler-of-the-skies", "Ruler of the Skies", "/tcgpocket/ruleroftheskies/"),
    ("everyday-wonders", "Everyday Wonders", "/tcgpocket/everydaywonders/"),
    ("paradox-drive", "Paradox Drive", "/tcgpocket/paradoxdrive/"),
    ("pulsing-aura", "Pulsing Aura", "/tcgpocket/pulsingaura/"),
    ("mega-shine", "Mega Shine", "/tcgpocket/megashine/"),
    ("paldean-wonders", "Paldean Wonders", "/tcgpocket/paldeanwonders/"),
    ("promo-a", "Promo-A", "/tcgpocket/promo-a/"),
    ("promo-b", "Promo-B", "/tcgpocket/promo-b/"),
]

BASE_URL = "https://www.serebii.net"


def scrape_set(page, folder: str, set_name: str, path: str) -> int:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    set_dir = os.path.join(script_dir, folder)
    os.makedirs(set_dir, exist_ok=True)

    html_path = os.path.join(set_dir, f"{folder}.html")
    json_path = os.path.join(set_dir, f"{folder}.json")

    url = BASE_URL + path.replace("'", "%27")
    print(f"Fetching {set_name}...")
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("table.dextable tr:nth-child(2)", timeout=30000)

    table_html = page.eval_on_selector(
        "table.dextable",
        "el => el ? el.outerHTML : null",
    )
    if not table_html:
        raise ValueError(f"No dextable found at {url}")

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(table_html)

    cards = json.loads(parse_table(table_html))
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=4)

    print(f"  ✓ {set_name}: {len(cards)} cards")
    return len(cards)


def main():
    folders = {s[0] for s in SETS}
    if len(sys.argv) > 1:
        requested = sys.argv[1:]
        sets_to_scrape = [s for s in SETS if s[0] in requested]
    else:
        sets_to_scrape = SETS

    total = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            for folder, set_name, path in sets_to_scrape:
                total += scrape_set(page, folder, set_name, path)
        finally:
            browser.close()

    print(f"\nDone. {total} cards across {len(sets_to_scrape)} sets.")


if __name__ == "__main__":
    main()
