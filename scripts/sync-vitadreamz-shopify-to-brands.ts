/**
 * Copy VitaDreamz Shopify credentials to all VitaDreamz brand sub-orgs
 * For testing purposes, all brands use the same Shopify store
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncShopifyToBrands() {
  console.log('🔍 Looking for main VitaDreamz organization...');
  
  // Find the main VitaDreamz org (platform or parent org)
  const mainOrg = await prisma.organization.findFirst({
    where: {
      OR: [
        { orgId: 'ORG-VD001' }, // Main VitaDreamz org
        { name: { contains: 'VitaDreamz', mode: 'insensitive' } },
      ],
      shopifyAccessToken: { not: null }, // Must have Shopify configured
    },
    select: {
      orgId: true,
      name: true,
      shopifyStoreName: true,
      shopifyAccessToken: true,
      shopifyApiKey: true,
      shopifyApiSecret: true,
      shopifyWebhookSecret: true,
      shopifyActive: true,
    },
  });

  if (!mainOrg) {
    console.error('❌ Could not find main VitaDreamz organization with Shopify configured');
    console.log('\n💡 Looking for ANY org with Shopify configured...');
    
    const anyOrgWithShopify = await prisma.organization.findFirst({
      where: { shopifyAccessToken: { not: null } },
      select: {
        orgId: true,
        name: true,
        shopifyStoreName: true,
      },
    });
    
    if (anyOrgWithShopify) {
      console.log('Found:', anyOrgWithShopify);
      console.log('\n📝 Please update the script with the correct orgId');
    } else {
      console.log('❌ No organizations have Shopify configured!');
    }
    
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Found main org:', {
    orgId: mainOrg.orgId,
    name: mainOrg.name,
    shopifyStoreName: mainOrg.shopifyStoreName,
    hasToken: !!mainOrg.shopifyAccessToken,
  });

  // Find all VitaDreamz brand sub-orgs
  const brandOrgs = await prisma.organization.findMany({
    where: {
      orgId: { in: ['ORG-VSV3I', 'ORG-VBEN2', 'ORG-VC9L4'] },
    },
    select: {
      id: true,
      orgId: true,
      name: true,
      shopifyStoreName: true,
      shopifyAccessToken: true,
    },
  });

  console.log(`\n📦 Found ${brandOrgs.length} brand organizations to update:`);
  brandOrgs.forEach(b => {
    console.log(`  - ${b.name} (${b.orgId}) - Currently has Shopify: ${!!b.shopifyAccessToken}`);
  });

  console.log('\n🔄 Copying Shopify credentials...');

  for (const brand of brandOrgs) {
    await prisma.organization.update({
      where: { id: brand.id },
      data: {
        shopifyStoreName: mainOrg.shopifyStoreName,
        shopifyAccessToken: mainOrg.shopifyAccessToken,
        shopifyApiKey: mainOrg.shopifyApiKey,
        shopifyApiSecret: mainOrg.shopifyApiSecret,
        shopifyWebhookSecret: mainOrg.shopifyWebhookSecret,
        shopifyActive: true,
        shopifyConnectedAt: new Date(),
      },
    });
    
    console.log(`  ✅ Updated ${brand.name}`);
  }

  console.log('\n✨ Success! All brand organizations now have Shopify configured:');
  console.log(`   Store: ${mainOrg.shopifyStoreName}`);
  console.log(`   Brands: ${brandOrgs.map(b => b.name).join(', ')}`);
  
  await prisma.$disconnect();
}

syncShopifyToBrands().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
