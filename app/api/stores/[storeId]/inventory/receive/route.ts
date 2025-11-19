import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Mark incoming inventory as received
 * POST /api/stores/[storeId]/inventory/receive
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { productSku, quantityReceived } = await req.json();
    const { storeId } = params;

    if (!productSku || !quantityReceived) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the store
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Update inventory: move incoming to on hand
    const inventory = await prisma.storeInventory.update({
      where: {
        storeId_productSku: {
          storeId: store.id,
          productSku,
        },
      },
      data: {
        quantityOnHand: { increment: quantityReceived },
        quantityIncoming: { decrement: quantityReceived },
        quantityAvailable: { increment: quantityReceived },
      },
    });

    // Log the transaction
    await prisma.inventoryTransaction.create({
      data: {
        storeId: store.id,
        productSku,
        type: 'wholesale_received',
        quantity: quantityReceived,
        balanceAfter: inventory.quantityOnHand,
        notes: `Marked ${quantityReceived} units as received from wholesale order`,
      },
    });

    console.log(`✅ Marked ${quantityReceived} units of ${productSku} as received for store ${storeId}`);

    return NextResponse.json({ success: true, inventory });
  } catch (error: any) {
    console.error('Error receiving inventory:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
