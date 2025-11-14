import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/stores/[storeId]/inventory
// Fetch inventory for a store
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Get store
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: {
        id: true,
        storeId: true,
        availableSamples: true,
        availableProducts: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Get all inventory for this store
    const inventoryRecords = await prisma.storeInventory.findMany({
      where: { storeId: store.id },
      select: {
        productSku: true,
        quantityOnHand: true,
      },
    });

    // Convert to object format: { SKU: quantity }
    const inventory: Record<string, number> = {};
    inventoryRecords.forEach(record => {
      inventory[record.productSku] = record.quantityOnHand;
    });

    return NextResponse.json({
      store: {
        storeId: store.storeId,
        availableSamples: store.availableSamples || [],
        availableProducts: store.availableProducts || [],
      },
      inventory,
    });
  } catch (error: any) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
