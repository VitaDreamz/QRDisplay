/**
 * Clear old incoming inventory
 * Sets quantityIncoming to 0 and clears verification tokens
 */

import prisma from '@/lib/prisma';

async function clearOldIncoming() {
  try {
    // Find all inventory records with incoming
    const inventoryWithIncoming = await prisma.storeInventory.findMany({
      where: {
        quantityIncoming: { gt: 0 },
      },
      include: {
        store: {
          select: {
            storeId: true,
            storeName: true,
          },
        },
        product: {
          select: {
            sku: true,
            name: true,
          },
        },
      },
    });

    if (inventoryWithIncoming.length === 0) {
      console.log('✅ No incoming inventory to clear');
      return;
    }

    console.log(`\n📦 Found ${inventoryWithIncoming.length} inventory records with incoming`);
    console.log('\nClearing:\n');

    for (const inv of inventoryWithIncoming) {
      console.log(`  🏪 ${inv.store.storeName} - ${inv.productSku} (${inv.product.name})`);
      console.log(`     Clearing ${inv.quantityIncoming} incoming units`);

      await prisma.storeInventory.update({
        where: { id: inv.id },
        data: {
          quantityIncoming: 0,
          verificationToken: null,
          pendingOrderId: null,
        },
      });
    }

    console.log(`\n✅ Cleared ${inventoryWithIncoming.length} inventory records`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearOldIncoming();
