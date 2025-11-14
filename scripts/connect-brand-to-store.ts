#!/usr/bin/env tsx
/**
 * Connect Brand to Store Script
 * 
 * Creates a StoreBrandPartnership between a brand and store
 * Automatically configures available samples and products
 * 
 * Usage:
 *   npx tsx scripts/connect-brand-to-store.ts --brand ORG-XXX --store STORE-XXX
 *   npx tsx scripts/connect-brand-to-store.ts --brand ORG-XXX --store STORE-XXX --samples 2 --products 1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ConnectionOptions {
  brandId: string;
  storeId: string;
  numSamples?: number;
  numProducts?: number;
  commissionRate?: number;
}

function parseArgs(): ConnectionOptions {
  const args = process.argv.slice(2);
  const options: Partial<ConnectionOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--brand':
        options.brandId = args[++i];
        break;
      case '--store':
        options.storeId = args[++i];
        break;
      case '--samples':
        options.numSamples = parseInt(args[++i], 10);
        break;
      case '--products':
        options.numProducts = parseInt(args[++i], 10);
        break;
      case '--commission':
        options.commissionRate = parseFloat(args[++i]);
        break;
    }
  }

  if (!options.brandId || !options.storeId) {
    throw new Error('--brand and --store are required');
  }

  return options as ConnectionOptions;
}

async function connectBrandToStore(options: ConnectionOptions) {
  const { brandId, storeId, numSamples, numProducts, commissionRate } = options;

  console.log(`\n🔗 Connecting Brand to Store`);
  console.log(`   Brand: ${brandId}`);
  console.log(`   Store: ${storeId}\n`);

  // Find brand
  const brand = await prisma.organization.findFirst({
    where: {
      OR: [
        { orgId: brandId },
        { id: brandId },
      ],
      type: 'client',
    },
  });

  if (!brand) {
    throw new Error(`Brand not found: ${brandId}`);
  }

  console.log(`✅ Found brand: ${brand.name}`);

  // Find store
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { storeId },
        { id: storeId },
      ],
    },
  });

  if (!store) {
    throw new Error(`Store not found: ${storeId}`);
  }

  console.log(`✅ Found store: ${store.storeName}`);

  // Check if partnership already exists
  const existing = await prisma.storeBrandPartnership.findUnique({
    where: {
      storeId_brandId: {
        storeId: store.id,
        brandId: brand.id,
      },
    },
  });

  if (existing) {
    console.log(`⚠️  Partnership already exists (created ${existing.createdAt.toLocaleDateString()})`);
    console.log(`   Updating...`);
  }

  // Check store's brand partnership limit
  const currentPartnerships = await prisma.storeBrandPartnership.count({
    where: {
      storeId: store.id,
      active: true,
    },
  });

  if (!existing && currentPartnerships >= store.maxBrandPartnerships) {
    throw new Error(
      `Store has reached max brand partnerships (${store.maxBrandPartnerships}). ` +
      `Current: ${currentPartnerships}. Upgrade subscription to add more brands.`
    );
  }

  // Get brand's products
  const allProducts = await prisma.product.findMany({
    where: {
      orgId: brand.id,
      active: true,
    },
    orderBy: {
      featured: 'desc',
    },
  });

  const samples = allProducts.filter(p => p.category === 'sample');
  const fullSize = allProducts.filter(p => p.category !== 'sample');

  console.log(`\n📦 Available Products:`);
  console.log(`   Samples: ${samples.length}`);
  console.log(`   Full-Size: ${fullSize.length}`);

  // Select samples and products (use all by default, or limit)
  const selectedSamples = samples.slice(0, numSamples || samples.length);
  const selectedProducts = fullSize.slice(0, numProducts || fullSize.length);

  const availableSamples = selectedSamples.map(p => p.sku);
  const availableProducts = selectedProducts.map(p => p.sku);

  console.log(`\n✅ Selected for this store:`);
  selectedSamples.forEach(p => console.log(`   📦 Sample: ${p.name} (${p.sku})`));
  selectedProducts.forEach(p => console.log(`   📦 Product: ${p.name} (${p.sku}) - $${p.price}`));

  // Create or update partnership
  const partnership = await prisma.storeBrandPartnership.upsert({
    where: {
      storeId_brandId: {
        storeId: store.id,
        brandId: brand.id,
      },
    },
    create: {
      storeId: store.id,
      brandId: brand.id,
      commissionRate: commissionRate || brand.commissionRate || 10.0,
      availableSamples,
      availableProducts,
      active: true,
    },
    update: {
      availableSamples,
      availableProducts,
      commissionRate: commissionRate !== undefined ? commissionRate : undefined,
      active: true,
    },
  });

  // Update store's active brand count
  const activeBrandCount = await prisma.storeBrandPartnership.count({
    where: {
      storeId: store.id,
      active: true,
    },
  });

  await prisma.store.update({
    where: { id: store.id },
    data: { activeBrandCount },
  });

  // Update brand's active store count
  const activeStoreCount = await prisma.storeBrandPartnership.count({
    where: {
      brandId: brand.id,
      active: true,
    },
  });

  await prisma.organization.update({
    where: { id: brand.id },
    data: { currentActiveStores: activeStoreCount },
  });

  console.log(`\n✅ Partnership ${existing ? 'updated' : 'created'} successfully!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Brand: ${brand.name}`);
  console.log(`   Store: ${store.storeName}`);
  console.log(`   Commission Rate: ${partnership.commissionRate}%`);
  console.log(`   Available Samples: ${availableSamples.length}`);
  console.log(`   Available Products: ${availableProducts.length}`);
  console.log(`   Store Active Brands: ${activeBrandCount}/${store.maxBrandPartnerships}`);
  console.log(`   Brand Active Stores: ${activeStoreCount}`);

  console.log(`\n🔗 Next Steps:`);
  console.log(`   1. Test customer flow at display`);
  console.log(`   2. Customer should see ${brand.name} samples`);
  console.log(`   3. Commission tracking will attribute sales to this store`);

  return partnership;
}

async function main() {
  try {
    const options = parseArgs();
    await connectBrandToStore(options);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.log('\nUsage:');
    console.log('  npx tsx scripts/connect-brand-to-store.ts --brand BRAND_ID --store STORE_ID [options]');
    console.log('\nOptions:');
    console.log('  --brand       Brand orgId or database id (required)');
    console.log('  --store       Store storeId or database id (required)');
    console.log('  --samples     Number of samples to enable (default: all)');
    console.log('  --products    Number of products to enable (default: all)');
    console.log('  --commission  Commission rate percentage (default: brand default)');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/connect-brand-to-store.ts --brand ORG-TST001 --store STORE-ABC123');
    console.log('  npx tsx scripts/connect-brand-to-store.ts --brand ORG-TST001 --store STORE-ABC123 --samples 2 --commission 12.5');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
