/**
 * Restore Shopify credentials to the three VitaDreamz test brands
 * All three brands use the same VitaDreamz Shopify store
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shopifyStoreName = 'vitadreamz.myshopify.com';
  const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyAccessToken) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not found in environment variables');
    console.log('Please ensure .env.local has SHOPIFY_ACCESS_TOKEN set');
    process.exit(1);
  }

  const brands = [
    { orgId: 'ORG-VCVR4', name: 'VitaDreamz Chill' },
    { orgId: 'ORG-VBDOW', name: 'VitaDreamz Bliss' },
    { orgId: 'ORG-VSCA1', name: 'VitaDreamz Slumber' },
  ];

  console.log('\n🔧 Restoring Shopify credentials to test brands...\n');
  console.log(`Shopify Store: ${shopifyStoreName}`);
  console.log(`Access Token: ${shopifyAccessToken.substring(0, 10)}...`);
  console.log('');

  for (const brand of brands) {
    try {
      const updated = await prisma.organization.update({
        where: { orgId: brand.orgId },
        data: {
          shopifyStoreName,
          shopifyAccessToken,
          shopifyActive: true,
          shopifyConnectedAt: new Date(),
        },
        select: {
          orgId: true,
          name: true,
          shopifyStoreName: true,
        },
      });

      console.log(`✅ Updated ${updated.name} (${updated.orgId})`);
      console.log(`   Shopify Store: ${updated.shopifyStoreName}`);
    } catch (error) {
      console.error(`❌ Failed to update ${brand.name} (${brand.orgId}):`, error);
    }
  }

  // Verify the updates
  console.log('\n📊 Verifying updates...\n');
  
  const updatedBrands = await prisma.organization.findMany({
    where: {
      orgId: { in: brands.map(b => b.orgId) },
    },
    select: {
      orgId: true,
      name: true,
      shopifyStoreName: true,
      shopifyAccessToken: true,
      shopifyActive: true,
    },
  });

  for (const brand of updatedBrands) {
    const hasToken = brand.shopifyAccessToken ? '✓' : '✗';
    const hasStore = brand.shopifyStoreName ? '✓' : '✗';
    const isActive = brand.shopifyActive ? '✓' : '✗';
    console.log(`${brand.name} (${brand.orgId})`);
    console.log(`  Store:  ${hasStore} ${brand.shopifyStoreName || 'MISSING'}`);
    console.log(`  Token:  ${hasToken} ${brand.shopifyAccessToken ? brand.shopifyAccessToken.substring(0, 10) + '...' : 'MISSING'}`);
    console.log(`  Active: ${isActive}`);
    console.log('');
  }

  console.log('✨ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
