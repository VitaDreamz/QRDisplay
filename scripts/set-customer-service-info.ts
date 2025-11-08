import prisma from '../lib/prisma';

/**
 * Script to set customer service and default sales rep info for VitaDreamz
 * 
 * USAGE: npx tsx scripts/set-customer-service-info.ts
 */

async function main() {
  console.log('📞 Setting customer service info for VitaDreamz...\n');

  // Update VitaDreamz organization with customer service contact info
  const org = await prisma.organization.update({
    where: { orgId: 'ORG-VITADREAMZ' },
    data: {
      customerServiceEmail: 'support@vitadreamz.com',
      customerServicePhone: '1-800-VITA-DRZ', // Update with real number
    }
  });

  console.log('✅ Updated organization customer service info:');
  console.log(`   Email: ${org.customerServiceEmail}`);
  console.log(`   Phone: ${org.customerServicePhone}`);
  console.log('');

  // Optionally assign a default sales rep to existing stores
  // Uncomment and customize this section if needed:
  /*
  const stores = await prisma.store.findMany({
    where: { orgId: 'ORG-VITADREAMZ' }
  });

  for (const store of stores) {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        salesRepName: 'James Bonutto',
        salesRepEmail: 'james@vitadreamz.com',
        salesRepPhone: '555-123-4567',
      }
    });
    console.log(`✅ Assigned sales rep to ${store.storeName}`);
  }
  */

  console.log('\n✨ Done! Customer service info is now set.');
  console.log('\nTo assign sales reps to stores, you can:');
  console.log('1. Add them during store setup');
  console.log('2. Update them in the admin panel');
  console.log('3. Pull from Shopify customer tags/metafields');

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
