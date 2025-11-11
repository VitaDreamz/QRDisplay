/**
 * Product Hold Management
 * Create, release, and cancel 24-hour product holds for customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST - Create a product hold
 */
export async function POST(req: NextRequest) {
  try {
    const { customerId, productSku, quantity = 1, storeId } = await req.json();

    if (!customerId || !productSku || !storeId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if inventory is available
    const inventory = await prisma.storeInventory.findUnique({
      where: {
        storeId_productSku: {
          storeId,
          productSku
        }
      }
    });

    if (!inventory || inventory.quantityAvailable < quantity) {
      return NextResponse.json({ 
        error: 'Insufficient inventory',
        available: inventory?.quantityAvailable || 0,
        requested: quantity
      }, { status: 400 });
    }

    // Create hold (expires in 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const hold = await prisma.productHold.create({
      data: {
        storeId,
        customerId,
        productSku,
        quantity,
        status: 'active',
        expiresAt,
        notifiedAt: new Date() // Store is notified immediately
      }
    });

    // Reserve inventory
    await prisma.storeInventory.update({
      where: { id: inventory.id },
      data: {
        quantityReserved: { increment: quantity },
        quantityAvailable: { decrement: quantity }
      }
    });

    // Log transaction
    await prisma.inventoryTransaction.create({
      data: {
        storeId,
        productSku,
        type: 'hold_created',
        quantity: -quantity, // Negative because it's reserved
        customerId,
        balanceAfter: inventory.quantityOnHand,
        expiresAt,
        notes: `24-hour hold created for customer - ${quantity} unit(s)`
      }
    });

    console.log(`✅ Created 24-hour hold for ${quantity}x ${productSku} (expires: ${expiresAt})`);

    return NextResponse.json({
      success: true,
      hold,
      expiresAt
    });

  } catch (error) {
    console.error('❌ Error creating product hold:', error);
    return NextResponse.json(
      { error: 'Failed to create hold', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Release or cancel a hold
 */
export async function PATCH(req: NextRequest) {
  try {
    const { holdId, action } = await req.json(); // action: 'picked_up', 'cancelled', 'expired'

    if (!holdId || !action) {
      return NextResponse.json({ error: 'Missing holdId or action' }, { status: 400 });
    }

    if (!['picked_up', 'cancelled', 'expired'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the hold
    const hold = await prisma.productHold.findUnique({
      where: { id: holdId }
    });

    if (!hold) {
      return NextResponse.json({ error: 'Hold not found' }, { status: 404 });
    }

    if (hold.status !== 'active') {
      return NextResponse.json({ error: 'Hold is not active' }, { status: 400 });
    }

    // Get inventory
    const inventory = await prisma.storeInventory.findUnique({
      where: {
        storeId_productSku: {
          storeId: hold.storeId,
          productSku: hold.productSku
        }
      }
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    // Update hold status
    const updatedHold = await prisma.productHold.update({
      where: { id: holdId },
      data: {
        status: action,
        pickedUpAt: action === 'picked_up' ? new Date() : undefined
      }
    });

    if (action === 'picked_up') {
      // Decrement reserved AND onHand (product is now sold)
      await prisma.storeInventory.update({
        where: { id: inventory.id },
        data: {
          quantityReserved: { decrement: hold.quantity },
          quantityOnHand: { decrement: hold.quantity }
        }
      });

      // Log transaction
      await prisma.inventoryTransaction.create({
        data: {
          storeId: hold.storeId,
          productSku: hold.productSku,
          type: 'promo_sale', // Customer picked up their held item
          quantity: -hold.quantity,
          customerId: hold.customerId,
          balanceAfter: inventory.quantityOnHand - hold.quantity,
          notes: `Hold picked up - ${hold.quantity} unit(s) sold`
        }
      });

      console.log(`✅ Hold picked up - ${hold.quantity}x ${hold.productSku} sold`);
    } else {
      // Released or expired - return to available
      await prisma.storeInventory.update({
        where: { id: inventory.id },
        data: {
          quantityReserved: { decrement: hold.quantity },
          quantityAvailable: { increment: hold.quantity }
        }
      });

      // Log transaction
      await prisma.inventoryTransaction.create({
        data: {
          storeId: hold.storeId,
          productSku: hold.productSku,
          type: action === 'expired' ? 'hold_expired' : 'hold_released',
          quantity: hold.quantity, // Positive because it's back in available
          customerId: hold.customerId,
          balanceAfter: inventory.quantityOnHand,
          notes: `Hold ${action} - ${hold.quantity} unit(s) returned to available`
        }
      });

      console.log(`✅ Hold ${action} - ${hold.quantity}x ${hold.productSku} returned to available`);
    }

    return NextResponse.json({
      success: true,
      hold: updatedHold,
      action
    });

  } catch (error) {
    console.error('❌ Error updating product hold:', error);
    return NextResponse.json(
      { error: 'Failed to update hold', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get all active holds for a store
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status') || 'active';

    if (!storeId) {
      return NextResponse.json({ error: 'Missing storeId' }, { status: 400 });
    }

    const holds = await prisma.productHold.findMany({
      where: {
        storeId,
        status
      },
      include: {
        customer: {
          select: {
            memberId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ holds });

  } catch (error) {
    console.error('❌ Error fetching holds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holds', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
