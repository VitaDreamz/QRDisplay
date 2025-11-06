import prisma from '../lib/prisma';

async function resetTestData() {
  console.log('🗑️  Resetting test data...');

  // Delete in order (to respect foreign keys)
  await prisma.purchaseIntent.deleteMany({});
  console.log('✅ Cleared purchase intents');

  await prisma.promoRedemption.deleteMany({});
  console.log('✅ Cleared promo redemptions');

  await prisma.messageLog.deleteMany({});
  console.log('✅ Cleared message logs');

  await prisma.shortlink.deleteMany({});
  console.log('✅ Cleared shortlinks');

  await prisma.customer.deleteMany({});
  console.log('✅ Cleared customers');

  await prisma.display.deleteMany({});
  console.log('✅ Cleared displays');

  await prisma.store.deleteMany({});
  console.log('✅ Cleared stores');

  // Keep super-admins, delete test users (do this BEFORE org cleanup to avoid FK issues)
  await prisma.user.deleteMany({
    where: { role: { not: 'super-admin' } }
  });
  console.log('✅ Cleared test users (kept admins)');

  // Keep ORG-QRDISPLAY, delete others
  await prisma.organization.deleteMany({
    where: { orgId: { not: 'ORG-QRDISPLAY' } }
  });
  console.log('✅ Cleared test organizations (kept QRDisplay)');

  console.log('🎉 Database reset complete!');
}

resetTestData()
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
