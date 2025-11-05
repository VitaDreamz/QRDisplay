-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "currentStage" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "stageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "availableProducts" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "msrp" DECIMAL(10,2),
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_intents" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "originalPrice" DECIMAL(10,2) NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "finalPrice" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifySlug" TEXT NOT NULL,
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_intents_verifySlug_key" ON "purchase_intents"("verifySlug");

-- CreateIndex
CREATE INDEX "purchase_intents_customerId_idx" ON "purchase_intents"("customerId");

-- CreateIndex
CREATE INDEX "purchase_intents_storeId_idx" ON "purchase_intents"("storeId");

-- CreateIndex
CREATE INDEX "purchase_intents_productSku_idx" ON "purchase_intents"("productSku");

-- AddForeignKey
ALTER TABLE "purchase_intents" ADD CONSTRAINT "purchase_intents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_intents" ADD CONSTRAINT "purchase_intents_productSku_fkey" FOREIGN KEY ("productSku") REFERENCES "products"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;
