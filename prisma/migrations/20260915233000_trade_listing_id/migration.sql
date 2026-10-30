-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "listing_id" TEXT;

-- Backfill: each existing row is its own listing
UPDATE "Trade" SET "listing_id" = "trade_creation_id" WHERE "listing_id" IS NULL;

ALTER TABLE "Trade" ALTER COLUMN "listing_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Trade_listing_id_idx" ON "Trade"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_listing_id_is_seeking_key" ON "Trade"("listing_id", "is_seeking");

-- CreateIndex
CREATE INDEX "Trade_identifier_idx" ON "Trade"("identifier");

-- CreateIndex
CREATE INDEX "Trade_status_expires_at_idx" ON "Trade"("status", "expires_at");
