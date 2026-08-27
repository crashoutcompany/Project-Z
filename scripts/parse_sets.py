#!/usr/bin/env python3
"""Parse all set HTML files in scripts/ to JSON."""

import json
import os
import sys

from main import parse_table

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

SETS = [
    "team-rockets-ambition",
    "ruler-of-the-skies",
    "everyday-wonders",
    "paradox-drive",
    "pulsing-aura",
    "mega-shine",
    "paldean-wonders",
    "promo-a",
    "promo-b",
]


def parse_set(folder: str) -> int:
    html_path = os.path.join(SCRIPT_DIR, folder, f"{folder}.html")
    json_path = os.path.join(SCRIPT_DIR, folder, f"{folder}.json")

    if not os.path.exists(html_path):
        print(f"  ✗ {folder}: HTML not found")
        return 0

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    cards = json.loads(parse_table(html))
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(cards, f, indent=4)

    print(f"  ✓ {folder}: {len(cards)} cards")
    return len(cards)


def main():
    folders = sys.argv[1:] if len(sys.argv) > 1 else SETS
    total = sum(parse_set(folder) for folder in folders)
    print(f"\nDone. {total} cards across {len(folders)} sets.")


if __name__ == "__main__":
    main()
