import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Get store with brand partnerships
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: {
        brandPartnerships: {
          where: { active: true },
          include: {
            brand: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Get all brand org IDs from partnerships
    const brandOrgIds = store.brandPartnerships.map(p => p.brand.orgId);

    // Fetch all products for these brands
    const products = await prisma.product.findMany({
      where: {
        orgId: { in: brandOrgIds },
        active: true,
      },
      include: {
        brand: {
          select: {
            orgId: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { name: 'asc' },
      ],
    });

    // Get inventory for this store (including pending orders)
    const inventory = await prisma.storeInventory.findMany({
      where: { storeId: store.id },
    });

    // Get pending wholesale orders with verification tokens
    const pendingOrders = await prisma.wholesaleOrder.findMany({
      where: {
        storeId: store.id,
        status: { in: ['delivered', 'fulfilled'] }, // Orders awaiting verification
      },
      select: {
        orderId: true,
        verificationToken: true,
        items: {
          select: {
            retailSku: true,
          },
        },
      },
    });

    // Map pending orders by SKU
    const pendingOrderMap = new Map<string, { orderId: string; verificationToken: string | null }>();
    for (const order of pendingOrders) {
      for (const item of order.items) {
        if (item.retailSku) {
          pendingOrderMap.set(item.retailSku, {
            orderId: order.orderId,
            verificationToken: order.verificationToken,
          });
        }
      }
    }

    // Map inventory data to products
    const inventoryMap = new Map(
      inventory.map(inv => [inv.productSku, {
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
        quantityIncoming: inv.quantityIncoming || 0,
        pendingOrderId: inv.pendingOrderId,
      }])
    );

    // Add inventory quantities to products
    const productsWithInventory = products.map(product => {
      const inv = inventoryMap.get(product.sku);
      const pendingOrder = pendingOrderMap.get(product.sku);
      return {
        ...product,
        inventoryQuantity: inv?.quantityOnHand || 0,
        quantityReserved: inv?.quantityReserved || 0,
        quantityIncoming: inv?.quantityIncoming || 0,
        pendingOrderId: inv?.pendingOrderId,
        verificationToken: pendingOrder?.verificationToken,
      };
    });

    // Auto-add all products to availableProducts/availableSamples if not already there
    const currentSamples = store.availableSamples || [];
    const currentProducts = store.availableProducts || [];
    
    const allSampleSkus = products
      .filter(p => p.productType === 'sample')
      .map(p => p.sku);
    const allRetailSkus = products
      .filter(p => p.productType === 'retail')
      .map(p => p.sku);
    
    const newSamples = [...new Set([...currentSamples, ...allSampleSkus])];
    const newProducts = [...new Set([...currentProducts, ...allRetailSkus])];
    
    // Only update if there are new products to add
    const samplesChanged = newSamples.length > currentSamples.length;
    const productsChanged = newProducts.length > currentProducts.length;
    
    if (samplesChanged || productsChanged) {
      await prisma.store.update({
        where: { id: store.id },
        data: {
          ...(samplesChanged && { availableSamples: newSamples }),
          ...(productsChanged && { availableProducts: newProducts }),
        },
      });
      console.log(`✅ Auto-added products for ${store.storeName}: ${newSamples.length - currentSamples.length} samples, ${newProducts.length - currentProducts.length} retail products`);
    }

    return NextResponse.json({ products: productsWithInventory });
  } catch (error) {
    console.error('Store products API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store products' },
      { status: 500 }
    );
  }
}
