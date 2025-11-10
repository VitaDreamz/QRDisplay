import prisma from '../lib/prisma';

async function migratePromoRedemptionOrgIds() {
  console.log('🔍 Migrating PromoRedemption.orgId to use Organization.id...\n');

  // Get VitaDreamz org
  const vitaDreamz = await prisma.organization.findUnique({
    where: { orgId: 'ORG-VITADREAMZ' },
    select: { id: true, orgId: true, name: true }
  });

  if (!vitaDreamz) {
    throw new Error('VitaDreamz org not found!');
  }

  console.log(`VitaDreamz org: ${vitaDreamz.name}`);
  console.log(`  orgId (old): ${vitaDreamz.orgId}`);
  console.log(`  id (new):    ${vitaDreamz.id}\n`);

  // Step 1: Drop the foreign key constraint
  console.log('1️⃣  Dropping foreign key constraint...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "promo_redemptions" 
    DROP CONSTRAINT IF EXISTS "promo_redemptions_orgId_fkey"
  `);
  console.log('✅ Constraint dropped\n');

  // Step 2: Update all orgId values
  console.log('2️⃣  Updating orgId values...');
  const result = await prisma.$executeRawUnsafe(`
    UPDATE "promo_redemptions"
    SET "orgId" = $1
    WHERE "orgId" = $2
  `, vitaDreamz.id, 'ORG-VITADREAMZ');
  console.log(`✅ Updated ${result} redemptions\n`);

  // Step 3: Add new foreign key constraint
  console.log('3️⃣  Adding new foreign key constraint...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "promo_redemptions"
    ADD CONSTRAINT "promo_redemptions_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
  `);
  console.log('✅ New constraint added\n');

  // Verify
  const check = await prisma.promoRedemption.findMany({
    select: { id: true, orgId: true, promoOffer: true }
  });

  console.log('🔍 Verification:');
  console.log(`Total redemptions: ${check.length}`);
  console.log(`All use orgId: ${check[0]?.orgId}`);
  console.log(`Expected: ${vitaDreamz.id}`);
  console.log(`Match: ${check[0]?.orgId === vitaDreamz.id ? '✅' : '❌'}`);
}

migratePromoRedemptionOrgIds()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
