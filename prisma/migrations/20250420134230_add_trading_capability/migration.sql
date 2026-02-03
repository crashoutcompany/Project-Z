-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('ACTIVE', 'PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Providers" AS ENUM ('GOOGLE', 'GITHUB');

-- CreateTable
CREATE TABLE "Trade" (
    "trade_id" SERIAL NOT NULL,
    "trade_creation_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "identifier" TEXT NOT NULL,
    "provider" "Providers" NOT NULL,
    "is_seeking" BOOLEAN NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("trade_id")
);

-- CreateTable
CREATE TABLE "TradeLink" (
    "trade_link_id" SERIAL NOT NULL,
    "trade_link_creation_id" TEXT NOT NULL,
    "requesting_trade_id" INTEGER NOT NULL,
    "receiving_trade_id" INTEGER NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "requesting_status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "receiving_status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "accepted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeLink_pkey" PRIMARY KEY ("trade_link_id")
);

-- CreateTable
CREATE TABLE "_CardToTrade" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CardToTrade_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trade_trade_creation_id_key" ON "Trade"("trade_creation_id");

-- CreateIndex
CREATE UNIQUE INDEX "TradeLink_trade_link_creation_id_key" ON "TradeLink"("trade_link_creation_id");

-- CreateIndex
CREATE UNIQUE INDEX "TradeLink_requesting_trade_id_receiving_trade_id_key" ON "TradeLink"("requesting_trade_id", "receiving_trade_id");

-- CreateIndex
CREATE INDEX "_CardToTrade_B_index" ON "_CardToTrade"("B");

-- AddForeignKey
ALTER TABLE "TradeLink" ADD CONSTRAINT "TradeLink_requesting_trade_id_fkey" FOREIGN KEY ("requesting_trade_id") REFERENCES "Trade"("trade_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeLink" ADD CONSTRAINT "TradeLink_receiving_trade_id_fkey" FOREIGN KEY ("receiving_trade_id") REFERENCES "Trade"("trade_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToTrade" ADD CONSTRAINT "_CardToTrade_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("card_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToTrade" ADD CONSTRAINT "_CardToTrade_B_fkey" FOREIGN KEY ("B") REFERENCES "Trade"("trade_id") ON DELETE CASCADE ON UPDATE CASCADE;
