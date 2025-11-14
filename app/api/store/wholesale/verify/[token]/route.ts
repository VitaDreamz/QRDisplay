import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Load order for verification
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const order = await prisma.wholesaleOrder.findUnique({
      where: { verificationToken: token },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: {
          select: {
            id: true,
            storeId: true,
            name: true,
          },
        },
      },
    });

    if (!order || order.status === 'received') {
      return NextResponse.json({ error: 'Order not found or already verified' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('[Verify Order GET] Error:', error);
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

    const order = await prisma.wholesaleOrder.findUnique({
      where: { verificationToken: token },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: {
          select: {
            id: true,
            storeId: true,
          },
        },
      },
    });

    if (!order || order.status === 'received') {
      return NextResponse.json({ error: 'Order not found or already verified' }, { status: 404 });
    }

    // Update order status
    await prisma.wholesaleOrder.update({
      where: { id: order.id },
      data: {
        status: 'received',
        receivedAt: new Date(),
        verificationNotes: notes || null,
      },
    });

    // Update inventory and mark items as verified
    for (const item of order.items) {
      const receivedQty = receivedQuantities[item.id] || 0;

      // Mark item as verified
      await prisma.wholesaleOrderItem.update({
        where: { id: item.id },
        data: {
          verified: true,
          receivedQuantity: receivedQty,
        },
      });

      // Update store inventory
      const retailSku = item.retailSku || item.productSku.replace('-BX', '');
      
      await prisma.storeInventory.update({
        where: {
          storeId_productSku: {
            storeId: order.store.id,
            productSku: retailSku,
          },
        },
        data: {
          quantityOnHand: {
            increment: receivedQty,
          },
          quantityIncoming: {
            decrement: item.retailUnits || receivedQty,
          },
          pendingOrderId: null,
          lastRestocked: new Date(),
        },
      });

      // Log inventory transaction
      await prisma.inventoryTransaction.create({
        data: {
          storeId: order.store.id,
          productSku: retailSku,
          type: 'wholesale_received',
          quantity: receivedQty,
          balanceAfter: 0, // Will be calculated
          notes: `Verified receipt of wholesale order ${order.orderId}${receivedQty !== item.retailUnits ? ` (expected ${item.retailUnits}, received ${receivedQty})` : ''}`,
        },
      });

      // If there's a discrepancy, create a note
      if (receivedQty !== item.retailUnits) {
        const difference = receivedQty - (item.retailUnits || 0);
        console.log(`⚠️ Discrepancy in ${retailSku}: expected ${item.retailUnits}, received ${receivedQty} (${difference > 0 ? '+' : ''}${difference})`);
      }
    }

    console.log(`✅ Order ${order.orderId} verified and inventory updated`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Verify Order POST] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
