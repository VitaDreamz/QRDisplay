import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store-id')?.value;
    const role = cookieStore.get('store-role')?.value;

    if (!storeId || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get store database ID
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const { productSku, quantity, type = 'manual_decrease', notes } = await request.json();

    if (!productSku || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: productSku, quantity' },
        { status: 400 }
      );
    }

    // Only allow decreases from store side (quantity must be negative)
    if (quantity >= 0) {
      return NextResponse.json(
        { error: 'Only inventory decreases are allowed. Use Wholesale Order to add inventory.' },
        { status: 400 }
      );
    }

    // Check if inventory record exists
    const existing = await prisma.storeInventory.findUnique({
      where: {
        storeId_productSku: {
          storeId: store.id,
          productSku
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found in inventory' },
        { status: 404 }
      );
    }

    // Calculate new quantity (quantity is negative for decrease)
    const newQuantity = existing.quantityOnHand + quantity;

    if (newQuantity < 0) {
      return NextResponse.json(
        { error: `Insufficient inventory. Current: ${existing.quantityOnHand}, Attempting to decrease by: ${Math.abs(quantity)}` },
        { status: 400 }
      );
    }

    // Update inventory and create transaction in a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory
      const updated = await tx.storeInventory.update({
        where: {
          storeId_productSku: {
            storeId: store.id,
            productSku
          }
        },
        data: {
          quantityOnHand: newQuantity,
          updatedAt: new Date()
        }
      });

      // Create transaction record for audit trail
      const transaction = await tx.inventoryTransaction.create({
        data: {
          storeId: store.id,
          productSku,
          type,
          quantity, // Negative value
          balanceAfter: newQuantity,
          notes: notes || `Manual decrease by ${role}`
        }
      });

      return { updated, transaction };
    });

    return NextResponse.json({ 
      success: true,
      newQuantity: result.updated.quantityOnHand,
      transaction: {
        id: result.transaction.id,
        type: result.transaction.type,
        quantity: result.transaction.quantity,
        balanceAfter: result.transaction.balanceAfter,
        createdAt: result.transaction.createdAt,
      }
    });
  } catch (error) {
    console.error('[Inventory Adjust] Error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
