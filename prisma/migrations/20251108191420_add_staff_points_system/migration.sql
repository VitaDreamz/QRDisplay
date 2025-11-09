-- Add staff gamification fields
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "totalPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "quarterlyPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "lastQuarterReset" TIMESTAMP(3);

-- Create staff point transactions table
CREATE TABLE IF NOT EXISTS "staff_point_transactions" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "customerId" TEXT,
    "conversionId" TEXT,
    "purchaseIntentId" TEXT,
    "quarter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_point_transactions_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "staff_point_transactions_staffId_idx" ON "staff_point_transactions"("staffId");
CREATE INDEX IF NOT EXISTS "staff_point_transactions_storeId_idx" ON "staff_point_transactions"("storeId");
CREATE INDEX IF NOT EXISTS "staff_point_transactions_orgId_idx" ON "staff_point_transactions"("orgId");
CREATE INDEX IF NOT EXISTS "staff_point_transactions_quarter_idx" ON "staff_point_transactions"("quarter");
CREATE INDEX IF NOT EXISTS "staff_point_transactions_type_idx" ON "staff_point_transactions"("type");

-- Add foreign keys
ALTER TABLE "staff_point_transactions" ADD CONSTRAINT "staff_point_transactions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_point_transactions" ADD CONSTRAINT "staff_point_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
