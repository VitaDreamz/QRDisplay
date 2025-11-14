import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await context.params;
    
    // Get display with store info (if assigned)
    const display = (await prisma.display.findUnique({
      where: { displayId },
      include: {
        store: true,
      },
    })) as any;

    if (!display) {
      return NextResponse.json(
        { error: 'Display not found' },
        { status: 404 }
      );
    }

    // If display is not assigned to a store yet (during setup), return empty brands
    if (!display.store) {
      return NextResponse.json({
        brands: [],
        displayId: display.displayId,
        setupMode: true,
      });
    }

    // Get all brand partnerships for this store
    const partnerships = await prisma.storeBrandPartnership.findMany({
      where: {
        storeId: display.store.id,
        active: true,
      },
      include: {
        brand: true,
      },
    });

    if (partnerships.length === 0) {
      return NextResponse.json(
        { error: 'No active brand partnerships found for this store' },
        { status: 404 }
      );
    }

    // Build brand data for each partnership
    const brands = await Promise.all(
      partnerships.map(async (partnership: any) => {
        const brand = partnership.brand;
        
        // Get sample products (from partnership's availableSamples array)
        let samplesWithInventory: any[] = [];
        let hasSamplesInStock = false;
        
        if (partnership.availableSamples && partnership.availableSamples.length > 0) {
          const samples = await prisma.product.findMany({
            where: {
              sku: { in: partnership.availableSamples },
              orgId: brand.id,
              active: true,
            },
          });
          
          // Check inventory for each sample
          const sampleInventory = await prisma.storeInventory.findMany({
            where: {
              storeId: display.store.id,
              productSku: { in: partnership.availableSamples },
              quantityOnHand: { gt: 0 },
            },
          });
          
          hasSamplesInStock = sampleInventory.length > 0;
          const inventoryMap = new Map(
            sampleInventory.map((inv: any) => [inv.productSku, inv.quantityOnHand])
          );
          
          samplesWithInventory = samples.map((product: any) => ({
            sku: product.sku,
            name: product.name,
            description: product.description,
            price: Number(product.price),
            msrp: Number(product.msrp),
            imageUrl: product.imageUrl,
            quantityOnHand: inventoryMap.get(product.sku) || 0,
          }));
        }
        
        // Get full-size products (from partnership's availableProducts array)
        let productsWithInventory: any[] = [];
        let hasProductsInStock = false;
        
        if (partnership.availableProducts && partnership.availableProducts.length > 0) {
          const products = await prisma.product.findMany({
            where: {
              sku: { in: partnership.availableProducts },
              orgId: brand.id,
              active: true,
            },
          });
          
          // Check inventory
          const productInventory = await prisma.storeInventory.findMany({
            where: {
              storeId: display.store.id,
              productSku: { in: partnership.availableProducts },
              quantityOnHand: { gt: 0 },
            },
          });
          
          hasProductsInStock = productInventory.length > 0;
          const inventoryMap = new Map(
            productInventory.map((inv: any) => [inv.productSku, inv.quantityOnHand])
          );
          
          productsWithInventory = products.map((product: any) => ({
            sku: product.sku,
            name: product.name,
            description: product.description,
            price: Number(product.price),
            msrp: Number(product.msrp),
            imageUrl: product.imageUrl,
            quantityOnHand: inventoryMap.get(product.sku) || 0,
          }));
        }
        
        return {
          brandId: brand.id,
          brandOrgId: brand.orgId,
          brandName: brand.name,
          brandSlug: brand.slug,
          logoUrl: brand.logoUrl,
          description: brand.description,
          commissionRate: partnership.commissionRate,
          availableSamples: samplesWithInventory,
          availableProducts: productsWithInventory,
          hasSamplesInStock,
          hasProductsInStock,
        };
      })
    );

    return NextResponse.json({
      storeId: display.store.storeId,
      storeName: display.store.storeName,
      promoOffer: display.store.promoOffer || '20% OFF',
      brands, // Array of all brands available at this store
    });
  } catch (error) {
    console.error('Error fetching brand info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand information' },
      { status: 500 }
    );
  }
}
