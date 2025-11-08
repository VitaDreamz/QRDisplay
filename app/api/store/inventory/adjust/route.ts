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

    const { productSku, quantity, type = 'manual_adjustment' } = await request.json();

    if (!productSku || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: productSku, quantity' },
        { status: 400 }
      );
    }

    if (quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity cannot be negative' },
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

    if (existing) {
      // Update existing inventory
      const updated = await prisma.storeInventory.update({
        where: {
          storeId_productSku: {
            storeId: store.id,
            productSku
          }
        },
        data: {
          quantityOnHand: quantity,
          quantityAvailable: quantity - existing.quantityReserved,
          updatedAt: new Date()
        }
      });

      // Create transaction record
      await prisma.inventoryTransaction.create({
        data: {
          storeId: store.id,
          productSku,
          type,
          quantity: quantity - existing.quantityOnHand, // Change amount
          balanceAfter: quantity,
          notes: `Manual adjustment by ${role}`
        }
      });

      return NextResponse.json({ 
        success: true,
        inventory: {
          quantityOnHand: updated.quantityOnHand,
          quantityAvailable: updated.quantityAvailable
        }
      });
    } else {
      // Create new inventory record
      const created = await prisma.storeInventory.create({
        data: {
          storeId: store.id,
          productSku,
          quantityOnHand: quantity,
          quantityReserved: 0,
          quantityAvailable: quantity
        }
      });

      // Create transaction record
      await prisma.inventoryTransaction.create({
        data: {
          storeId: store.id,
          productSku,
          type: 'initial_stock',
          quantity,
          balanceAfter: quantity,
          notes: `Initial inventory set by ${role}`
        }
      });

      return NextResponse.json({
        success: true,
        inventory: {
          quantityOnHand: created.quantityOnHand,
          quantityAvailable: created.quantityAvailable
        }
      });
    }
  } catch (error) {
    console.error('[Inventory Adjust] Error:', error);
    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
