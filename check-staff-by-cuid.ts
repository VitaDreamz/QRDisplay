import prisma from './lib/prisma';

async function checkStaffByCuid() {
  const staffId = 'cmi2pnv780011jv044pwg0wrw';
  
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      store: true
    }
  });
  
  if (!staff) {
    console.log('❌ Staff not found');
    return;
  }
  
  console.log('\n👤 Staff Member:');
  console.log(`  ID: ${staff.id}`);
  console.log(`  Staff ID: ${staff.staffId}`);
  console.log(`  Name: ${staff.firstName} ${staff.lastName}`);
  console.log(`  Store: ${staff.store.storeName} (${staff.store.storeId})`);
  console.log(`  Total Points: ${staff.totalPoints}`);
  console.log(`  Sales Generated: ${staff.salesGenerated}`);
  
  // Get point transactions
  const points = await prisma.staffPointTransaction.findMany({
    where: { staffId: staff.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log(`\n💎 Recent Point Transactions (${points.length}):`);
  points.forEach(pt => {
    console.log(`  ${pt.createdAt.toLocaleString()}: ${pt.points} pts - ${pt.reason} (${pt.type})`);
  });
  
  // Get fulfilled purchase intents
  const purchases = await prisma.purchaseIntent.findMany({
    where: {
      fulfilledByStaffId: staff.id,
      status: 'fulfilled'
    },
    orderBy: { fulfilledAt: 'desc' }
  });
  
  console.log(`\n📦 Fulfilled Purchase Intents (${purchases.length}):`);
  purchases.forEach(p => {
    console.log(`  ${p.fulfilledAt?.toLocaleString()}: $${p.finalPrice} - ${p.productSku}`);
  });
}

checkStaffByCuid()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
