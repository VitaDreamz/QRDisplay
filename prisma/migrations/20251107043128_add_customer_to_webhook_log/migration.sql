-- AlterTable
ALTER TABLE "shopify_webhook_logs" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "shopify_webhook_logs_customerId_idx" ON "shopify_webhook_logs"("customerId");

-- AddForeignKey
ALTER TABLE "shopify_webhook_logs" ADD CONSTRAINT "shopify_webhook_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
