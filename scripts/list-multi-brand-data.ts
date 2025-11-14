#!/usr/bin/env tsx
/**
 * List Multi-Brand Test Data
 * 
 * Quick overview of brands, partnerships, and sample history
 * Useful for debugging and verifying test setup
 * 
 * Usage:
 *   npx tsx scripts/list-multi-brand-data.ts
 *   npx tsx scripts/list-multi-brand-data.ts --brand ORG-XXX
 *   npx tsx scripts/list-multi-brand-data.ts --store STORE-XXX
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAllBrands() {
  const brands = await prisma.organization.findMany({
    where: { type: 'client' },
    include: {
      _count: {
        select: {
          brandPartnerships: true,
          sampleHistory: true,
          conversions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📊 Brands (${brands.length})\n`);
  
  for (const brand of brands) {
    console.log(`🏢 ${brand.name} (${brand.orgId})`);
    console.log(`   Tier: ${brand.brandTier?.toUpperCase() || 'N/A'}`);
    console.log(`   Status: ${brand.approvalStatus}`);
    console.log(`   Shopify: ${brand.shopifyStoreName || 'Not connected'}`);
    console.log(`   Store Partnerships: ${brand._count.brandPartnerships}`);
    console.log(`   Sample History: ${brand._count.sampleHistory}`);
    console.log(`   Conversions: ${brand._count.conversions}`);
    console.log(`   Limits: ${brand.maxSampleProducts} samples, ${brand.maxFullSizeProducts} products, ${brand.maxStoresPerMonth} stores/mo`);
    console.log(`   Fees: ${brand.transactionFeePercent}% + $${brand.monthlyPlatformFee}/mo`);
    console.log(``);
  }
}

async function listBrandDetails(brandIdentifier: string) {
  const brand = await prisma.organization.findFirst({
    where: {
      OR: [
        { orgId: brandIdentifier },
        { id: brandIdentifier },
      ],
      type: 'client',
    },
    include: {
      brandPartnerships: {
        include: {
          store: {
            select: {
              storeName: true,
              storeId: true,
            },
          },
        },
      },
    },
  });

  if (!brand) {
    console.error(`❌ Brand not found: ${brandIdentifier}`);
    return;
  }

  console.log(`\n🏢 ${brand.name} (${brand.orgId})`);
  console.log(`   Tier: ${brand.brandTier?.toUpperCase()}`);
  console.log(`   Status: ${brand.approvalStatus}`);
  console.log(`   Created: ${brand.createdAt.toLocaleDateString()}`);
  console.log(`   Shopify: ${brand.shopifyStoreName || 'Not connected'}`);
  
  // Products
  const products = await prisma.product.findMany({
    where: { orgId: brand.id },
    orderBy: { category: 'asc' },
  });

  console.log(`\n📦 Products (${products.length}):`);
  const samples = products.filter(p => p.category === 'sample');
  const fullSize = products.filter(p => p.category !== 'sample');
  
  console.log(`\n   Samples (${samples.length}/${brand.maxSampleProducts}):`);
  samples.forEach(p => {
    console.log(`   • ${p.name} (${p.sku}) - ${p.active ? '✅' : '❌'}`);
  });
  
  console.log(`\n   Full-Size (${fullSize.length}/${brand.maxFullSizeProducts}):`);
  fullSize.forEach(p => {
    console.log(`   • ${p.name} (${p.sku}) - $${p.price} - ${p.active ? '✅' : '❌'}`);
  });

  // Partnerships
  console.log(`\n🤝 Store Partnerships (${brand.brandPartnerships.length}):`);
  for (const partnership of brand.brandPartnerships) {
    console.log(`\n   ${partnership.store.storeName} (${partnership.store.storeId})`);
    console.log(`   • Active: ${partnership.active ? '✅' : '❌'}`);
    console.log(`   • Commission: ${partnership.commissionRate}%`);
    console.log(`   • Samples: ${partnership.availableSamples.length}`);
    console.log(`   • Products: ${partnership.availableProducts.length}`);
    console.log(`   • Since: ${partnership.partnerSince.toLocaleDateString()}`);
  }

  // Sample history
  const sampleHistory = await prisma.sampleHistory.findMany({
    where: { brandId: brand.id },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      store: {
        select: {
          storeName: true,
        },
      },
    },
    orderBy: { sampledAt: 'desc' },
    take: 10,
  });

  if (sampleHistory.length > 0) {
    console.log(`\n📈 Recent Sample History (${sampleHistory.length} shown):`);
    sampleHistory.forEach(sample => {
      console.log(`   • ${sample.customer.firstName} ${sample.customer.lastName} - ${sample.productName}`);
      console.log(`     ${sample.store.storeName} - ${sample.sampledAt.toLocaleDateString()}`);
    });
  }
}

async function listStorePartnerships(storeIdentifier: string) {
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { storeId: storeIdentifier },
        { id: storeIdentifier },
      ],
    },
    include: {
      brandPartnerships: {
        include: {
          brand: {
            select: {
              name: true,
              orgId: true,
              brandTier: true,
            },
          },
        },
      },
    },
  });

  if (!store) {
    console.error(`❌ Store not found: ${storeIdentifier}`);
    return;
  }

  console.log(`\n🏪 ${store.storeName} (${store.storeId})`);
  console.log(`   Brand Partnerships: ${store.activeBrandCount}/${store.maxBrandPartnerships}`);
  
  console.log(`\n🤝 Connected Brands (${store.brandPartnerships.length}):`);
  for (const partnership of store.brandPartnerships) {
    console.log(`\n   ${partnership.brand.name} (${partnership.brand.orgId})`);
    console.log(`   • Tier: ${partnership.brand.brandTier?.toUpperCase()}`);
    console.log(`   • Active: ${partnership.active ? '✅' : '❌'}`);
    console.log(`   • Commission: ${partnership.commissionRate}%`);
    console.log(`   • Samples: ${partnership.availableSamples.length}`);
    console.log(`   • Products: ${partnership.availableProducts.length}`);
  }

  // Sample history
  const sampleHistory = await prisma.sampleHistory.findMany({
    where: { storeId: store.id },
    include: {
      brand: {
        select: {
          name: true,
        },
      },
      customer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { sampledAt: 'desc' },
    take: 10,
  });

  if (sampleHistory.length > 0) {
    console.log(`\n📈 Recent Sample History (${sampleHistory.length} shown):`);
    sampleHistory.forEach(sample => {
      console.log(`   • ${sample.customer.firstName} ${sample.customer.lastName} - ${sample.brand.name} - ${sample.productName}`);
      console.log(`     ${sample.sampledAt.toLocaleDateString()}`);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    await listAllBrands();
  } else if (args[0] === '--brand' && args[1]) {
    await listBrandDetails(args[1]);
  } else if (args[0] === '--store' && args[1]) {
    await listStorePartnerships(args[1]);
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/list-multi-brand-data.ts              # List all brands');
    console.log('  npx tsx scripts/list-multi-brand-data.ts --brand ID   # Show brand details');
    console.log('  npx tsx scripts/list-multi-brand-data.ts --store ID   # Show store partnerships');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
