/**
 * Migrate maxCustomers to customerSlotsGranted
 * Copy existing maxCustomers values to the new accumulating field
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateCustomerSlots() {
  console.log('🔄 Migrating maxCustomers to customerSlotsGranted...');
  
  // Copy maxCustomers to customerSlotsGranted for all stores
  const result = await prisma.$executeRaw`
    UPDATE stores 
    SET "customerSlotsGranted" = "maxCustomers"
    WHERE "customerSlotsGranted" != "maxCustomers"
  `;
  
  console.log(`✅ Updated ${result} stores`);
  
  // Verify the migration
  const stores = await prisma.store.findMany({
    select: {
      storeId: true,
      storeName: true,
      subscriptionTier: true,
      customerSlotsGranted: true,
    },
  });
  
  console.log('\n📊 Current customer slots:');
  stores.forEach(store => {
    console.log(`  ${store.storeName} (${store.subscriptionTier}): ${store.customerSlotsGranted} slots`);
  });
}

migrateCustomerSlots()
  .then(() => {
    console.log('\n✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
