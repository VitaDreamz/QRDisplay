import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Look up shortlink
    const shortlink = await prisma.shortlink.findUnique({
      where: { slug }
    });

    if (!shortlink) {
      return NextResponse.json({ ok: false, error: 'Invalid promo link' }, { status: 404 });
    }

    if (shortlink.action !== 'promo-redeem' && shortlink.action !== 'promo-redeem-direct') {
      return NextResponse.json({ ok: false, error: 'Not a promo link' }, { status: 400 });
    }

    const isDirect = shortlink.action === 'promo-redeem-direct';

    // Check if expired (72 hours)
    const now = new Date();
    const createdAt = new Date(shortlink.createdAt);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 72) {
      return NextResponse.json({ ok: false, expired: true }, { status: 400 });
    }

    // Note: We don't check usedAt here because customers should be able to revisit the promo page
    // The purchase intent endpoint handles duplicate prevention

    // Get customer
    const customer = await prisma.customer.findFirst({
      where: { memberId: shortlink.memberId || '' }
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
    }

    // Get store (with location info)
    const store = await prisma.store.findUnique({
      where: { storeId: shortlink.storeId },
      select: {
        storeName: true,
        promoOffer: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        adminPhone: true,
      }
    });

    if (!store) {
      return NextResponse.json({ ok: false, error: 'Store not found' }, { status: 404 });
    }

    // For direct purchases, get the product SKU from PurchaseIntent
    let selectedProductSku: string | null = null;
    if (isDirect) {
      const purchaseIntent = await prisma.purchaseIntent.findFirst({
        where: {
          customerId: customer.id,
          verifySlug: slug,
        },
        select: {
          productSku: true
        }
      });
      selectedProductSku = purchaseIntent?.productSku || null;
    }

    // Get redemption details if already redeemed (for success page)
    const redemption = await prisma.promoRedemption.findUnique({
      where: { promoSlug: slug },
      select: {
        redeemedAt: true,
        purchaseAmount: true,
        discountAmount: true,
      }
    });

    // Get product details for the purchased item
    let purchasedProduct = null;
    if (selectedProductSku) {
      const product = await prisma.product.findUnique({
        where: { sku: selectedProductSku },
        select: {
          sku: true,
          name: true,
          imageUrl: true,
          price: true,
          msrp: true,
        }
      });
      if (product) {
        purchasedProduct = {
          ...product,
          price: parseFloat(product.price.toString()),
          msrp: product.msrp ? parseFloat(product.msrp.toString()) : null
        };
      }
    }

    // Get customer's most recent sample to determine which brand's products to show
    let brandOrgId: string | undefined = undefined;
    
    if (!isDirect) {
      // For sample-based promos, show only products from the brand they sampled
      const recentSample = await prisma.sampleHistory.findFirst({
        where: { customerId: customer.id },
        orderBy: { sampledAt: 'desc' },
        select: { 
          brandId: true,
          brand: {
            select: { orgId: true }
          }
        }
      });
      
      if (recentSample) {
        brandOrgId = recentSample.brand.orgId; // Use orgId (e.g., "ORG-001") not id (CUID)
      }
    }
    // For direct purchases, brandOrgId stays undefined = show all brands

    // Get store's available products
    const storeWithProducts = await prisma.store.findUnique({
      where: { storeId: shortlink.storeId },
      select: {
        availableProducts: true
      }
    });

    const products = await prisma.product.findMany({
      where: {
        sku: {
          in: storeWithProducts?.availableProducts || []
        },
        active: true,
        ...(brandOrgId ? { orgId: brandOrgId } : {}) // Filter by brand if applicable
      },
      select: {
        sku: true,
        name: true,
        description: true,
        category: true,
        price: true,
        msrp: true,
        imageUrl: true,
        featured: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({
      ok: true,
      isDirect, // Flag to indicate if this is a direct purchase
      selectedProductSku, // Pre-selected product for direct purchases
      storeName: store.storeName,
      promoOffer: store.promoOffer,
      customerName: `${customer.firstName} ${customer.lastName}`,
      store: {
        storeName: store.storeName,
        streetAddress: store.streetAddress,
        city: store.city,
        state: store.state,
        zipCode: store.zipCode,
        adminPhone: store.adminPhone,
      },
      redemption: redemption ? {
        redeemedAt: redemption.redeemedAt,
        purchaseAmount: redemption.purchaseAmount ? parseFloat(redemption.purchaseAmount.toString()) : null,
        discountAmount: redemption.discountAmount ? parseFloat(redemption.discountAmount.toString()) : null,
      } : null,
      purchasedProduct,
      products: products.map(p => ({
        ...p,
        price: parseFloat(p.price.toString()),
        msrp: p.msrp ? parseFloat(p.msrp.toString()) : null
      }))
    });
  } catch (err) {
    console.error('Error fetching promo:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
