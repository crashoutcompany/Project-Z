# Project Z: missing search tags (data-grounded)

**Dataset:** the pinned `cards.json` (tcg-pocket-collection-tracker @ 9fafc07) has 4,547 printings: 4,131 Pokémon and 416 Trainers. After removing reprints, that leaves 1,255 unique attack texts and 368 unique ability/trainer texts. Counts below are unique (card name + text) entries, so reprints count once.
**Note:** this is **TCG Pocket** data, not the paper TCG. VSTAR/GX rules, Item lock via Abilities, "damage counters" (0 hits), and Prize cards don't exist. Pocket uses **points**, the **Energy Zone**, and `−20 damage` wording.

## High priority (common + players search for them)
| Tag | Scope | Meaning | ~Count | Examples | Suggested regex |
|---|---|---|---|---|---|
| `self_energy_discard` (split of energy_discard) | attack | Discards its own Energy as a cost | 70 attacks | Alolan Golem: "Discard 2 [L] Energy from this Pokémon." | `discard (all\|an?\|\d+\|a random) .*energy from this pokémon` |
| `energy_removal` | both | Discards the opponent's Energy | 21 attacks, 3 effects | Beedrill ex: "Discard a random Energy from your opponent's Active Pokémon."; Team Rocket Grunt | `discard .*energy from (your opponent's\|the defending)` |
| `snipe` | attack | Hits one chosen benched Pokémon (current bench_damage lumps this with spread) | ~100 bench-related attacks | Absol: "does 30 damage to 1 of your opponent's Benched Pokémon." | `damage to 1 of your opponent's (benched )?pokémon` |
| `damage_reduction` | both | Takes less damage or prevents damage | 53 attacks, 34 effects | Carbink: "prevent all damage from—and effects of—attacks"; Aegislash: "takes −80 damage from…Pokémon ex" | `takes? −\d+ damage\|prevent all damage` |
| `self_damage` / recoil | attack | Attacker damages itself | 58 attacks | Arcanine: "This Pokémon also does 20 damage to itself." | `damage to itself` |
| `gust` | both | Pulls up or forces out the opponent's Active | 8 attacks, 13 effects | Cyrus / Blue's Provocation: "Switch in 1 of your opponent's Benched Pokémon to the Active Spot"; Hariyama: "Switch out your opponent's Active Pokémon" | `switch (in\|out) (1 of )?your opponent's` |
| `self_switch` / pivot | both | Swaps your own Active with the Bench | 20 attacks, 6 effects | Abra: "Switch this Pokémon with 1 of your Benched Pokémon."; Greninja ex | `switch (this pokémon\|your active).*with` |
| `cant_retreat` | attack | Defending Pokémon can't retreat | 17 attacks | Arbok: "the Defending Pokémon can't retreat." | `defending pokémon can't retreat` |
| `attack_lock_self` (drawback) | attack | Can't attack next turn | 22 attacks | Aggron: "During your next turn, this Pokémon can't attack." | `this pokémon can't (attack\|use)` |
| `damage_boost` (support) | both | Boosts other attacks: "do +X damage" | 3 attacks, 25 effects | Aegislash: "Attacks used by your [P]… do +30 damage"; Happiny | `do \+\d+ damage` |
| `bench_search` / put onto Bench | both | Benches Basics straight from the deck | 12 attacks, 6 effects | Combee: "Put 1 random Basic Pokémon from your deck onto your Bench." | `from your deck onto your bench` |
| `hand_disruption` | both | Opponent's hand: discard, shuffle away, reset | 12 attacks, 6 effects | Red Card / Mars: "Your opponent shuffles their hand into their deck…"; Alolan Raticate: "Discard a random Item card from your opponent's hand." | `opponent's hand\|opponent shuffles their hand` |
| `pokemon_search` (search_deck for attacks) | attack | Fetches cards from the deck (search_deck is effect-only today) | 27 attacks | Caterpie: "Put 1 random [G] Pokémon from your deck into your hand." | `from your deck (into your hand\|onto)` |
| `tool_synergy` | both | Pokémon Tool related | ~10 attacks, ~25 tool effects | Absol: "If this Pokémon has a Pokémon Tool attached…"; Ambipom | `pokémon tool` |

## Medium priority
| Tag | Scope | Meaning | ~Count | Examples | Suggested regex |
|---|---|---|---|---|---|
| `energy_move` | both | Moves Energy between your Pokémon | 5 attacks, 14 effects | Dawn: "Move an Energy from 1 of your Benched Pokémon to your Active Pokémon."; Lunala | `move (all\|an?\|\d+) .*energy` |
| `energy_zone_attach` (true ramp) | both | Takes Energy from the Energy Zone and attaches it | ~35 attacks, ~25 effects | Blastoise: "take a [W] Energy from your Energy Zone and attach it to this Pokémon." | `energy zone and attach` |
| `energy_from_discard` | effect | Attaches Energy from the discard pile | 6 effects | Flame Patch, Dragonair | `energy from your discard pile` |
| `retaliate` | both | Damages the attacker when hit | 5 attacks, 10 effects | Chesnaught; Ferrothorn: "do 20 damage to the Attacking Pokémon." | `damage to the attacking pokémon` |
| `retreat_modifier` | both | Changes retreat cost (yours or theirs) | 6 attacks, 20 effects | Ariados: "Retreat Cost is 1 more"; Giratina: "has no Retreat Cost" | `retreat cost` |
| `opp_cost_increase` | both | Opponent's attacks cost more | 7 attacks, 2 effects | Aromatisse: "attacks used by the Defending Pokémon cost 1 [C] more"; Goomy | `cost \d+ \[\w\] more` |
| `cure_condition` | both | Removes or blocks Special Conditions | 1 attack, 9 effects | Full Heal; Comfey: "recovers from all Special Conditions" | `recovers? from all special conditions\|remove a random special condition\|can't be affected by any special` |
| `ex_counter` | both | Extra effect vs. or for Pokémon ex | 10 attacks, 11 effects | Ceruledge: "If your opponent's Active Pokémon is a Pokémon ex, this attack does 70 more damage" | `pokémon ex` |
| `ko_trigger` / revenge | both | Triggers on a Knock Out | 14 attacks, 17 effects | Bouffalant: "If any of your Pokémon were Knocked Out… 40 more damage"; Dusknoir | `knocked out` |
| `points_scaling` | both | Depends on points scored | 6 attacks, 8 effects | Luxray: "50 more damage for each point your opponent has gotten"; Beast Wall | `\bpoints?\b` |
| `supporter_lock` | both | Opponent can't play Supporters | 3 attacks, 1 effect | Gengar ex, Psyduck | `can't use any supporter` |
| `discard_recovery` | both | Puts cards from the discard pile into your hand | 1 attack, 5 effects (plus 11 total "from your discard pile") | Celestic Town Elder; Fisher | `from your discard pile.*into your hand` |
| `hp_boost` | effect | +HP tools and abilities | 8 effects | Giant Cape, Leaf Cape, Elegant Cape | `gets \+\d+ hp` |
| `may_fail` | attack | "If tails, this attack does nothing" | 48 attacks | Aipom, Alolan Diglett | `this attack does nothing` |
| `conditional_damage` | attack | "does X more damage if/for each…" (already in damageKind, but not split by trigger) | 287 attacks | Absol: "If your opponent's Active Pokémon is affected by a Special Condition, this attack does 60 more damage." | `this attack does \d+ more damage` |

## Low priority (rare or niche)
| Tag | Scope | Meaning | ~Count | Examples | Suggested regex |
|---|---|---|---|---|---|
| `mill` | both | Discards the top of the opponent's deck | 8 attacks, 1 effect | Dialga, Durant; Chandelure (Ability) | `discard the top .* opponent's deck` |
| `item_lock` | attack | Opponent can't play Items | 4 attacks | Chingling, Cryogonal, Exploud | `can't play any item` |
| `opp_attack_lock` | attack | Defending Pokémon can't attack | 5 attacks | Omastar, Eevee | `defending pokémon can't attack` |
| `copy_attack` | attack | Uses another Pokémon's attack | 6 attacks | Ditto, Clefairy | `use it as this attack` |
| `hand_size` | both | Depends on hand size | 5 attacks, 5 effects | Iono; Aipom | `cards in (your\|their) hand` |
| `stadium` | both | Stadium synergy | 10 attacks, 4 effects | Castform; Cabbie | `stadium` |
| `fossil` | effect | Fossil item played as a Pokémon | 11 | Helix / Dome Fossil | `play this card as if it were` |
| `shuffle_self` | attack | Shuffles itself back into the deck | 4 | Accelgor, Dunsparce | `shuffle this pokémon` |
| `energy_zone_lock` | attack | Opponent can't attach from the Energy Zone | 2 | Banette, Alolan Ninetales ex | `can't take any energy from their energy zone` |
| `instant_ko` | attack | Knock Out regardless of damage | 3 | Bewear, Armaldo | `is knocked out\.\|knock out` |
| `devolve`, `move_damage` | both | | 1 each | Celebi; Brambleghast | `devolve`; `move \d+ damage` |

## Mis-tagging in current tags
- **`energy_attach` (worst):** the "attach" + "energy" rule catches any text that says "Energy attached." **109 attacks are tagged, and ~70 aren't acceleration.** Examples: Alakazam "30 more damage for each Energy attached to your opponent's Active"; Altaria "2 or more different types of Energy attached"; Banette, where the opponent *can't* attach. **Effects: 48 tagged, ~15 false**, such as Irida "Heal 40… that has any [W] Energy attached" and Giratina "If this Pokémon has any Energy attached, it has no Retreat Cost." Fix: require `(energy zone and attach|attach (an?|\d+) .*energy|attach it to)`.
- **`energy_discard`:** the same pattern catches "discard **pile**." 6 of 18 effects are false, and they're actually attaches: Flame Patch, Dragonair, Flareon ex, Lusamine. On attacks, the 103 tagged mix self-discard (~70) with removing the opponent's Energy (~21), and those should be separate tags. Fix: `discard (all|an?|\d+|a random)? ?.{0,20}energy` and exclude `discard pile`.
- **Effect `bench_damage`:** "damage" + "bench" anywhere. **All 11 tagged effects are false positives**, including Lyra "Switch your Active Pokémon that has damage on it with 1 of your Benched," Cyrus, Brambleghast, and Electrical Cord. Fix: require `damage to (each of |1 of )?your opponent's (benched )?pokémon`.
- **Effect `prevent`:** `prevent|can't` catches 41 effects, and about 21 aren't protection. Examples are the 11 Fossils ("This card can't retreat"), Claydol "can't be healed," and Dusknoir "can't get any points." Fix: replace it with `damage_reduction` above plus targeted lock tags.
- **Effect `switch`:** 24 tagged, and 6 of them are gusting the opponent's Pokémon, not pivoting. Split it into `gust` and `self_switch`.
- **Conditions:** attacks only match "is now X," so these get missed: random or choice conditions (Alolan Muk ex, Dustox: "is now affected by that Special Condition"). "If the opponent is Burned/Asleep, more damage" cards (Heatmor, Breloom) aren't tagged as condition synergy. **Effects have no condition tags at all.** Poison, sleep, confusion, burn and paralysis show up in 2–7 effects each, such as Dustox's Ability. Suggest adding `condition_synergy` (attack: `if .* is (now )?(poisoned|burned|asleep|confused|paralyzed)|affected by a special condition`) and allowing `applies_condition`/`condition_*` on effects.
- **`ability_interaction`:** only 3 attacks (Honchkrow, Magearna, Minior). It's accurate but rarely useful.
- **`heal`:** it's accurate (52 attacks, 32 effects), but it can't tell self-heal from team heal. Consider `heal_bench`/`heal_all`.
