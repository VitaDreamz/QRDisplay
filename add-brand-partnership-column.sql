-- Add brandPartnershipId column and index to store_credit_transactions
ALTER TABLE store_credit_transactions ADD COLUMN IF NOT EXISTS "brandPartnershipId" TEXT;
CREATE INDEX IF NOT EXISTS "store_credit_transactions_brandPartnershipId_idx" ON store_credit_transactions("brandPartnershipId");
