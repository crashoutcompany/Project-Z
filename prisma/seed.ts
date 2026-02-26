// use relative imports

import { PrismaClient } from "./generated/client/client";
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

// Configure Neon for WebSocket connections
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  console.error("❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// ! When adding new sets make sure to update the setName in the upsert calls below
// ! and the import paths to the JSON files in the imports section above.
// ! And add it to the switch statement in the main function to handle the set ID correctly.

/**
 * Seeds the database with predefined card sets and their associated cards, including detailed card attributes and relations.
 *
 * Upserts five card sets and iterates through imported card data to create card records with nested details, retreat costs, and weakness types. Skips cards with missing required fields or unknown set names.
 *
 * @remark Cards missing a name or set pokedex, or belonging to an unknown set, are skipped and not inserted.
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
      image: "/tcgpocket/sets/genetic-apex.png",
    },
  });
  console.log("  ✓ Genetic Apex (id: %d)", geneticApexSet.id);

  const mythicalIslandsSet = await prisma.set.upsert({
    where: { setName: "Mythical Island" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Mythical Island",
      image: "/tcgpocket/sets/mythical-islands.png",
    },
  });
  console.log("  ✓ Mythical Island (id: %d)", mythicalIslandsSet.id);

  const spaceTimeSmackDownSet = await prisma.set.upsert({
    where: { setName: "Space-time Smackdown" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Space-time Smackdown",
      image: "/tcgpocket/sets/space-time-smackdown.png",
    },
  });
  console.log("  ✓ Space-time Smackdown (id: %d)", spaceTimeSmackDownSet.id);

  const triumphantLightSet = await prisma.set.upsert({
    where: { setName: "Triumphant Light" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Triumphant Light",
      image: "/tcgpocket/sets/triumphant-light.png",
    },
  });
  console.log("  ✓ Triumphant Light (id: %d)", triumphantLightSet.id);

  const shiningRevelrySet = await prisma.set.upsert({
    where: { setName: "Shining Revelry" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Shining Revelry",
      image: "/tcgpocket/sets/shining-revelry.png",
    },
  });
  console.log("  ✓ Shining Revelry (id: %d)", shiningRevelrySet.id);

  const celestialGuardiansSet = await prisma.set.upsert({
    where: { setName: "Celestial Guardians" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Celestial Guardians",
      image: "/tcgpocket/sets/celestial-guardians.png",
    },
  });
  console.log("  ✓ Celestial Guardians (id: %d)", celestialGuardiansSet.id);

  const extraDimensionalCrisisSet = await prisma.set.upsert({
    where: { setName: "Extradimensional Crisis" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Extradimensional Crisis",
      image: "/tcgpocket/sets/extra-dimensional-crisis.png",
    },
  });
  console.log("  ✓ Extradimensional Crisis (id: %d)", extraDimensionalCrisisSet.id);

  const eeveeGroveSet = await prisma.set.upsert({
    where: { setName: "Eevee Grove" },
    update: {},
    create: {
      setName: "Eevee Grove",
      image: "/tcgpocket/sets/eevee-grove.png",
    },
  });
  console.log("  ✓ Eevee Grove (id: %d)", eeveeGroveSet.id);

  const wisdomOfSeaAndSkySet = await prisma.set.upsert({
    where: { setName: "Wisdom of Sea and Sky" },
    update: {},
    create: {
      setName: "Wisdom of Sea and Sky",
      image: "/tcgpocket/sets/wisdom-of-sea-and-sky.png",
    },
  });
  console.log("  ✓ Wisdom of Sea and Sky (id: %d)", wisdomOfSeaAndSkySet.id);

  const secludedSpringsSet = await prisma.set.upsert({
    where: { setName: "Secluded Springs" },
    update: {},
    create: {
      setName: "Secluded Springs",
      image: "/tcgpocket/sets/secluded-springs.png",
    },
  });
  console.log("  ✓ Secluded Springs (id: %d)", secludedSpringsSet.id);

  const deluxePackExSet = await prisma.set.upsert({
    where: { setName: "Deluxe Pack ex" },
    update: {},
    create: {
      setName: "Deluxe Pack ex",
      image: "/tcgpocket/sets/deluxe-pack-ex.png",
    },
  });
  console.log("  ✓ Deluxe Pack ex (id: %d)", deluxePackExSet.id);

  const megaRisingSet = await prisma.set.upsert({
    where: { setName: "Mega Rising" },
    update: {},
    create: {
      setName: "Mega Rising",
      image: "/tcgpocket/sets/mega-rising.png",
    },
  });
  console.log("  ✓ Mega Rising (id: %d)", megaRisingSet.id);

  const crimsonBlazeSet = await prisma.set.upsert({
    where: { setName: "Crimson Blaze" },
    update: {},
    create: {
      setName: "Crimson Blaze",
      image: "/tcgpocket/sets/crimson-blaze.png",
    },
  });
  console.log("  ✓ Crimson Blaze (id: %d)", crimsonBlazeSet.id);

  const fantasticalParadeSet = await prisma.set.upsert({
    where: { setName: "Fantastical Parade" },
    update: {},
    create: {
      setName: "Fantastical Parade",
      image: "/tcgpocket/sets/fantastical-parade.png",
    },
  });
  console.log("  ✓ Fantastical Parade (id: %d)", fantasticalParadeSet.id);

  const paldeanWondersSet = await prisma.set.upsert({
    where: { setName: "Paldean Wonders" },
    update: {},
    create: {
      setName: "Paldean Wonders",
      image: "/tcgpocket/sets/paldean-wonders.png",
    },
  });
  console.log("  ✓ Paldean Wonders (id: %d)", paldeanWondersSet.id);

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
        default:
          console.warn(`  ⚠ Unknown set name: ${card.set.setName} (card: ${card.name})`);
          setSkipped++;
          continue; // Skip this card if the set name is unknown
      }

      const type = card.details.type.split("/").pop()?.split(".")[0];
      const pokedex = card.set.pokedex.split(card.set.setName)[1].trim();

      // Upsert the card and its details
      await prisma.card.upsert({
        where: {
          name_setId_pokedex: {
            name: card.name,
            setId: setId,
            pokedex: pokedex,
          },
        },
        update: {}, // No update, or specify fields to update if needed
        create: {
          name: card.name,
          type: type || "Unknown type",
          image: card.thumbnail,
          setId: setId,
          expansion: card.expansion,
          pokedex,
          url: card.url,
          thumbnail: card.thumbnail,
          rarity: card.rarity,
          details: {
            create: {
              hp: Number(card.details.hp.replace(/\D/g, "")) || -1,
              type: card.details.type || "Unknown type",
              retreatCost: {
                connectOrCreate: {
                  create: {
                    image: card.details.retreat.image,
                    count: Number(card.details.retreat.count) || -1,
                  },
                  where: {
                    imageCount: {
                      count: Number(card.details.retreat.count) || -1,
                      image: card.details.retreat.image,
                    },
                  },
                },
              },
              weaknessType: {
                connectOrCreate: {
                  create: {
                    image: card.details.weakness.image,
                    value: card.details.weakness.value,
                  },
                  where: {
                    imageValue: {
                      image: card.details.weakness.image,
                      value: card.details.weakness.value,
                    },
                  },
                },
              },
            },
          },
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
