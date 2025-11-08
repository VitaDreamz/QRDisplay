import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      );
    }

    // Get inventory for this store
    const inventory = await prisma.storeInventory.findMany({
      where: { store: { storeId } }, // Query by human-readable storeId
      select: {
        productSku: true,
        quantityOnHand: true,
        quantityReserved: true,
        quantityAvailable: true,
        updatedAt: true,
      },
      orderBy: { productSku: 'asc' },
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('[API] Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
