const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  console.log('🔍 Looking for org with Shopify configured...');
  
  const mainOrg = await prisma.organization.findFirst({
    where: { shopifyAccessToken: { not: null } },
  });

  if (!mainOrg) {
    console.error('❌ No orgs have Shopify!');
    await prisma.$disconnect();
    return;
  }

  console.log(`✅ Found: ${mainOrg.name}`);

  const brands = await prisma.organization.findMany({
    where: { orgId: { in: ['ORG-VSV3I', 'ORG-VBEN2', 'ORG-VC9L4'] } },
  });

  console.log(`\n📦 Updating ${brands.length} brands...`);

  for (const brand of brands) {
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
    console.log(`  ✅ ${brand.name}`);
  }

  console.log(`\n✨ Done! All brands use: ${mainOrg.shopifyStoreName}`);
  await prisma.$disconnect();
}

sync().catch(console.error);
