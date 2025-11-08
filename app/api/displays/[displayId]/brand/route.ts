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
    
    if (display.store && display.store.availableProducts && display.store.availableProducts.length > 0) {
      // Fetch inventory for available products
      const inventory = await prisma.storeInventory.findMany({
        where: {
          storeId: display.store.id,
          productSku: { in: display.store.availableProducts },
          quantityOnHand: { gt: 0 }
        },
        include: {
          product: true
        }
      });
      
      hasProductsInStock = inventory.length > 0;
      availableProductsWithInventory = inventory.map((item: any) => ({
        sku: item.product.sku,
        name: item.product.name,
        description: item.product.description,
        price: item.product.price,
        msrp: item.product.msrp,
        imageUrl: item.product.imageUrl,
        quantityOnHand: item.quantityOnHand
      }));
    }

    return NextResponse.json({
      orgId: display.organization.orgId,
      name: display.organization.name,
      logoUrl: display.organization.logoUrl,
      supportEmail: display.organization.supportEmail || 'support@qrdisplay.com',
      supportPhone: display.organization.supportPhone,
      storeName: display.store?.storeName || null,
      availableSamples: display.store?.availableSamples || [],
      availableProducts: availableProductsWithInventory,
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
