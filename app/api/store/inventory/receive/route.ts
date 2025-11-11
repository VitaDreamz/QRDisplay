/**
 * Mark incoming inventory as received
 * Moves quantity from incoming → onHand
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { incomingOrderId } = await req.json();

    if (!incomingOrderId) {
      return NextResponse.json({ error: 'Missing incomingOrderId' }, { status: 400 });
    }

    // Get the incoming order with inventory details
    const incomingOrder = await prisma.incomingInventoryOrder.findUnique({
      where: { id: incomingOrderId },
      include: { storeInventory: true }
    });

    if (!incomingOrder) {
      return NextResponse.json({ error: 'Incoming order not found' }, { status: 404 });
    }

    if (incomingOrder.status === 'received') {
      return NextResponse.json({ error: 'Order already received' }, { status: 400 });
    }

    // Move from incoming to onHand
    const updatedInventory = await prisma.storeInventory.update({
      where: { id: incomingOrder.storeInventoryId },
      data: {
        quantityIncoming: { decrement: incomingOrder.quantityOrdered },
        quantityOnHand: { increment: incomingOrder.quantityOrdered },
        quantityAvailable: { increment: incomingOrder.quantityOrdered },
        lastRestocked: new Date()
      }
    });

    // Mark order as received
    await prisma.incomingInventoryOrder.update({
      where: { id: incomingOrderId },
      data: {
        status: 'received',
        receivedAt: new Date(),
        quantityReceived: incomingOrder.quantityOrdered
      }
    });

    // Log transaction
    await prisma.inventoryTransaction.create({
      data: {
        storeId: incomingOrder.storeId,
        productSku: incomingOrder.productSku,
        type: 'wholesale_received',
        quantity: incomingOrder.quantityOrdered,
        balanceAfter: updatedInventory.quantityOnHand,
        notes: `Received wholesale order #${incomingOrder.shopifyOrderNumber} - ${incomingOrder.quantityOrdered} units`
      }
    });

    console.log(`✅ Marked order ${incomingOrder.shopifyOrderNumber} as received - ${incomingOrder.quantityOrdered} units added to inventory`);

    return NextResponse.json({ 
      success: true,
      inventory: updatedInventory
    });

  } catch (error) {
    console.error('❌ Error marking order as received:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
