import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await context.params;
    // Get display with organization info
    const display = (await prisma.display.findUnique({
      where: { displayId },
      include: {
        organization: true,
        store: true,
      },
    })) as any;

    if (!display || !display.organization) {
      return NextResponse.json(
        { error: 'Display not found or not assigned to an organization' },
        { status: 404 }
      );
    }

    // Check if store has products in stock
    let hasProductsInStock = false;
    let availableProductsWithInventory: any[] = [];
    let hasSamplesInStock = false;
    let availableSamplesWithInventory: any[] = [];
    
    if (display.store) {
      // Check samples inventory (4ct products)
      if (display.store.availableSamples && display.store.availableSamples.length > 0) {
        const sampleInventory = await prisma.storeInventory.findMany({
          where: {
            storeId: display.store.id,
            productSku: { in: display.store.availableSamples },
            quantityOnHand: { gt: 0 }
          },
          include: {
            product: true
          }
        });
        
        hasSamplesInStock = sampleInventory.length > 0;
        availableSamplesWithInventory = sampleInventory.map((item: any) => ({
          sku: item.product.sku,
          name: item.product.name,
          description: item.product.description,
          price: Number(item.product.price),
          msrp: Number(item.product.msrp),
          imageUrl: item.product.imageUrl,
          quantityOnHand: item.quantityOnHand
        }));
      }
      
      // Check full-size products inventory
      if (display.store.availableProducts && display.store.availableProducts.length > 0) {
        const productInventory = await prisma.storeInventory.findMany({
          where: {
            storeId: display.store.id,
            productSku: { in: display.store.availableProducts },
            quantityOnHand: { gt: 0 }
          },
          include: {
            product: true
          }
        });
        
        hasProductsInStock = productInventory.length > 0;
        availableProductsWithInventory = productInventory.map((item: any) => ({
          sku: item.product.sku,
          name: item.product.name,
          description: item.product.description,
          price: Number(item.product.price),
          msrp: Number(item.product.msrp),
          imageUrl: item.product.imageUrl,
          quantityOnHand: item.quantityOnHand
        }));
      }
    }

    return NextResponse.json({
      orgId: display.organization.orgId,
      name: display.organization.name,
      logoUrl: display.organization.logoUrl,
      supportEmail: display.organization.supportEmail || 'support@qrdisplay.com',
      supportPhone: display.organization.supportPhone,
      storeName: display.store?.storeName || null,
      availableSamples: availableSamplesWithInventory,
      availableProducts: availableProductsWithInventory,
      hasSamplesInStock,
      hasProductsInStock,
      promoOffer: display.store?.promoOffer || '$5 deal',
    });
  } catch (error) {
    console.error('Error fetching brand info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand information' },
      { status: 500 }
    );
  }
}
