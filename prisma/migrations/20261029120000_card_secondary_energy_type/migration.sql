-- AlterTable
ALTER TABLE "Card" ADD COLUMN "secondaryEnergyType" TEXT;

-- CreateIndex
CREATE INDEX "Card_secondaryEnergyType_idx" ON "Card"("secondaryEnergyType");
