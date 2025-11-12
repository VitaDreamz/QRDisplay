/**
 * Test script to verify staff points are awarded for purchase intent redemption
 * 
 * Test case: MEM-056, staff PIN 6147, store SID-027
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking purchase intent and staff points for MEM-056...\n');

  // Find the customer
  const customer = await prisma.customer.findUnique({
    where: { memberId: 'MEM-056' },
    select: {
      id: true,
      memberId: true,
      firstName: true,
      lastName: true,
      storeId: true,
    }
  });

  if (!customer) {
    console.log('❌ Customer MEM-056 not found');
    return;
  }

  console.log('✅ Customer found:', customer);

  // Find staff member with PIN 6147 at their store
  const staff = await prisma.staff.findFirst({
    where: {
      storeId: customer.storeId,
      staffPin: '6147'
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      staffPin: true,
      totalPoints: true,
      quarterlyPoints: true,
      salesGenerated: true,
    }
  });

  if (!staff) {
    console.log('❌ Staff member with PIN 6147 not found at this store');
    return;
  }

  console.log('✅ Staff member found:', staff);
  console.log('   Total Points:', staff.totalPoints);
  console.log('   Quarterly Points:', staff.quarterlyPoints);
  console.log('   Sales Generated:', staff.salesGenerated);

  // Find purchase intents for this customer
  const purchaseIntents = await prisma.purchaseIntent.findMany({
    where: {
      customerId: customer.id,
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      status: true,
      finalPrice: true,
      createdAt: true,
      fulfilledAt: true,
      fulfilledByStaffId: true,
      productSku: true,
    }
  });

  console.log(`\n📦 Found ${purchaseIntents.length} purchase intent(s):`);
  purchaseIntents.forEach((intent, i) => {
    console.log(`\n${i + 1}. Purchase Intent ${intent.id}`);
    console.log(`   Status: ${intent.status}`);
    console.log(`   Product: ${intent.productSku}`);
    console.log(`   Amount: $${intent.finalPrice}`);
    console.log(`   Created: ${intent.createdAt}`);
    console.log(`   Fulfilled: ${intent.fulfilledAt || 'Not fulfilled'}`);
    console.log(`   Fulfilled by Staff ID: ${intent.fulfilledByStaffId || 'None'}`);
  });

  // Check staff point transactions for this customer
  const pointTransactions = await prisma.staffPointTransaction.findMany({
    where: {
      staffId: staff.id,
      customerId: customer.id,
    },
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      points: true,
      type: true,
      reason: true,
      createdAt: true,
      purchaseIntentId: true,
    }
  });

  console.log(`\n🎯 Found ${pointTransactions.length} point transaction(s) for this staff/customer combination:`);
  pointTransactions.forEach((tx, i) => {
    console.log(`\n${i + 1}. Transaction ${tx.id}`);
    console.log(`   Points: ${tx.points}`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Reason: ${tx.reason}`);
    console.log(`   Purchase Intent ID: ${tx.purchaseIntentId || 'None'}`);
    console.log(`   Created: ${tx.createdAt}`);
  });

  // Check if there should be points but aren't any
  const fulfilledIntents = purchaseIntents.filter(
    intent => intent.status === 'fulfilled' && intent.fulfilledByStaffId === staff.id
  );

  if (fulfilledIntents.length > 0 && pointTransactions.length === 0) {
    console.log('\n⚠️  WARNING: Staff fulfilled purchase intent(s) but has NO point transactions!');
    console.log('   This indicates the points system is not working correctly.');
  } else if (fulfilledIntents.length > pointTransactions.filter(tx => tx.type === 'instore_sale').length) {
    console.log('\n⚠️  WARNING: More fulfilled intents than instore_sale point transactions!');
    console.log(`   Fulfilled: ${fulfilledIntents.length}`);
    console.log(`   Point transactions: ${pointTransactions.filter(tx => tx.type === 'instore_sale').length}`);
  } else if (fulfilledIntents.length > 0 && pointTransactions.length > 0) {
    console.log('\n✅ Points system appears to be working correctly!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
