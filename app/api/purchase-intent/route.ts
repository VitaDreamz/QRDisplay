import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { customAlphabet } from 'nanoid';
import { sendBrandPurchaseIntentEmail, sendStorePurchaseIntentEmail } from '@/lib/email';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

// POST /api/purchase-intent - Create a purchase intent when customer selects product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slug, // Changed from promoSlug to slug (the Shortlink slug)
      productSku,
      originalPrice,
      discountPercent,
      finalPrice
    } = body;
    
    // Validation
    if (!slug || !productSku || !originalPrice || !discountPercent || !finalPrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find the shortlink
    const shortlink = await prisma.shortlink.findUnique({
      where: { slug }
    });
    
    console.log('[Purchase Intent] Shortlink lookup:', { slug, found: !!shortlink });
    
    if (!shortlink) {
      return NextResponse.json(
        { error: 'Promo not found' },
        { status: 404 }
      );
    }
    
    // Note: We don't check usedAt here because customers can create multiple purchase intents
    // The actual redemption (with PIN at register) happens in /api/promos/redeem
    
    console.log('[Purchase Intent] Looking for customer with memberId:', shortlink.memberId);
    console.log('[Purchase Intent] Looking for store with storeId:', shortlink.storeId);
    
    // Get customer and store data
    const customer = shortlink.memberId 
      ? await prisma.customer.findUnique({ where: { memberId: shortlink.memberId } })
      : null;
    
    const store = await prisma.store.findUnique({
      where: { storeId: shortlink.storeId }
    });
    
    console.log('[Purchase Intent] Found customer:', !!customer, 'Found store:', !!store);
    
    if (!customer || !store) {
      return NextResponse.json(
        { error: 'Customer or store not found', debug: { 
          hasCustomer: !!customer, 
          hasStore: !!store,
          memberId: shortlink.memberId,
          storeId: shortlink.storeId
        } },
        { status: 404 }
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
    if (!store.availableProducts.includes(productSku)) {
      return NextResponse.json(
        { error: 'Product not available at this store' },
        { status: 400 }
      );
    }
    
    // Check if customer already has a pending purchase intent for this promo
    const existing = await prisma.purchaseIntent.findFirst({
      where: {
        customerId: customer.id,
        storeId: store.id,
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
        customerId: customer.id,
        storeId: store.id,
        productSku,
        originalPrice: parseFloat(originalPrice.toString()),
        discountPercent: parseInt(discountPercent.toString()),
        finalPrice: parseFloat(finalPrice.toString()),
        verifySlug,
        status: 'pending'
      }
    });


    // Fire notifications (best-effort, non-blocking)
    try {
      // Store admin SMS (not customer-facing, no opt-out needed)
      if (
        store.adminPhone &&
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
      ) {
        try {
          const twilio = require('twilio');
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          const sms = `New purchase request at ${store.storeName}: ${productSku}\nMSRP $${parseFloat(originalPrice).toFixed(2)} → $${parseFloat(finalPrice).toFixed(2)} (${discountPercent}% off).`;
          await client.messages.create({
            to: store.adminPhone,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: sms
          });
        } catch (smsErr) {
          console.warn('Store admin SMS failed:', smsErr);
        }
      }

      // Customer SMS (opt-out compliance)
      if (
        customer.phone &&
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
      ) {
        try {
          // Check opt-out
          const optOut = await prisma.optOut.findUnique({ where: { phone: customer.phone } });
          if (!optOut) {
            const twilio = require('twilio');
            const client = twilio(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            );
            const sms = `Thanks for your request! We'll notify you when your item is ready. Reply STOP to opt out.`;
            await client.messages.create({
              to: customer.phone,
              from: process.env.TWILIO_PHONE_NUMBER,
              body: sms
            });
          }
        } catch (smsErr) {
          console.warn('Customer SMS failed:', smsErr);
        }
      }

      // Store admin email
      if (store.adminEmail) {
        try {
          // Fetch product for friendly name
          const prod = await prisma.product.findUnique({ where: { sku: productSku } });
          await sendStorePurchaseIntentEmail({
            toEmail: store.adminEmail,
            store: { storeName: store.storeName },
            customer: { firstName: customer.firstName, lastName: customer.lastName },
            product: { name: prod?.name || productSku, sku: productSku },
            pricing: {
              originalPrice: Number(originalPrice),
              discountPercent: Number(discountPercent),
              finalPrice: Number(finalPrice)
            }
          });
        } catch (emailErr) {
          console.warn('Store admin email failed:', emailErr);
        }
      }

      // Brand notifications (email + optional SMS)
      try {
        const org = await prisma.organization.findUnique({ where: { orgId: store.orgId } });
        if (org?.supportEmail) {
          const prod = await prisma.product.findUnique({ where: { sku: productSku } });
          await sendBrandPurchaseIntentEmail({
            toEmail: org.supportEmail,
            brandName: org.name,
            store: { storeName: store.storeName },
            customer: { firstName: customer.firstName, lastName: customer.lastName },
            product: { name: prod?.name || productSku, sku: productSku },
            pricing: {
              originalPrice: Number(originalPrice),
              discountPercent: Number(discountPercent),
              finalPrice: Number(finalPrice)
            }
          });
        }

        if (
          org?.supportPhone &&
          process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
        ) {
          try {
            const twilio = require('twilio');
            const client = twilio(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            );
            const sms = `New purchase request: ${store.storeName} – ${productSku} for ${customer.firstName} ${customer.lastName}.`;
            await client.messages.create({
              to: org.supportPhone,
              from: process.env.TWILIO_PHONE_NUMBER,
              body: sms
            });
          } catch (brandSmsErr) {
            console.warn('Brand SMS failed:', brandSmsErr);
          }
        }
      } catch (orgErr) {
        console.warn('Brand notification failed:', orgErr);
      }
    } catch (notifyErr) {
      console.warn('Purchase intent notifications error:', notifyErr);
    }
    
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
    
    // Fetch store details separately (avoid include type drift)
    const store = await prisma.store.findUnique({
      where: { id: intent.storeId },
      select: {
        storeName: true,
        adminPhone: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true
      }
    });

    return NextResponse.json({ intent, store });
  } catch (error) {
    console.error('[Purchase Intent API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase intent' },
      { status: 500 }
    );
  }
}
