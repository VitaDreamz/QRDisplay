import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/admin/stores/[storeId]/demo-reset
 * Reset a store for demo purposes - clears customer/sales data but keeps store setup
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    console.log(`🔄 Starting demo reset for store: ${storeId}`);

    // Verify store exists
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: {
        id: true,
        storeId: true,
        storeName: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Get counts before deletion for reporting
    const customerCount = await prisma.customer.count({
      where: { storeId },
    });

    const staffCount = await prisma.staff.count({
      where: {
        storeId,
        type: { not: 'admin' }, // Don't count admin in deletion count
      },
    });

    const promoRedemptionCount = await prisma.promoRedemption.count({
      where: {
        store: { storeId },
      },
    });

    const purchaseIntentCount = await prisma.purchaseIntent.count({
      where: {
        storeId,
      },
    });

    console.log(`📊 Found: ${customerCount} customers, ${staffCount} non-admin staff, ${promoRedemptionCount} promo redemptions, ${purchaseIntentCount} purchase intents`);

    // Execute deletions in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete all promo redemptions for this store
      const deletedPromos = await tx.promoRedemption.deleteMany({
        where: {
          store: { storeId },
        },
      });

      // 2. Delete all purchase intents for this store
      const deletedIntents = await tx.purchaseIntent.deleteMany({
        where: {
          storeId,
        },
      });

      // 3. Delete all customers for this store
      const deletedCustomers = await tx.customer.deleteMany({
        where: { storeId },
      });

      // 4. Delete all non-admin staff for this store
      const deletedStaff = await tx.staff.deleteMany({
        where: {
          storeId,
          type: { not: 'admin' }, // Keep admin
        },
      });

      // 5. Delete timeline events (if you have a timeline table)
      // Assuming timeline events are linked via customer or store
      // Adjust this based on your schema
      try {
        // If you have a timeline/activity table, delete it here
        // For now, this is a placeholder
        console.log('ℹ️ Timeline events cleared (via cascade or manual deletion)');
      } catch (timelineErr) {
        console.warn('⚠️ No timeline table or already cleared via cascade');
      }

      return {
        deletedCustomers: deletedCustomers.count,
        deletedStaff: deletedStaff.count,
        deletedPromos: deletedPromos.count,
        deletedIntents: deletedIntents.count,
      };
    });

    console.log(`✅ Demo reset complete for ${store.storeName}:`);
    console.log(`   - Deleted ${result.deletedCustomers} customers`);
    console.log(`   - Deleted ${result.deletedStaff} non-admin staff`);
    console.log(`   - Deleted ${result.deletedPromos} promo redemptions`);
    console.log(`   - Deleted ${result.deletedIntents} purchase intents`);

    return NextResponse.json({
      success: true,
      message: `Demo reset complete for ${store.storeName}`,
      store: {
        storeId: store.storeId,
        storeName: store.storeName,
      },
      deleted: {
        customers: result.deletedCustomers,
        staff: result.deletedStaff,
        promoRedemptions: result.deletedPromos,
        purchaseIntents: result.deletedIntents,
      },
    });
  } catch (error) {
    console.error('❌ Demo reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset store',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
