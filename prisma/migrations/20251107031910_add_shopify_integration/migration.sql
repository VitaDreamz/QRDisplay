-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "attributedStoreId" TEXT,
ADD COLUMN     "sampleDate" TIMESTAMP(3),
ADD COLUMN     "shopifyCustomerId" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3),
ADD COLUMN     "syncedToShopify" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "attributionWindow" INTEGER DEFAULT 30,
ADD COLUMN     "commissionRate" DOUBLE PRECISION DEFAULT 10.0,
ADD COLUMN     "shopifyAccessToken" TEXT,
ADD COLUMN     "shopifyActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shopifyApiKey" TEXT,
ADD COLUMN     "shopifyApiSecret" TEXT,
ADD COLUMN     "shopifyConnectedAt" TIMESTAMP(3),
ADD COLUMN     "shopifyStoreName" TEXT,
ADD COLUMN     "shopifyWebhookSecret" TEXT;

-- CreateTable
CREATE TABLE "conversions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "sampleDate" TIMESTAMP(3) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "daysToConversion" INTEGER NOT NULL,
    "attributed" BOOLEAN NOT NULL DEFAULT true,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopify_webhook_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "webhookId" TEXT,
    "topic" TEXT NOT NULL,
    "shopifyOrderId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopify_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversions_orgId_idx" ON "conversions"("orgId");

-- CreateIndex
CREATE INDEX "conversions_customerId_idx" ON "conversions"("customerId");

-- CreateIndex
CREATE INDEX "conversions_storeId_idx" ON "conversions"("storeId");

-- CreateIndex
CREATE INDEX "conversions_shopifyOrderId_idx" ON "conversions"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "shopify_webhook_logs_orgId_idx" ON "shopify_webhook_logs"("orgId");

-- CreateIndex
CREATE INDEX "shopify_webhook_logs_shopifyOrderId_idx" ON "shopify_webhook_logs"("shopifyOrderId");

-- CreateIndex
CREATE INDEX "shopify_webhook_logs_status_idx" ON "shopify_webhook_logs"("status");

-- CreateIndex
CREATE INDEX "customers_shopifyCustomerId_idx" ON "customers"("shopifyCustomerId");

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("orgId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("memberId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("storeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopify_webhook_logs" ADD CONSTRAINT "shopify_webhook_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("orgId") ON DELETE RESTRICT ON UPDATE CASCADE;
