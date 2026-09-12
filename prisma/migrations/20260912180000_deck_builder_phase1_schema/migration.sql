-- 1. Create Enums
CREATE TYPE "CardType" AS ENUM ('POKEMON', 'TRAINER');
CREATE TYPE "Stage" AS ENUM ('BASIC', 'STAGE1', 'STAGE2');
CREATE TYPE "TrainerType" AS ENUM ('SUPPORTER', 'ITEM', 'TOOL', 'STADIUM');
CREATE TYPE "DamageKind" AS ENUM ('NONE', 'FIXED', 'PLUS', 'SCALING', 'MINUS');
CREATE TYPE "EffectKind" AS ENUM ('ABILITY', 'TRAINER');

-- 2. Alter Set: add code and releaseDate, backfill code, then make code NOT NULL & UNIQUE
ALTER TABLE "Set" ADD COLUMN "code" TEXT;
ALTER TABLE "Set" ADD COLUMN "releaseDate" TIMESTAMP(3);

UPDATE "Set" SET "code" = CASE "setName"
  WHEN 'Genetic Apex' THEN 'A1'
  WHEN 'Mythical Island' THEN 'A1a'
  WHEN 'Space-time Smackdown' THEN 'A2'
  WHEN 'Space-Time Smackdown' THEN 'A2'
  WHEN 'Triumphant Light' THEN 'A2a'
  WHEN 'Shining Revelry' THEN 'A2b'
  WHEN 'Celestial Guardians' THEN 'A3'
  WHEN 'Extradimensional Crisis' THEN 'A3a'
  WHEN 'Eevee Grove' THEN 'A3b'
  WHEN 'Wisdom of Sea and Sky' THEN 'A4'
  WHEN 'Secluded Springs' THEN 'A4a'
  WHEN 'Deluxe Pack ex' THEN 'A4b'
  WHEN 'Deluxe Pack: ex' THEN 'A4b'
  WHEN 'Mega Rising' THEN 'B1'
  WHEN 'Crimson Blaze' THEN 'B1a'
  WHEN 'Fantastical Parade' THEN 'B2'
  WHEN 'Paldean Wonders' THEN 'B2a'
  WHEN 'Mega Shine' THEN 'B2b'
  WHEN 'Pulsing Aura' THEN 'B3'
  WHEN 'Paradox Drive' THEN 'B3a'
  WHEN 'Everyday Wonders' THEN 'B3b'
  WHEN 'Ruler of the Skies' THEN 'B4'
  WHEN 'Team Rocket''s Ambition' THEN 'B4a'
  WHEN 'Promo-A' THEN 'P-A'
  WHEN 'Promo-B' THEN 'P-B'
  ELSE NULL
END;

ALTER TABLE "Set" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Set_code_key" ON "Set"("code");

-- 3. Alter Card: add new columns, backfill, alter constraints, drop old columns
ALTER TABLE "Card" ADD COLUMN "number" INTEGER;
ALTER TABLE "Card" ADD COLUMN "cardType" "CardType" NOT NULL DEFAULT 'POKEMON';
ALTER TABLE "Card" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Card" ADD COLUMN "pack" TEXT;
ALTER TABLE "Card" ADD COLUMN "energyType" TEXT;
ALTER TABLE "Card" ADD COLUMN "hp" INTEGER;
ALTER TABLE "Card" ADD COLUMN "stage" "Stage";
ALTER TABLE "Card" ADD COLUMN "isEx" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN "isBaby" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN "weakness" TEXT;
ALTER TABLE "Card" ADD COLUMN "retreatCost" INTEGER;
ALTER TABLE "Card" ADD COLUMN "trainerType" "TrainerType";

-- Backfill number from pokedex
UPDATE "Card" SET "number" = CAST(btrim(split_part(pokedex, '/', 1)) AS INT);
ALTER TABLE "Card" ALTER COLUMN "number" SET NOT NULL;

-- Backfill imageUrl derived from Limitless CDN
UPDATE "Card" c
SET "imageUrl" = 'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/' || s.code || '/' || s.code || '_' || lpad(c.number::text, 3, '0') || '_EN_SM.webp'
FROM "Set" s
WHERE c.set_id = s.set_id;
ALTER TABLE "Card" ALTER COLUMN "imageUrl" SET NOT NULL;

-- Backfill energyType, cardType, isEx
UPDATE "Card"
SET "energyType" = CASE WHEN type = 'Unknown type' THEN NULL ELSE type END,
    "cardType" = CASE WHEN type = 'Unknown type' THEN 'TRAINER'::"CardType" ELSE 'POKEMON'::"CardType" END,
    "isEx" = (name ILIKE '% ex');

-- Drop old unique index and add new unique index
DROP INDEX IF EXISTS "Card_name_set_id_pokedex_key";
CREATE UNIQUE INDEX "Card_set_id_number_key" ON "Card"("set_id", "number");

-- Indexes on Card
CREATE INDEX "Card_name_idx" ON "Card"("name");
CREATE INDEX "Card_cardType_stage_idx" ON "Card"("cardType", "stage");
CREATE INDEX "Card_energyType_idx" ON "Card"("energyType");

-- Drop legacy details/weakness/retreat tables BEFORE dropping card columns
DROP TABLE IF EXISTS "Details";
DROP TABLE IF EXISTS "WeaknessType";
DROP TABLE IF EXISTS "RetreatCost";

-- Drop old columns on Card
ALTER TABLE "Card" DROP COLUMN IF EXISTS "type";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "image";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "thumbnail";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "url";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "expansion";
ALTER TABLE "Card" DROP COLUMN IF EXISTS "pokedex";

-- 4. Create Attack table
CREATE TABLE "Attack" (
    "id" SERIAL NOT NULL,
    "card_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "damageRaw" TEXT NOT NULL,
    "damageBase" INTEGER,
    "damageKind" "DamageKind" NOT NULL,
    "energyCost" INTEGER NOT NULL,
    "energyTypes" TEXT[],
    "effectText" TEXT NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "Attack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attack_card_id_position_key" ON "Attack"("card_id", "position");
CREATE INDEX "Attack_energyCost_idx" ON "Attack"("energyCost");
CREATE INDEX "Attack_tags_idx" ON "Attack" USING GIN ("tags");
ALTER TABLE "Attack" ADD CONSTRAINT "Attack_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("card_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Create CardEffect table
CREATE TABLE "CardEffect" (
    "id" SERIAL NOT NULL,
    "card_id" INTEGER NOT NULL,
    "kind" "EffectKind" NOT NULL,
    "name" TEXT,
    "effectText" TEXT NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "CardEffect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CardEffect_card_id_kind_key" ON "CardEffect"("card_id", "kind");
CREATE INDEX "CardEffect_tags_idx" ON "CardEffect" USING GIN ("tags");
ALTER TABLE "CardEffect" ADD CONSTRAINT "CardEffect_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "Card"("card_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Postgres full-text generated columns + GIN indexes
ALTER TABLE "Attack" ADD COLUMN effect_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "effectText")) STORED;
ALTER TABLE "CardEffect" ADD COLUMN effect_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "effectText")) STORED;
CREATE INDEX "attack_effect_tsv_idx" ON "Attack" USING GIN (effect_tsv);
CREATE INDEX "card_effect_effect_tsv_idx" ON "CardEffect" USING GIN (effect_tsv);
