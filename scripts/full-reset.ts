import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fullReset() {
  console.log('🧹 Starting comprehensive reset...\n');
  console.log('✅ Preserving: Brands, Products, QRDisplay Platform Org');
  console.log('🗑️  Deleting: All test data (stores, customers, staff, etc.)\n');

  try {
    // 1. Check current data counts
    console.log('📊 Checking current data...');
    const displayCount = await prisma.display.count();
    const sampleHistoryCount = await prisma.sampleHistory.count();
    const customerCount = await prisma.customer.count();
    const storeCount = await prisma.store.count();
    const staffCount = await prisma.staff.count();
    const purchaseIntentCount = await prisma.purchaseIntent.count();
    const storeCreditTxnCount = await prisma.storeCreditTransaction.count();
    const promoRedemptionCount = await prisma.promoRedemption.count();
    const shortlinkCount = await prisma.shortlink.count();

    console.log(`  Displays: ${displayCount}`);
    console.log(`  Sample History: ${sampleHistoryCount}`);
    console.log(`  Customers: ${customerCount}`);
    console.log(`  Stores: ${storeCount}`);
    console.log(`  Staff: ${staffCount}`);
    console.log(`  Purchase Intents: ${purchaseIntentCount}`);
    console.log(`  Shortlinks: ${shortlinkCount}`);
    console.log(`  Store Credit Txns: ${storeCreditTxnCount}`);
    console.log(`  Promo Redemptions: ${promoRedemptionCount}\n`);

    // 2. Delete in order (respecting foreign key constraints)
    
    // First, delete all dependent records
    console.log('🗑️  Deleting promo redemptions...');
    const deletedPromoRedemptions = await prisma.promoRedemption.deleteMany({});
    console.log(`  ✅ Deleted ${deletedPromoRedemptions.count} promo redemption records`);

    console.log('🗑️  Deleting store credit transactions...');
    const deletedStoreCreditTxns = await prisma.storeCreditTransaction.deleteMany({});
    console.log(`  ✅ Deleted ${deletedStoreCreditTxns.count} store credit transaction records`);

    console.log('🗑️  Deleting sample history...');
    const deletedSamples = await prisma.sampleHistory.deleteMany({});
    console.log(`  ✅ Deleted ${deletedSamples.count} sample history records`);

    console.log('🗑️  Deleting purchase intents...');
    const deletedPurchaseIntents = await prisma.purchaseIntent.deleteMany({});
    console.log(`  ✅ Deleted ${deletedPurchaseIntents.count} purchase intent records`);

    console.log('🗑️  Deleting shortlinks...');
    const deletedShortlinks = await prisma.shortlink.deleteMany({});
    console.log(`  ✅ Deleted ${deletedShortlinks.count} shortlink records`);

    console.log('🗑️  Deleting displays...');
    const deletedDisplays = await prisma.display.deleteMany({});
    console.log(`  ✅ Deleted ${deletedDisplays.count} display records`);

    // Delete staff (must be before stores due to foreign key)
    console.log('🗑️  Deleting staff...');
    const deletedStaff = await prisma.staff.deleteMany({});
    console.log(`  ✅ Deleted ${deletedStaff.count} staff records`);

    // Delete wholesale orders
    console.log('�️  Deleting wholesale orders...');
    const deletedWholesaleOrders = await prisma.wholesaleOrder.deleteMany({});
    console.log(`  ✅ Deleted ${deletedWholesaleOrders.count} wholesale order records`);

    // Delete store brand partnerships (must be before stores)
    console.log('🗑️  Deleting store brand partnerships...');
    const deletedPartnerships = await prisma.storeBrandPartnership.deleteMany({});
    console.log(`  ✅ Deleted ${deletedPartnerships.count} store brand partnership records`);

    // Now delete stores
    console.log('🗑️  Deleting stores...');
    const deletedStores = await prisma.store.deleteMany({});
    console.log(`  ✅ Deleted ${deletedStores.count} store records`);

    // Finally delete customers
    console.log('🗑️  Deleting customers...');
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`  ✅ Deleted ${deletedCustomers.count} customer records`);

    console.log('\n✨ Comprehensive reset complete!');
    console.log('✅ Preserved:');
    console.log('   - All brands and organizations');
    console.log('   - All products');
    console.log('   - Platform configuration');
    console.log('\n📝 Next steps:');
    console.log('  1. Database is clean and ready for production');
    console.log('  2. Generate new displays when ready');
    console.log('  3. All new data will be fresh\n');

  } catch (error) {
    console.error('❌ Error during reset:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fullReset();
