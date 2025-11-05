import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

// POST /api/purchase-intent - Create a purchase intent when customer selects product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      promoSlug,
      productSku,
      originalPrice,
      discountPercent,
      finalPrice
    } = body;
    
    // Validation
    if (!promoSlug || !productSku || !originalPrice || !discountPercent || !finalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find the promo redemption
    const promo = await prisma.promoRedemption.findUnique({
      where: { promoSlug },
      include: {
        customer: true,
        store: true
      }
    });
    
    if (!promo) {
      return NextResponse.json(
        { error: 'Promo not found' },
        { status: 404 }
      );
    }
    
    // Check if already redeemed
    if (promo.redeemedAt) {
      return NextResponse.json(
        { error: 'Promo already redeemed' },
        { status: 400 }
      );
    }
    
    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: { sku: productSku }
    });
    
    if (!product || !product.active) {
      return NextResponse.json(
        { error: 'Product not available' },
        { status: 400 }
      );
    }
    
    // Check if store has this product
    if (!promo.store.availableProducts.includes(productSku)) {
      return NextResponse.json(
        { error: 'Product not available at this store' },
        { status: 400 }
      );
    }
    
    // Check if customer already has a pending purchase intent for this promo
    const existing = await prisma.purchaseIntent.findFirst({
      where: {
        customerId: promo.customerId,
        storeId: promo.storeId,
        status: 'pending'
      }
    });
    
    if (existing) {
      // Return existing intent instead of creating duplicate
      return NextResponse.json({
        purchaseIntent: existing,
        verifySlug: existing.verifySlug
      });
    }
    
    // Generate unique verify slug
    const verifySlug = nanoid();
    
    // Create purchase intent
    const purchaseIntent = await prisma.purchaseIntent.create({
      data: {
        customerId: promo.customerId,
        storeId: promo.storeId,
        productSku,
        originalPrice: parseFloat(originalPrice.toString()),
        discountPercent: parseInt(discountPercent.toString()),
        finalPrice: parseFloat(finalPrice.toString()),
        verifySlug,
        status: 'pending'
      }
    });
    
    return NextResponse.json({
      purchaseIntent,
      verifySlug
    }, { status: 201 });
  } catch (error) {
    console.error('[Purchase Intent API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase intent' },
      { status: 500 }
    );
  }
}

// GET /api/purchase-intent?verifySlug=XXX - Get purchase intent details
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const verifySlug = searchParams.get('verifySlug');
    
    if (!verifySlug) {
      return NextResponse.json(
        { error: 'verifySlug is required' },
        { status: 400 }
      );
    }
    
    const intent = await prisma.purchaseIntent.findUnique({
      where: { verifySlug },
      include: {
        customer: true,
        product: true
      }
    });
    
    if (!intent) {
      return NextResponse.json(
        { error: 'Purchase intent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ intent });
  } catch (error) {
    console.error('[Purchase Intent API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase intent' },
      { status: 500 }
    );
  }
}
