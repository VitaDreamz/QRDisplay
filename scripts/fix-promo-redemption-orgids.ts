import prisma from '../lib/prisma';

async function fixPromoRedemptionOrgIds() {
  console.log('🔍 Checking PromoRedemption foreign keys...\n');

  // Get all redemptions
  const redemptions = await prisma.promoRedemption.findMany({
    select: { id: true, orgId: true, promoOffer: true }
  });

  console.log(`Found ${redemptions.length} promo redemptions\n`);

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

  // Update all redemptions to use the CUID
  console.log('📝 Updating promo redemptions...');
  
  const updated = await prisma.promoRedemption.updateMany({
    where: { orgId: 'ORG-VITADREAMZ' },
    data: { orgId: vitaDreamz.id }
  });

  console.log(`✅ Updated ${updated.count} promo redemptions\n`);

  // Verify
  const check = await prisma.promoRedemption.findMany({
    select: { id: true, orgId: true, promoOffer: true }
  });

  console.log('🔍 Verification:');
  console.log(`All redemptions now use orgId: ${check[0]?.orgId}`);
  console.log(`Expected: ${vitaDreamz.id}`);
  console.log(`Match: ${check[0]?.orgId === vitaDreamz.id ? '✅' : '❌'}`);
}

fixPromoRedemptionOrgIds()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
