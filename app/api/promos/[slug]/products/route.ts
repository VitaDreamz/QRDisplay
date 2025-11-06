import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/promos/[slug]/products - Fetch available products for promo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find the promo redemption
    const promo = await prisma.promoRedemption.findUnique({
      where: { promoSlug: slug },
      include: {
        store: true,
        customer: true
      }
    });

    if (!promo) {
      return NextResponse.json(
        { ok: false, error: 'Promo not found' },
        { status: 404 }
      );
    }

    // Check if already redeemed
    if (promo.redeemedAt) {
      return NextResponse.json({
        ok: false,
        used: true,
        error: 'Promo already redeemed'
      });
    }

    // Check if promo has already been converted to purchase intent
    const existingIntent = await prisma.purchaseIntent.findFirst({
      where: {
        customerId: promo.customerId,
        storeId: promo.storeId,
        status: {
          in: ['pending', 'ready']
        }
      }
    });

    if (existingIntent) {
      return NextResponse.json({
        ok: false,
        used: true,
        error: 'You have already submitted a purchase request for this promo'
      });
    }

    // Get store's available products
    const products = await prisma.product.findMany({
      where: {
        sku: {
          in: promo.store.availableProducts
        },
        active: true
        // Note: Some environments/types are missing productType in where input; filter in-app below
      },
      select: {
        sku: true,
        name: true,
        description: true,
        price: true,
        msrp: true,
        imageUrl: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Extract discount percent from promo offer (e.g., "20% Off In-Store Purchase" -> 20)
    const discountMatch = promo.promoOffer.match(/(\d+)%/);
    const discountPercent = discountMatch ? parseInt(discountMatch[1]) : 20;

    return NextResponse.json({
      ok: true,
      storeName: promo.store.storeName,
      promoOffer: promo.promoOffer,
      discountPercent,
      customerName: promo.customer.firstName,
      products: products
        .map(p => ({
        ...p,
        price: parseFloat(p.price.toString()),
        msrp: p.msrp ? parseFloat(p.msrp.toString()) : null
      }))
    });
  } catch (error) {
    console.error('[Promo Products API] GET error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch promo products' },
      { status: 500 }
    );
  }
}
