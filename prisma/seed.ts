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

// Configure Neon for WebSocket connections
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;
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
  console.time("Seeding started...");
  const geneticApexSet = await prisma.set.upsert({
    where: { setName: "Genetic Apex" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Genetic Apex",
      image: "/tcgpocket/sets/genetic-apex.png",
    },
  });

  const mythicalIslandsSet = await prisma.set.upsert({
    where: { setName: "Mythical Island" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Mythical Island",
      image: "/tcgpocket/sets/mythical-islands.png",
    },
  });

  const spaceTimeSmackDownSet = await prisma.set.upsert({
    where: { setName: "Space-time Smackdown" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Space-time Smackdown",
      image: "/tcgpocket/sets/space-time-smackdown.png",
    },
  });

  const triumphantLightSet = await prisma.set.upsert({
    where: { setName: "Triumphant Light" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Triumphant Light",
      image: "/tcgpocket/sets/triumphant-light.png",
    },
  });
  const shiningRevelrySet = await prisma.set.upsert({
    where: { setName: "Shining Revelry" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Shining Revelry",
      image: "/tcgpocket/sets/shining-revelry.png",
    },
  });

  const celestialGuardiansSet = await prisma.set.upsert({
    where: { setName: "Celestial Guardians" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Celestial Guardians",
      image: "/tcgpocket/sets/celestial-guardians.png",
    },
  });

  const extraDimensionalCrisisSet = await prisma.set.upsert({
    where: { setName: "Extradimensional Crisis" }, // Changed from id to setName
    update: {},
    create: {
      setName: "Extradimensional Crisis",
      image: "/tcgpocket/sets/extra-dimensional-crisis.png",
    },
  });

  const cards = [
    shiningRevelry,
    triumphantLight,
    spaceTimeSmackDown,
    mythicalIslands,
    geneticApex,
    celestialGuardians,
    extraDimensionalCrisis,
  ];

  while (cards.length > 0) {
    const curr = cards.pop()!;

    // Process each card
    for (const card of curr) {
      if (!card.name || !card.set?.pokedex) continue;
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
        default:
          console.error(`Unknown set name: ${card.set.setName}`);
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
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.timeEnd("Seeding started...");
    await prisma.$disconnect();
  });
