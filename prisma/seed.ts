// use relative imports

import { CardType, PrismaClient } from "./generated/client/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import mythicalIslands from "../scripts/mythical-islands/mythical-islands.json";
import geneticApex from "../scripts/genetic-apex/genetic-apex.json";
import spaceTimeSmackDown from "../scripts/space-time-smackdown/space-time-smackdown.json";
import triumphantLight from "../scripts/triumphant-light/triumphant-light.json";
import shiningRevelry from "../scripts/shining-revelry/shining-revelry.json";
import celestialGuardians from "../scripts/celestial-guardians/celestial-guardians.json";
import extraDimensionalCrisis from "../scripts/extradimensional-crisis/extradimensional-crisis.json";
import eeveeGrove from "../scripts/eevee-grove/eevee-grove.json";
import wisdomOfSeaAndSky from "../scripts/wisdom-of-sea-and-sky/wisdom-of-sea-and-sky.json";
import secludedSprings from "../scripts/secluded-springs/secluded-springs.json";
import deluxePackEx from "../scripts/deluxe-pack-ex/deluxe-pack-ex.json";
import megaRising from "../scripts/mega-rising/mega-rising.json";
import crimsonBlaze from "../scripts/crimson-blaze/crimson-blaze.json";
import fantasticalParade from "../scripts/fantastical-parade/fantastical-parade.json";
import paldeanWonders from "../scripts/paldean-wonders/paldean-wonders.json";
import megaShine from "../scripts/mega-shine/mega-shine.json";
import pulsingAura from "../scripts/pulsing-aura/pulsing-aura.json";
import paradoxDrive from "../scripts/paradox-drive/paradox-drive.json";
import everydayWonders from "../scripts/everyday-wonders/everyday-wonders.json";
import rulerOfTheSkies from "../scripts/ruler-of-the-skies/ruler-of-the-skies.json";
import teamRocketsAmbition from "../scripts/team-rockets-ambition/team-rockets-ambition.json";
import promoA from "../scripts/promo-a/promo-a.json";
import promoB from "../scripts/promo-b/promo-b.json";

// Configure Neon for WebSocket connections
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const SET_CODES: Record<string, string> = {
  "Genetic Apex": "A1",
  "Mythical Island": "A1a",
  "Space-time Smackdown": "A2",
  "Triumphant Light": "A2a",
  "Shining Revelry": "A2b",
  "Celestial Guardians": "A3",
  "Extradimensional Crisis": "A3a",
  "Eevee Grove": "A3b",
  "Wisdom of Sea and Sky": "A4",
  "Secluded Springs": "A4a",
  "Deluxe Pack ex": "A4b",
  "Mega Rising": "B1",
  "Crimson Blaze": "B1a",
  "Fantastical Parade": "B2",
  "Paldean Wonders": "B2a",
  "Mega Shine": "B2b",
  "Pulsing Aura": "B3",
  "Paradox Drive": "B3a",
  "Everyday Wonders": "B3b",
  "Ruler of the Skies": "B4",
  "Team Rocket's Ambition": "B4a",
  "Promo-A": "P-A",
  "Promo-B": "P-B",
};

function deriveImageUrl(code: string, number: number): string {
  const pad = String(number).padStart(3, "0");
  return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${pad}_EN_SM.webp`;
}

function imageBasename(path: string | undefined): string | null {
  if (!path) return null;
  const name = path.split("/").pop()?.split(".")[0];
  return name && name !== "Unknown type" ? name : null;
}

// ! When adding new sets make sure to update the setName in the upsert calls below
// ! and the import paths to the JSON files in the imports section above.
// ! And add it to the switch statement in the main function to handle the set ID correctly.

/**
 * Seeds the database with predefined card sets and their flattened card records.
 *
 * Upserts all card sets and iterates through imported card data to create cards
 * keyed by (setId, number). Skips cards with missing required fields or unknown set names.
 */
async function main() {
  console.log("🌱 Starting database seed...");
  console.time("Seed duration");

  console.log("\n📦 Upserting card sets...");
  const geneticApexSet = await prisma.set.upsert({
    where: { setName: "Genetic Apex" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Genetic Apex",
      code: SET_CODES["Genetic Apex"],
      image: "/tcgpocket/sets/genetic-apex.png",
    },
  });
  console.log("  ✓ Genetic Apex (id: %d)", geneticApexSet.id);

  const mythicalIslandsSet = await prisma.set.upsert({
    where: { setName: "Mythical Island" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Mythical Island",
      code: SET_CODES["Mythical Island"],
      image: "/tcgpocket/sets/mythical-islands.png",
    },
  });
  console.log("  ✓ Mythical Island (id: %d)", mythicalIslandsSet.id);

  const spaceTimeSmackDownSet = await prisma.set.upsert({
    where: { setName: "Space-time Smackdown" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Space-time Smackdown",
      code: SET_CODES["Space-time Smackdown"],
      image: "/tcgpocket/sets/space-time-smackdown.png",
    },
  });
  console.log("  ✓ Space-time Smackdown (id: %d)", spaceTimeSmackDownSet.id);

  const triumphantLightSet = await prisma.set.upsert({
    where: { setName: "Triumphant Light" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Triumphant Light",
      code: SET_CODES["Triumphant Light"],
      image: "/tcgpocket/sets/triumphant-light.png",
    },
  });
  console.log("  ✓ Triumphant Light (id: %d)", triumphantLightSet.id);

  const shiningRevelrySet = await prisma.set.upsert({
    where: { setName: "Shining Revelry" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Shining Revelry",
      code: SET_CODES["Shining Revelry"],
      image: "/tcgpocket/sets/shining-revelry.png",
    },
  });
  console.log("  ✓ Shining Revelry (id: %d)", shiningRevelrySet.id);

  const celestialGuardiansSet = await prisma.set.upsert({
    where: { setName: "Celestial Guardians" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Celestial Guardians",
      code: SET_CODES["Celestial Guardians"],
      image: "/tcgpocket/sets/celestial-guardians.png",
    },
  });
  console.log("  ✓ Celestial Guardians (id: %d)", celestialGuardiansSet.id);

  const extraDimensionalCrisisSet = await prisma.set.upsert({
    where: { setName: "Extradimensional Crisis" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Extradimensional Crisis",
      code: SET_CODES["Extradimensional Crisis"],
      image: "/tcgpocket/sets/extra-dimensional-crisis.png",
    },
  });
  console.log("  ✓ Extradimensional Crisis (id: %d)", extraDimensionalCrisisSet.id);

  const eeveeGroveSet = await prisma.set.upsert({
    where: { setName: "Eevee Grove" },
    update: {},
    create: {
      setName: "Eevee Grove",
      code: SET_CODES["Eevee Grove"],
      image: "/tcgpocket/sets/eevee-grove.png",
    },
  });
  console.log("  ✓ Eevee Grove (id: %d)", eeveeGroveSet.id);

  const wisdomOfSeaAndSkySet = await prisma.set.upsert({
    where: { setName: "Wisdom of Sea and Sky" },
    update: {},
    create: {
      setName: "Wisdom of Sea and Sky",
      code: SET_CODES["Wisdom of Sea and Sky"],
      image: "/tcgpocket/sets/wisdom-of-sea-and-sky.png",
    },
  });
  console.log("  ✓ Wisdom of Sea and Sky (id: %d)", wisdomOfSeaAndSkySet.id);

  const secludedSpringsSet = await prisma.set.upsert({
    where: { setName: "Secluded Springs" },
    update: {},
    create: {
      setName: "Secluded Springs",
      code: SET_CODES["Secluded Springs"],
      image: "/tcgpocket/sets/secluded-springs.png",
    },
  });
  console.log("  ✓ Secluded Springs (id: %d)", secludedSpringsSet.id);

  const deluxePackExSet = await prisma.set.upsert({
    where: { setName: "Deluxe Pack ex" },
    update: {},
    create: {
      setName: "Deluxe Pack ex",
      code: SET_CODES["Deluxe Pack ex"],
      image: "/tcgpocket/sets/deluxe-pack-ex.png",
    },
  });
  console.log("  ✓ Deluxe Pack ex (id: %d)", deluxePackExSet.id);

  const megaRisingSet = await prisma.set.upsert({
    where: { setName: "Mega Rising" },
    update: {},
    create: {
      setName: "Mega Rising",
      code: SET_CODES["Mega Rising"],
      image: "/tcgpocket/sets/mega-rising.png",
    },
  });
  console.log("  ✓ Mega Rising (id: %d)", megaRisingSet.id);

  const crimsonBlazeSet = await prisma.set.upsert({
    where: { setName: "Crimson Blaze" },
    update: {},
    create: {
      setName: "Crimson Blaze",
      code: SET_CODES["Crimson Blaze"],
      image: "/tcgpocket/sets/crimson-blaze.png",
    },
  });
  console.log("  ✓ Crimson Blaze (id: %d)", crimsonBlazeSet.id);

  const fantasticalParadeSet = await prisma.set.upsert({
    where: { setName: "Fantastical Parade" },
    update: {},
    create: {
      setName: "Fantastical Parade",
      code: SET_CODES["Fantastical Parade"],
      image: "/tcgpocket/sets/fantastical-parade.png",
    },
  });
  console.log("  ✓ Fantastical Parade (id: %d)", fantasticalParadeSet.id);

  const paldeanWondersSet = await prisma.set.upsert({
    where: { setName: "Paldean Wonders" },
    update: {},
    create: {
      setName: "Paldean Wonders",
      code: SET_CODES["Paldean Wonders"],
      image: "/tcgpocket/sets/paldean-wonders.png",
    },
  });
  console.log("  ✓ Paldean Wonders (id: %d)", paldeanWondersSet.id);

  const megaShineSet = await prisma.set.upsert({
    where: { setName: "Mega Shine" },
    update: {},
    create: {
      setName: "Mega Shine",
      code: SET_CODES["Mega Shine"],
      image: "/tcgpocket/sets/mega-shine.png",
    },
  });
  console.log("  ✓ Mega Shine (id: %d)", megaShineSet.id);

  const pulsingAuraSet = await prisma.set.upsert({
    where: { setName: "Pulsing Aura" },
    update: {},
    create: {
      setName: "Pulsing Aura",
      code: SET_CODES["Pulsing Aura"],
      image: "/tcgpocket/sets/pulsing-aura.png",
    },
  });
  console.log("  ✓ Pulsing Aura (id: %d)", pulsingAuraSet.id);

  const paradoxDriveSet = await prisma.set.upsert({
    where: { setName: "Paradox Drive" },
    update: {},
    create: {
      setName: "Paradox Drive",
      code: SET_CODES["Paradox Drive"],
      image: "/tcgpocket/sets/paradox-drive.png",
    },
  });
  console.log("  ✓ Paradox Drive (id: %d)", paradoxDriveSet.id);

  const everydayWondersSet = await prisma.set.upsert({
    where: { setName: "Everyday Wonders" },
    update: {},
    create: {
      setName: "Everyday Wonders",
      code: SET_CODES["Everyday Wonders"],
      image: "/tcgpocket/sets/everyday-wonders.png",
    },
  });
  console.log("  ✓ Everyday Wonders (id: %d)", everydayWondersSet.id);

  const rulerOfTheSkiesSet = await prisma.set.upsert({
    where: { setName: "Ruler of the Skies" },
    update: {},
    create: {
      setName: "Ruler of the Skies",
      code: SET_CODES["Ruler of the Skies"],
      image: "/tcgpocket/sets/ruler-of-the-skies.png",
    },
  });
  console.log("  ✓ Ruler of the Skies (id: %d)", rulerOfTheSkiesSet.id);

  const teamRocketsAmbitionSet = await prisma.set.upsert({
    where: { setName: "Team Rocket's Ambition" },
    update: {},
    create: {
      setName: "Team Rocket's Ambition",
      code: SET_CODES["Team Rocket's Ambition"],
      image: "/tcgpocket/sets/team-rockets-ambition.png",
    },
  });
  console.log("  ✓ Team Rocket's Ambition (id: %d)", teamRocketsAmbitionSet.id);

  const promoASet = await prisma.set.upsert({
    where: { setName: "Promo-A" },
    update: {},
    create: {
      setName: "Promo-A",
      code: SET_CODES["Promo-A"],
      image: "/tcgpocket/sets/promo-a.png",
    },
  });
  console.log("  ✓ Promo-A (id: %d)", promoASet.id);

  const promoBSet = await prisma.set.upsert({
    where: { setName: "Promo-B" },
    update: {},
    create: {
      setName: "Promo-B",
      code: SET_CODES["Promo-B"],
      image: "/tcgpocket/sets/promo-b.png",
    },
  });
  console.log("  ✓ Promo-B (id: %d)", promoBSet.id);

  const cardSets: { cards: typeof shiningRevelry; setName: string }[] = [
    { cards: shiningRevelry, setName: "Shining Revelry" },
    { cards: triumphantLight, setName: "Triumphant Light" },
    { cards: spaceTimeSmackDown, setName: "Space-time Smackdown" },
    { cards: mythicalIslands, setName: "Mythical Island" },
    { cards: geneticApex, setName: "Genetic Apex" },
    { cards: celestialGuardians, setName: "Celestial Guardians" },
    { cards: extraDimensionalCrisis, setName: "Extradimensional Crisis" },
    { cards: eeveeGrove, setName: "Eevee Grove" },
    { cards: wisdomOfSeaAndSky, setName: "Wisdom of Sea and Sky" },
    { cards: secludedSprings, setName: "Secluded Springs" },
    { cards: deluxePackEx, setName: "Deluxe Pack ex" },
    { cards: megaRising, setName: "Mega Rising" },
    { cards: crimsonBlaze, setName: "Crimson Blaze" },
    { cards: fantasticalParade, setName: "Fantastical Parade" },
    { cards: paldeanWonders, setName: "Paldean Wonders" },
    { cards: megaShine, setName: "Mega Shine" },
    { cards: pulsingAura, setName: "Pulsing Aura" },
    { cards: paradoxDrive, setName: "Paradox Drive" },
    { cards: everydayWonders, setName: "Everyday Wonders" },
    { cards: rulerOfTheSkies, setName: "Ruler of the Skies" },
    { cards: teamRocketsAmbition, setName: "Team Rocket's Ambition" },
    { cards: promoA, setName: "Promo-A" },
    { cards: promoB, setName: "Promo-B" },
  ];

  let totalUpserted = 0;
  let totalSkipped = 0;

  console.log("\n🃏 Processing cards...");

  for (const { cards: curr, setName } of cardSets) {
    let setUpserted = 0;
    let setSkipped = 0;

    for (const card of curr) {
      if (!card.name || !card.set?.pokedex) {
        setSkipped++;
        continue;
      }
      let setId: number;

      switch (card.set.setName) {
        case "Genetic Apex":
          setId = geneticApexSet.id;
          break;
        case "Mythical Island":
          setId = mythicalIslandsSet.id;
          break;
        case "Space-time Smackdown":
          setId = spaceTimeSmackDownSet.id;
          break;
        case "Triumphant Light":
          setId = triumphantLightSet.id;
          break;
        case "Shining Revelry":
          setId = shiningRevelrySet.id;
          break;
        case "Celestial Guardians":
          setId = celestialGuardiansSet.id;
          break;
        case "Extradimensional Crisis":
          setId = extraDimensionalCrisisSet.id;
          break;
        case "Eevee Grove":
          setId = eeveeGroveSet.id;
          break;
        case "Wisdom of Sea and Sky":
          setId = wisdomOfSeaAndSkySet.id;
          break;
        case "Secluded Springs":
          setId = secludedSpringsSet.id;
          break;
        case "Deluxe Pack ex":
          setId = deluxePackExSet.id;
          break;
        case "Mega Rising":
          setId = megaRisingSet.id;
          break;
        case "Crimson Blaze":
          setId = crimsonBlazeSet.id;
          break;
        case "Fantastical Parade":
          setId = fantasticalParadeSet.id;
          break;
        case "Paldean Wonders":
          setId = paldeanWondersSet.id;
          break;
        case "Mega Shine":
          setId = megaShineSet.id;
          break;
        case "Pulsing Aura":
          setId = pulsingAuraSet.id;
          break;
        case "Paradox Drive":
          setId = paradoxDriveSet.id;
          break;
        case "Everyday Wonders":
          setId = everydayWondersSet.id;
          break;
        case "Ruler of the Skies":
          setId = rulerOfTheSkiesSet.id;
          break;
        case "Team Rocket's Ambition":
          setId = teamRocketsAmbitionSet.id;
          break;
        case "Promo-A":
          setId = promoASet.id;
          break;
        case "Promo-B":
          setId = promoBSet.id;
          break;
        default:
          console.warn(`  ⚠ Unknown set name: ${card.set.setName} (card: ${card.name})`);
          setSkipped++;
          continue; // Skip this card if the set name is unknown
      }

      const number = parseInt(
        card.set.pokedex.split(card.set.setName)[1]?.split("/")[0] ?? "",
        10,
      );
      if (!Number.isFinite(number)) {
        setSkipped++;
        continue;
      }

      const energyType = imageBasename(card.details.type);
      const setCode = SET_CODES[card.set.setName];
      if (!setCode) {
        setSkipped++;
        continue;
      }
      const hp = Number(card.details.hp.replace(/\D/g, "")) || null;
      const retreatCost = Number(card.details.retreat.count) || null;

      await prisma.card.upsert({
        where: {
          setId_number: {
            setId,
            number,
          },
        },
        update: {},
        create: {
          name: card.name,
          number,
          setId,
          cardType: energyType ? CardType.POKEMON : CardType.TRAINER,
          imageUrl: deriveImageUrl(setCode, number),
          rarity: card.rarity,
          energyType,
          hp,
          isEx: card.name.toLowerCase().includes(" ex"),
          weakness: imageBasename(card.details.weakness.image),
          retreatCost,
        },
      });
      setUpserted++;
    }

    totalUpserted += setUpserted;
    totalSkipped += setSkipped;
    console.log("  ✓ %s: %d cards upserted, %d skipped", setName, setUpserted, setSkipped);
  }

  console.log("\n✅ Seeding complete!");
  console.log("   Total: %d cards upserted, %d skipped", totalUpserted, totalSkipped);
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.timeEnd("Seed duration");
    await prisma.$disconnect();
    console.log("👋 Disconnected from database");
  });
