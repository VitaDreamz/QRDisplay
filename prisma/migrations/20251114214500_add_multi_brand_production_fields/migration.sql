-- Add missing multi-brand fields to organizations table
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandTier" TEXT DEFAULT 'free';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandStatus" TEXT DEFAULT 'pending';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "maxStoresPerMonth" INTEGER DEFAULT 5;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "maxSampleProducts" INTEGER DEFAULT 1;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "maxFullSizeProducts" INTEGER DEFAULT 2;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "storesAddedThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "lastMonthlyReset" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "currentActiveStores" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "transactionFeePercent" DOUBLE PRECISION DEFAULT 5.0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "monthlyPlatformFee" DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "onboardingStep" TEXT NOT NULL DEFAULT 'registration';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "customerServiceEmail" TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "customerServicePhone" TEXT;

-- Add missing multi-brand fields to stores table
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "platformId" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "rechargeCustomerId" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "rechargeSubscriptionId" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP(3);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "customerSlotsGranted" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "samplesPerQuarter" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 5.0;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "promoReimbursementRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "salesRepName" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "salesRepEmail" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "salesRepPhone" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "address2" TEXT;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "storeCredit" DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "maxBrandPartnerships" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "activeBrandCount" INTEGER NOT NULL DEFAULT 0;

-- Add missing fields to customers table
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lastSampleDate" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "returningPromoSlug" TEXT;

-- Add missing Shopify fields to products table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shopifyProductId" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "shopifyVariantId" TEXT;
