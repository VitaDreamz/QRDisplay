import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Billboard API - Fetch live store data for digital displays
 * Returns store info, products, promos for billboard slideshow
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    }

    // Fetch store with products and organization info
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: {
        storeId: true,
        storeName: true,
        city: true,
        state: true,
        promoOffer: true,
        returningCustomerPromo: true,
        availableSamples: true,
        availableProducts: true,
        organizations: {
          select: {
            name: true,
            slug: true,
          }
        }
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Fetch product details for available products
    const products = await prisma.product.findMany({
      where: {
        sku: {
          in: store.availableProducts || []
        }
      },
      select: {
        sku: true,
        name: true,
        category: true,
        imageUrl: true,
      }
    });

    // Format billboard data
    const billboardData = {
      storeId: store.storeId,
      storeName: store.storeName,
      city: store.city,
      state: store.state,
      storeDescription: `Your trusted source for ${store.organizations.name} premium wellness products`,
      tagline: "Better sampling. Smarter rewards.",
      welcomeMessage: "Scan the QR code on our display to grab free samples and unlock exclusive store deals!",
      
      // Promos
      promos: [
        {
          label: "First Visit Offer",
          valueText: store.promoOffer || "20% OFF",
          headline: `Save with ${store.promoOffer || "20% OFF"} on your first purchase`,
          note: "Discount applied when you scan and activate your first visit"
        }
      ],
      
      // Brands (derived from organization)
      brands: [
        { name: store.organizations.name }
      ],
      
      // Products with images
      products: products.map(p => ({
        name: p.name,
        sku: p.sku,
        image: p.imageUrl || '/images/products/placeholder.png'
      })),
      
      // Available samples
      availableSamples: store.availableSamples || [],
      
      // Metadata
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(billboardData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      }
    });

  } catch (error) {
    console.error('[Billboard API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
