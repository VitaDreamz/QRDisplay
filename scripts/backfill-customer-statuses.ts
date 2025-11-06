import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillCustomerStatuses() {
  console.log('🔄 Starting customer status backfill...\n');

  // Get all customers with their purchase intents
  const customers = await prisma.customer.findMany({
    include: {
      purchaseIntents: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  let updated = 0;
  let skipped = 0;

  for (const customer of customers) {
    // Skip if already has a valid status (not 'pending')
    if (customer.currentStage !== 'pending' && customer.currentStage !== 'redeemed') {
      console.log(`⏭️  ${customer.memberId}: Already has status '${customer.currentStage}'`);
      skipped++;
      continue;
    }

    let newStatus = 'pending'; // Default
    let stageChangedAt = customer.requestedAt;

    // Check if they have a fulfilled purchase
    const fulfilledPurchase = customer.purchaseIntents.find(pi => pi.status === 'fulfilled');
    if (fulfilledPurchase) {
      newStatus = 'purchased';
      stageChangedAt = fulfilledPurchase.fulfilledAt || fulfilledPurchase.createdAt;
    }
    // Check if they have any purchase request (pending or ready)
    else if (customer.purchaseIntents.length > 0) {
      newStatus = 'purchase_requested';
      stageChangedAt = customer.purchaseIntents[0].createdAt;
    }
    // Check if they redeemed their sample
    else if (customer.redeemed) {
      newStatus = 'sampling';
      stageChangedAt = customer.redeemedAt || customer.requestedAt;
    }
    // Otherwise they just requested a sample
    else {
      newStatus = 'pending'; // sample_requested
      stageChangedAt = customer.requestedAt;
    }

    // Update the customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        currentStage: newStatus,
        stageChangedAt: stageChangedAt
      }
    });

    console.log(`✅ ${customer.memberId}: ${customer.currentStage} → ${newStatus}`);
    updated++;
  }

  console.log(`\n✨ Done! Updated ${updated} customers, skipped ${skipped}`);
  await prisma.$disconnect();
}

backfillCustomerStatuses().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
