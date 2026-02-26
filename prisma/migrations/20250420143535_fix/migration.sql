/*
  Warnings:

  - You are about to drop the column `isPrivate` on the `Trade` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Card" ALTER COLUMN "rarity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "isPrivate",
ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false;
