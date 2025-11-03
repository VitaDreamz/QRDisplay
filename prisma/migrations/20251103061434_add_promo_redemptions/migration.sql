-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "promoRedeemed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promoRedeemedAt" TIMESTAMP(3),
ADD COLUMN     "promoSlug" TEXT;

-- CreateTable
CREATE TABLE "promo_redemptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "promoOffer" TEXT NOT NULL,
    "promoSlug" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedBy" TEXT,
    "purchaseAmount" DECIMAL(10,2),
    "discountAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promo_redemptions_promoSlug_key" ON "promo_redemptions"("promoSlug");

-- CreateIndex
CREATE INDEX "promo_redemptions_customerId_idx" ON "promo_redemptions"("customerId");

-- CreateIndex
CREATE INDEX "promo_redemptions_storeId_idx" ON "promo_redemptions"("storeId");

-- CreateIndex
CREATE INDEX "promo_redemptions_orgId_idx" ON "promo_redemptions"("orgId");

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
