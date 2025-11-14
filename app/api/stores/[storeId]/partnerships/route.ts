import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/stores/[storeId]/partnerships
// Fetch all brand partnerships for a store with products and inventory
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;

    // Find the store first
    const store = await prisma.store.findUnique({
      where: { storeId },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get all brand partnerships for this store
    const partnerships = await prisma.storeBrandPartnership.findMany({
      where: {
        storeId: store.id,
        status: 'active',
      },
      include: {
        brand: true,
      },
    });

    // For each partnership, fetch the products and inventory
    const partnershipsWithProducts = await Promise.all(
      partnerships.map(async (partnership: any) => {
        const brand = partnership.brand;

        // Get sample products (4ct)
        const samples = await prisma.product.findMany({
          where: {
            orgId: brand.id,
            active: true,
            sku: { in: partnership.availableSamples || [] },
          },
        });

        // Get full-size products
        const fullSize = await prisma.product.findMany({
          where: {
            orgId: brand.id,
            active: true,
            sku: { in: partnership.availableProducts || [] },
          },
        });

        // Get inventory for all products
        const allSkus = [
          ...samples.map((p: any) => p.sku),
          ...fullSize.map((p: any) => p.sku),
        ];

        const inventory = await prisma.storeInventory.findMany({
          where: {
            storeId: store.id,
            productSku: { in: allSkus },
          },
        });

        const inventoryMap = new Map(
          inventory.map((inv: any) => [inv.productSku, inv.quantityOnHand])
        );

        // Attach inventory to products
        const samplesWithInventory = samples.map((p: any) => ({
          ...p,
          price: Number(p.price),
          msrp: Number(p.msrp),
          quantityOnHand: inventoryMap.get(p.sku) || 0,
        }));

        const fullSizeWithInventory = fullSize.map((p: any) => ({
          ...p,
          price: Number(p.price),
          msrp: Number(p.msrp),
          quantityOnHand: inventoryMap.get(p.sku) || 0,
        }));

        return {
          id: partnership.id,
          brandId: brand.id,
          brandOrgId: brand.orgId,
          brandName: brand.name,
          brandSlug: brand.slug,
          brandLogoUrl: brand.logoUrl,
          availableSamples: partnership.availableSamples || [],
          availableProducts: partnership.availableProducts || [],
          products: {
            samples: samplesWithInventory,
            fullSize: fullSizeWithInventory,
          },
        };
      })
    );

    return NextResponse.json({
      partnerships: partnershipsWithProducts,
    });
  } catch (error) {
    console.error('Error fetching store partnerships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partnerships' },
      { status: 500 }
    );
  }
}
