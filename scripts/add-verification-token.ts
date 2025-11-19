/**
 * Add verification token to existing inventory with quantityIncoming
 * This is for testing the verification flow with old data
 */

import prisma from '@/lib/prisma';

async function addVerificationToken() {
  try {
    // Find all inventory records with incoming but no verification token
    const inventoryWithIncoming = await prisma.storeInventory.findMany({
      where: {
        quantityIncoming: { gt: 0 },
        verificationToken: null,
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
      console.log('✅ No inventory records need a verification token');
      return;
    }

    console.log(`\n📦 Found ${inventoryWithIncoming.length} inventory records with incoming but no token`);

    // Group by store to create one token per store
    const byStore = new Map<string, typeof inventoryWithIncoming>();
    for (const inv of inventoryWithIncoming) {
      const storeId = inv.store.storeId;
      if (!byStore.has(storeId)) {
        byStore.set(storeId, []);
      }
      byStore.get(storeId)!.push(inv);
    }

    // Create one verification token per store
    for (const [storeId, items] of byStore.entries()) {
      const verificationToken = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`\n🏪 Store: ${items[0].store.storeName} (${storeId})`);
      console.log(`   Token: ${verificationToken}`);
      console.log(`   Items to verify:`);

      for (const item of items) {
        console.log(`     - ${item.productSku} (${item.product.name}): ${item.quantityIncoming} units`);
        
        await prisma.storeInventory.update({
          where: { id: item.id },
          data: { verificationToken },
        });
      }

      console.log(`   ✅ Updated ${items.length} products with verification token`);
      console.log(`   🔗 Verify at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/store/wholesale/verify/${verificationToken}`);
    }

    console.log(`\n✅ Done! Updated ${inventoryWithIncoming.length} inventory records`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addVerificationToken();
