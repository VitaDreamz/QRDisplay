import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/stores/[storeId]/partnerships/update
// Update inventory and product offerings for brand partnerships
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const body = await req.json();
    const { inventory, offerings } = body;

    // Find the store
    const store = await prisma.store.findUnique({
      where: { storeId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Update inventory for all products
    if (inventory) {
      for (const [sku, quantity] of Object.entries(inventory)) {
        await prisma.storeInventory.upsert({
          where: {
            storeId_productSku: {
              storeId: store.id,
              productSku: sku,
            },
          },
          create: {
            storeId: store.id,
            productSku: sku,
            quantityOnHand: quantity as number,
          },
          update: {
            quantityOnHand: quantity as number,
          },
        });
      }
    }

    // Update offerings for each brand partnership
    if (offerings) {
      for (const [brandId, brandOfferings] of Object.entries(offerings)) {
        const { samples, products } = brandOfferings as { samples: string[]; products: string[] };

        await prisma.storeBrandPartnership.updateMany({
          where: {
            storeId: store.id,
            brandId: brandId,
          },
          data: {
            availableSamples: samples,
            availableProducts: products,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating partnerships:', error);
    return NextResponse.json(
      { error: 'Failed to update partnerships' },
      { status: 500 }
    );
  }
}
