/**
 * Copy brands and products from local DB to production DB
 * 
 * This will copy the 3 VitaDreamz brands (Chill, Bliss, Slumber) and their products
 * from the current database to production
 */

import { PrismaClient } from '@prisma/client';

// Source database (current - with the good data)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Target database (production - needs the data)
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TARGET_DATABASE_URL
    }
  }
});

async function main() {
  console.log('\n📦 Migrating brands and products to production...\n');
  console.log('Source DB:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  console.log('Target DB:', process.env.TARGET_DATABASE_URL?.substring(0, 50) + '...');
  console.log('');

  if (!process.env.TARGET_DATABASE_URL) {
    console.error('❌ TARGET_DATABASE_URL environment variable not set');
    console.log('\nUsage:');
    console.log('TARGET_DATABASE_URL="postgresql://..." npx tsx scripts/migrate-brands-to-production.ts');
    process.exit(1);
  }

  const brandIds = ['ORG-VCVR4', 'ORG-VBDOW', 'ORG-VSCA1'];

  // 1. Fetch brands from source
  console.log('📥 Fetching brands from source database...');
  const sourceBrands = await sourceDb.organization.findMany({
    where: { orgId: { in: brandIds } }
  });
  console.log(`Found ${sourceBrands.length} brands\n`);

  // 2. Fetch products from source
  console.log('📥 Fetching products from source database...');
  const sourceProducts = await sourceDb.product.findMany({
    where: { orgId: { in: brandIds } }
  });
  console.log(`Found ${sourceProducts.length} products\n`);

  // 3. Check if brands already exist in target
  console.log('🔍 Checking target database...');
  const existingBrands = await targetDb.organization.findMany({
    where: { orgId: { in: brandIds } }
  });
  console.log(`Target has ${existingBrands.length} of these brands\n`);

  // 4. Upsert brands to target
  console.log('💾 Upserting brands to target database...');
  for (const brand of sourceBrands) {
    await targetDb.organization.upsert({
      where: { orgId: brand.orgId },
      create: brand,
      update: {
        name: brand.name,
        slug: brand.slug,
        type: brand.type,
        logoUrl: brand.logoUrl,
        shopifyStoreName: brand.shopifyStoreName,
        shopifyAccessToken: brand.shopifyAccessToken,
        shopifyActive: brand.shopifyActive,
        shopifyConnectedAt: brand.shopifyConnectedAt,
        supportEmail: brand.supportEmail,
        supportPhone: brand.supportPhone,
        emailFromName: brand.emailFromName,
        emailFromAddress: brand.emailFromAddress,
        commissionRate: brand.commissionRate,
      }
    });
    console.log(`  ✅ ${brand.name} (${brand.orgId})`);
  }
  console.log('');

  // 5. Upsert products to target
  console.log('💾 Upserting products to target database...');
  for (const product of sourceProducts) {
    await targetDb.product.upsert({
      where: { sku: product.sku },
      create: product,
      update: {
        name: product.name,
        description: product.description,
        category: product.category,
        productType: product.productType,
        price: product.price,
        msrp: product.msrp,
        unitsPerBox: product.unitsPerBox,
        wholesalePrice: product.wholesalePrice,
        retailPrice: product.retailPrice,
        shopifyProductId: product.shopifyProductId,
        shopifyVariantId: product.shopifyVariantId,
        imageUrl: product.imageUrl,
        active: product.active,
        featured: product.featured,
      }
    });
    console.log(`  ✅ ${product.sku}: ${product.name}`);
  }
  console.log('');

  // 6. Verify migration
  console.log('📊 Verifying migration...\n');
  const targetBrands = await targetDb.organization.findMany({
    where: { orgId: { in: brandIds } }
  });
  
  for (const brand of targetBrands) {
    const productCount = await targetDb.product.count({
      where: { orgId: brand.orgId }
    });
    console.log(`${brand.name} (${brand.orgId}): ${productCount} products`);
  }

  console.log('\n✨ Migration complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  });
