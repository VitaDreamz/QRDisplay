import prisma from '../lib/prisma';

async function main() {
  console.log('\n=== STORES ===');
  const stores = await prisma.store.findMany({
    orderBy: { storeId: 'asc' }
  });
  
  stores.forEach(store => {
    console.log(`\nStore: ${store.storeId}`);
    console.log(`  Name: ${store.storeName}`);
    console.log(`  Created: ${store.createdAt}`);
    console.log(`  Available Samples: ${JSON.stringify(store.availableSamples)}`);
    console.log(`  Admin: ${store.adminName} (${store.adminEmail})`);
  });

  console.log('\n\n=== DISPLAYS ===');
  const displays = await prisma.display.findMany({
    orderBy: { displayId: 'asc' }
  });
  
  displays.forEach(display => {
    console.log(`\nDisplay: ${display.displayId}`);
    console.log(`  Status: ${display.status}`);
    console.log(`  Store ID: ${display.storeId || 'none'}`);
    console.log(`  Activated: ${display.activatedAt || 'not activated'}`);
  });

  console.log('\n\n=== CUSTOMERS ===');
  const customers = await prisma.customer.findMany({
    orderBy: { requestedAt: 'desc' }
  });
  
  customers.forEach(customer => {
    console.log(`\nCustomer: ${customer.memberId}`);
    console.log(`  Name: ${customer.firstName} ${customer.lastName}`);
    console.log(`  Store: ${customer.storeId}`);
    console.log(`  Requested: ${customer.requestedAt}`);
    console.log(`  Redeemed: ${customer.redeemed}`);
    console.log(`  Promo Used: ${customer.promoRedeemed}`);
  });

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total Stores: ${stores.length}`);
  console.log(`Total Displays: ${displays.length}`);
  console.log(`Total Customers: ${customers.length}`);
  
  // Check for orphaned data
  const orphanedCustomers = customers.filter(c => !stores.find(s => s.storeId === c.storeId));
  if (orphanedCustomers.length > 0) {
    console.log(`\n⚠️  WARNING: ${orphanedCustomers.length} customers belong to deleted stores!`);
    orphanedCustomers.forEach(c => {
      console.log(`   - ${c.memberId} belongs to non-existent store ${c.storeId}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
