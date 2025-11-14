/**
 * Quick script to create a test store for multi-brand testing
 * Creates a store with tier limits for brand partnerships
 */

import prisma from '../lib/prisma';
import { generateBase62Slug } from '../lib/shortid';

async function main() {
  console.log('🏪 Creating test store for multi-brand testing...\n');

  // Generate unique store ID in SID-XXX format
  // Find the next available SID number
  const lastStore = await prisma.store.findFirst({
    where: {
      storeId: {
        startsWith: 'SID-'
      }
    },
    orderBy: {
      storeId: 'desc'
    }
  });

  let nextNum = 1;
  if (lastStore) {
    const match = lastStore.storeId.match(/SID-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  const storeId = `SID-${nextNum.toString().padStart(3, '0')}`;

  // Create the store (owned by the platform, not a brand)
  const store = await prisma.store.create({
    data: {
      storeId,
      orgId: 'ORG-QRDISPLAY', // The PLATFORM org that owns displays/stores
      storeName: 'San Diego Test Store',
      streetAddress: '123 Test Street',
      city: 'San Diego',
      state: 'CA',
      zipCode: '92101',
      ownerPhone: '619-555-0100',
      ownerEmail: 'sandiego-test@samplehound.com',
      status: 'active',
      // Multi-brand tier settings
      subscriptionTier: 'basic', // free = 1 brand, basic = 10, pro = 25, mega = 50
      maxBrandPartnerships: 10, // Basic tier for testing with 3 brands
      activeBrandCount: 0,
    },
  });

  console.log('✅ Test store created successfully!\n');
  console.log('📋 Store Details:');
  console.log(`   Store ID: ${store.storeId}`);
  console.log(`   Name: ${store.storeName}`);
  console.log(`   Location: ${store.city}, ${store.state}`);
  console.log(`   Tier: ${store.subscriptionTier} (max ${store.maxBrandPartnerships} brands)`);
  console.log(`\n🔗 Next step: Connect your 3 test brands to this store:`);
  console.log(`\n   npx tsx scripts/connect-brand-to-store.ts --brand ORG-VSV3I --store ${store.storeId}`);
  console.log(`   npx tsx scripts/connect-brand-to-store.ts --brand ORG-VBEN2 --store ${store.storeId}`);
  console.log(`   npx tsx scripts/connect-brand-to-store.ts --brand ORG-VC9L4 --store ${store.storeId}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
