import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database (keeping QRDisplay platform org)...\n');

  // Delete all customers
  const deletedCustomers = await prisma.customer.deleteMany({});
  console.log(`✅ Deleted ${deletedCustomers.count} customers`);

  // Delete all stores
  const deletedStores = await prisma.store.deleteMany({});
  console.log(`✅ Deleted ${deletedStores.count} stores`);

  // Delete all displays
  const deletedDisplays = await prisma.display.deleteMany({});
  console.log(`✅ Deleted ${deletedDisplays.count} displays`);

  // Delete all display packs
  const deletedPacks = await prisma.displayPack.deleteMany({});
  console.log(`✅ Deleted ${deletedPacks.count} display packs`);

  // Delete all orders
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`✅ Deleted ${deletedOrders.count} orders`);

  // Delete all users except those in QRDisplay org
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      orgId: { not: 'ORG-QRDISPLAY' }
    }
  });
  console.log(`✅ Deleted ${deletedUsers.count} non-platform users`);

  // Delete all client organizations (keep platform)
  const deletedOrgs = await prisma.organization.deleteMany({
    where: {
      type: 'client'
    }
  });
  console.log(`✅ Deleted ${deletedOrgs.count} client organizations`);

  // Verify QRDisplay platform org still exists
  const platformOrg = await prisma.organization.findFirst({
    where: { type: 'platform' }
  });

  if (platformOrg) {
    console.log(`\n✅ Platform organization "${platformOrg.name}" (${platformOrg.orgId}) preserved`);
  } else {
    console.log(`\n⚠️  Warning: No platform organization found`);
  }

  console.log('\n🎉 Database cleaned! Ready for fresh brand setup.');
  console.log('📝 Next steps:');
  console.log('   1. Create your new brand with logo at /admin/brands/new');
  console.log('   2. Let me know when ready to generate displays for it');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
