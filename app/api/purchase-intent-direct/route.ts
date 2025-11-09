import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { generateSlug } from '@/lib/slugs';

async function generateMemberId(): Promise<string> {
  const count = await prisma.customer.count();
  const nextNum = count + 1;
  return 'MEM-' + String(nextNum).padStart(3, '0');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayId, firstName, lastName, phone, productSku } = body || {};

    if (!displayId || !firstName || !lastName || !phone || !productSku) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Lookup display with relations
    const display = await prisma.display.findUnique({
      where: { displayId },
      include: { store: true, organization: true }
    });

    if (!display) {
      return NextResponse.json({ error: 'Display not found' }, { status: 404 });
    }
    if (display.status !== 'active') {
      return NextResponse.json({ error: 'Display is not active' }, { status: 400 });
    }
    if (!display.store || !display.storeId) {
      return NextResponse.json({ error: 'Display is not assigned to a store' }, { status: 400 });
    }
    if (display.store.status !== 'active') {
      return NextResponse.json({ error: 'Store is not active' }, { status: 400 });
    }

    // Verify product is available at this store
    if (!display.store.availableProducts || !display.store.availableProducts.includes(productSku)) {
      return NextResponse.json({ error: 'This product is not offered at this store' }, { status: 400 });
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { sku: productSku }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate pricing
    const originalPrice = product.msrp || product.price;
    const promoOffer = display.store.promoOffer || '20% off first purchase';
    const discountMatch = promoOffer.match(/(\d+)%/);
    const discountPercent = discountMatch ? parseInt(discountMatch[1]) : 20;
    const finalPrice = originalPrice.toNumber() * (1 - discountPercent / 100);

    // Normalize phone
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Invalid phone' }, { status: 400 });
    }

    // Generate Member ID
    const memberId = await generateMemberId();

    // Create customer record with purchase intent
    const customer = await prisma.customer.create({
      data: {
        memberId,
        orgId: display.assignedOrgId || display.organization!.orgId,
        storeId: display.store.storeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: normalizedPhone,
        sampleChoice: '', // No sample for direct purchase
        activated: false,
        redeemed: false,
        requestedAt: new Date(),
        attributedStoreId: display.store.storeId,
        currentStage: 'purchase_requested', // Different stage for direct purchases
      }
    });

    // Generate promo slug for redemption
    const slugPromo = generateSlug();

    // Create shortlink for promo redemption
    await prisma.shortlink.create({
      data: {
        slug: slugPromo,
        action: 'promo-redeem-direct', // New action type for direct purchase
        storeId: customer.storeId,
        memberId: customer.memberId,
        role: 'public',
        requiresPin: true,
      },
    });

    // Save promo slug and product to customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: { 
        promoSlug: slugPromo,
      }
    });

    // Create PromoRedemption record (not redeemed yet, but reserved)
    await prisma.promoRedemption.create({
      data: {
        customerId: customer.id,
        storeId: display.store.id, // Use numeric store ID, not the storeId string
        orgId: customer.orgId,
        promoOffer: promoOffer,
        promoSlug: slugPromo,
      }
    });

    // Create PurchaseIntent record for direct purchase (status: pending until redeemed)
    const purchaseIntent = await prisma.purchaseIntent.create({
      data: {
        customerId: customer.id,
        storeId: display.store.id,
        productSku: productSku,
        originalPrice: originalPrice,
        discountPercent: discountPercent,
        finalPrice: finalPrice,
        status: 'pending', // Will be set to 'fulfilled' when staff confirms
        verifySlug: slugPromo, // Use the same slug as promo redemption
      }
    });

    // Determine base URL for links
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://qrdisplay.com' : 'http://localhost:3001');

    // Send SMS with promo link
    try {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const storeName = display.store.storeName;
      const first = String(firstName).trim();
      const productName = product.name;

      const customerMsg = `You're all set to redeem ${discountPercent}% OFF ${productName}. Click this link and show to a staff member to complete your purchase! ${baseUrl}/p/${slugPromo}`;

      await client.messages.create({
        to: customer.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: customerMsg,
      });

      console.log('✅ Purchase intent SMS sent to:', customer.phone);
    } catch (smsErr) {
      console.error('❌ SMS send failed:', smsErr);
      // Do not fail the request if SMS fails
    }

    return NextResponse.json({
      success: true,
      memberId: customer.memberId,
      promoSlug: slugPromo,
    });
  } catch (error: any) {
    console.error('❌ Purchase intent direct error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create purchase intent' },
      { status: 500 }
    );
  }
}
