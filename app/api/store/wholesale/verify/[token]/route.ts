import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Load inventory items for verification
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find all inventory items with this verification token
    const inventoryItems = await prisma.storeInventory.findMany({
      where: { verificationToken: token },
      include: {
        store: {
          select: {
            id: true,
            storeId: true,
            storeName: true,
          },
        },
        product: true,
      },
    });

    if (inventoryItems.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 404 });
    }

    // Group by store (should all be same store)
    const store = inventoryItems[0].store;

    // Transform to match expected format
    const order = {
      store: {
        name: store.storeName,
        id: store.id,
      },
      items: inventoryItems.map(inv => ({
        id: inv.id,
        productSku: inv.productSku,
        product: inv.product,
        retailUnits: inv.quantityIncoming,
        quantity: Math.ceil(inv.quantityIncoming / (inv.product.unitsPerBox || 1)), // Calculate boxes
      })),
      deliveredAt: new Date(), // Approximate
    };

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('[Verify Inventory GET] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Submit verification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { receivedQuantities, notes } = await req.json();

    // Find all inventory items with this verification token
    const inventoryItems = await prisma.storeInventory.findMany({
      where: { verificationToken: token },
      include: {
        store: true,
        product: true,
      },
    });

    if (inventoryItems.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 404 });
    }

    console.log(`📦 Verifying ${inventoryItems.length} products for store ${inventoryItems[0].store.storeName}`);

    // Update each inventory item
    for (const inventory of inventoryItems) {
      const receivedQty = receivedQuantities[inventory.id] || 0;
      const expectedQty = inventory.quantityIncoming;

      console.log(`  - ${inventory.productSku}: Expected ${expectedQty}, Received ${receivedQty}`);

      // Update inventory: move from incoming to on-hand
      await prisma.storeInventory.update({
        where: { id: inventory.id },
        data: {
          quantityOnHand: {
            increment: receivedQty,
          },
          quantityIncoming: {
            decrement: expectedQty, // Clear all incoming for this product
          },
          quantityAvailable: {
            increment: receivedQty,
          },
          verificationToken: null, // Clear token after verification
          lastRestocked: new Date(),
        },
      });

      // Log inventory transaction
      await prisma.inventoryTransaction.create({
        data: {
          storeId: inventory.store.id,
          productSku: inventory.productSku,
          type: 'wholesale_received',
          quantity: receivedQty,
          balanceAfter: 0, // Will be updated by triggers
          notes: `Verified receipt of wholesale shipment${receivedQty !== expectedQty ? ` (expected ${expectedQty}, received ${receivedQty})` : ''}${notes ? ` - ${notes}` : ''}`,
        },
      });

      // Log discrepancy if any
      if (receivedQty !== expectedQty) {
        const difference = receivedQty - expectedQty;
        console.log(`⚠️ Discrepancy in ${inventory.productSku}: expected ${expectedQty}, received ${receivedQty} (${difference > 0 ? '+' : ''}${difference})`);
      }
    }

    console.log(`✅ Verification complete - inventory updated for ${inventoryItems.length} products`);

    return NextResponse.json({ 
      success: true,
      itemsVerified: inventoryItems.length 
    });
  } catch (error: any) {
    console.error('[Verify Inventory POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
