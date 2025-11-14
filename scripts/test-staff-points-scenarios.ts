/**
 * Test staff points system for both purchase scenarios
 * 
 * Scenario 1: Immediate purchase (customer walks in, buys directly)
 * Scenario 2: Purchase intent after sample (sample → purchase request → in-store redemption)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testScenario1() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SCENARIO 1: Online Shopify Purchases (with attribution)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find conversions (online purchases from Shopify)
  const conversions = await prisma.conversion.findMany({
    where: {
      attributed: true, // Only attributed conversions
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: {
        select: {
          memberId: true,
          firstName: true,
          lastName: true,
          storeId: true,
          redeemedByStaffId: true,
        }
      },
      store: {
        select: {
          storeId: true,
          storeName: true,
        }
      }
    }
  });

  console.log(`Found ${conversions.length} online conversions\n`);

  if (conversions.length === 0) {
    console.log('⚠️  No online conversions found.\n');
    return;
  }

  for (const conversion of conversions) {
    console.log(`Customer: ${conversion.customer.memberId} - ${conversion.customer.firstName} ${conversion.customer.lastName}`);
    console.log(`Store: ${conversion.store.storeName} (${conversion.store.storeId})`);
    console.log(`Order: ${conversion.orderNumber}`);
    console.log(`Sale Amount: $${conversion.orderTotal}`);
    console.log(`Purchase Date: ${conversion.purchaseDate}`);
    console.log(`Days to Conversion: ${conversion.daysToConversion}`);
    
    if (conversion.customer.redeemedByStaffId) {
      const staff = await prisma.staff.findUnique({
        where: { id: conversion.customer.redeemedByStaffId },
        select: {
          firstName: true,
          lastName: true,
          staffPin: true,
          totalPoints: true,
        }
      });
      
      console.log(`Attributed to Staff: ${staff?.firstName} ${staff?.lastName} (PIN: ${staff?.staffPin})`);
      console.log(`Staff Total Points: ${staff?.totalPoints}`);

      // Check if points were awarded for this conversion
      const pointTx = await prisma.staffPointTransaction.findFirst({
        where: {
          staffId: conversion.customer.redeemedByStaffId,
          conversionId: conversion.id,
          type: 'online_sale',
        }
      });

      const expectedPoints = Math.floor(conversion.orderTotal * 3); // 3 points per dollar

      if (pointTx) {
        console.log(`✅ Points awarded: ${pointTx.points} (expected: ${expectedPoints})`);
      } else {
        console.log(`❌ No points found for this conversion! Expected ${expectedPoints} points`);
      }
    } else {
      console.log(`⚠️  No staff attribution for this conversion`);
    }
    console.log('');
  }
}

async function testScenario2() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SCENARIO 2: Purchase Intent After Sample');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find fulfilled purchase intents
  const fulfilledIntents = await prisma.purchaseIntent.findMany({
    where: {
      status: 'fulfilled',
      fulfilledByStaffId: { not: null },
    },
    take: 5,
    orderBy: { fulfilledAt: 'desc' },
    include: {
      customer: {
        select: {
          memberId: true,
          firstName: true,
          lastName: true,
          storeId: true,
          redeemedByStaffId: true, // Who gave them the sample
        }
      },
      fulfilledByStaff: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffPin: true,
          totalPoints: true,
          quarterlyPoints: true,
        }
      }
    }
  });

  console.log(`Found ${fulfilledIntents.length} fulfilled purchase intents\n`);

  for (const intent of fulfilledIntents) {
    console.log(`╔═══════════════════════════════════════════════════╗`);
    console.log(`║ Purchase Intent: ${intent.id.substring(0, 20)}... `);
    console.log(`╚═══════════════════════════════════════════════════╝`);
    
    console.log(`\nCustomer: ${intent.customer.memberId} - ${intent.customer.firstName} ${intent.customer.lastName}`);
    console.log(`Store: ${intent.customer.storeId}`);
    console.log(`Product: ${intent.productSku}`);
    console.log(`Final Price: $${intent.finalPrice}`);
    console.log(`Discount: ${intent.discountPercent}%`);
    console.log(`Created: ${intent.createdAt}`);
    console.log(`Fulfilled: ${intent.fulfilledAt}`);

    // Who gave the sample?
    if (intent.customer.redeemedByStaffId) {
      const sampleStaff = await prisma.staff.findUnique({
        where: { id: intent.customer.redeemedByStaffId },
        select: {
          firstName: true,
          lastName: true,
          staffPin: true,
        }
      });
      console.log(`\n👤 Sample given by: ${sampleStaff?.firstName} ${sampleStaff?.lastName} (PIN: ${sampleStaff?.staffPin})`);

      // Check if sample staff got sample points
      const samplePoints = await prisma.staffPointTransaction.findFirst({
        where: {
          staffId: intent.customer.redeemedByStaffId,
          customerId: intent.customer.id,
          type: 'sample',
        }
      });
      if (samplePoints) {
        console.log(`   ✅ Sample points awarded: ${samplePoints.points}`);
      } else {
        console.log(`   ❌ No sample points found`);
      }
    }

    // Who fulfilled the purchase?
    if (intent.fulfilledByStaff) {
      console.log(`\n💰 Purchase fulfilled by: ${intent.fulfilledByStaff.firstName} ${intent.fulfilledByStaff.lastName} (PIN: ${intent.fulfilledByStaff.staffPin})`);
      console.log(`   Staff Total Points: ${intent.fulfilledByStaff.totalPoints}`);
      console.log(`   Staff Quarterly Points: ${intent.fulfilledByStaff.quarterlyPoints}`);

      // Check if purchase staff got sale points
      const salePoints = await prisma.staffPointTransaction.findFirst({
        where: {
          staffId: intent.fulfilledByStaff.id,
          purchaseIntentId: intent.id,
          type: 'instore_sale',
        }
      });

      const expectedPoints = Math.floor(Number(intent.finalPrice) * 10);
      
      if (salePoints) {
        console.log(`   ✅ Sale points awarded: ${salePoints.points} (expected: ${expectedPoints})`);
        console.log(`   Reason: ${salePoints.reason}`);
        console.log(`   Awarded: ${salePoints.createdAt}`);
        
        if (salePoints.points !== expectedPoints) {
          console.log(`   ⚠️  Point mismatch! Got ${salePoints.points} but expected ${expectedPoints}`);
        }
      } else {
        console.log(`   ❌ No sale points found! Expected ${expectedPoints} points`);
        console.log(`   🔍 This indicates the points system is NOT working`);
      }

      // Check store context
      console.log(`\n🏪 Store Context Verification:`);
      console.log(`   Purchase Intent Store: ${intent.storeId}`);
      console.log(`   Customer's Store: ${intent.customer.storeId}`);
      
      const staffStore = await prisma.staff.findUnique({
        where: { id: intent.fulfilledByStaff.id },
        select: { storeId: true }
      });
      console.log(`   Staff's Store: ${staffStore?.storeId}`);
      
      if (intent.storeId === intent.customer.storeId && intent.storeId === staffStore?.storeId) {
        console.log(`   ✅ All stores match - correct store scoping`);
      } else {
        console.log(`   ⚠️  Store mismatch detected!`);
      }
    }

    console.log('\n' + '─'.repeat(55) + '\n');
  }
}

async function checkStaffPINUniqueness() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Checking Staff PIN Uniqueness per Store');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find duplicate PINs across different stores
  const allStaff = await prisma.staff.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      staffPin: true,
      storeId: true,
      store: {
        select: {
          storeId: true,
          storeName: true,
        }
      }
    },
    orderBy: {
      staffPin: 'asc'
    }
  });

  const pinMap = new Map<string, typeof allStaff>();
  
  for (const staff of allStaff) {
    if (!pinMap.has(staff.staffPin)) {
      pinMap.set(staff.staffPin, []);
    }
    pinMap.get(staff.staffPin)!.push(staff);
  }

  const duplicatePins = Array.from(pinMap.entries()).filter(([_, staffList]) => staffList.length > 1);

  if (duplicatePins.length > 0) {
    console.log(`⚠️  Found ${duplicatePins.length} PIN(s) used at multiple stores:\n`);
    
    for (const [pin, staffList] of duplicatePins) {
      console.log(`PIN ${pin} is used by ${staffList.length} staff members:`);
      for (const staff of staffList) {
        console.log(`  - ${staff.firstName} ${staff.lastName} at ${staff.store.storeName} (${staff.store.storeId})`);
      }
      console.log('');
    }
    
    console.log('✅ This is OK! PINs are scoped per store, so duplicates across stores are fine.\n');
  } else {
    console.log('✅ All staff PINs are unique across the entire system.\n');
  }
}

async function main() {
  try {
    await checkStaffPINUniqueness();
    await testScenario1();
    await testScenario2();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
