import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { customAlphabet } from 'nanoid';
import { sendBrandPurchaseIntentEmail, sendStorePurchaseIntentEmail } from '@/lib/email';
import { addCustomerTimelineEvent, updateCustomerStage } from '@/lib/shopify';

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

    // Update customer status to "purchase_requested"
    let org = null;
    try {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          currentStage: 'purchase_requested',
          stageChangedAt: new Date()
        }
      });
      
      // Update Shopify stage and add timeline event
      org = await prisma.organization.findUnique({
        where: { id: customer.orgId } // customer.orgId is CUID, matches Organization.id
      });
      
      if (org?.shopifyActive && (customer as any).shopifyCustomerId) {
        try {
          const shopifyCustomerId = (customer as any).shopifyCustomerId;
          
          // Update stage tag
          await updateCustomerStage(org, shopifyCustomerId, 'purchase-intent');
          
          // Add timeline event
          await addCustomerTimelineEvent(org, shopifyCustomerId, {
            message: `Requested Purchase: ${product.name} ($${finalPrice}) at ${store.storeName}`,
            occurredAt: new Date(),
          });
        } catch (shopifyErr) {
          console.error('❌ Shopify update failed:', shopifyErr);
        }
      }
    } catch (e) {
      console.warn('Failed to update customer status to purchase_requested:', e);
    }


    // Fire notifications (best-effort, non-blocking)
    try {
      // Store notifications - notify admin (always) and on-call staff
      const storeMsg = `Purchase Request at ${store.storeName}: ${org?.name || 'VitaDreamz'} - ${product.name}\nPrice: $${parseFloat(finalPrice).toFixed(2)} (${discountPercent}% off $${parseFloat(originalPrice).toFixed(2)} MSRP)\n\nCheck stock & mark ready at qrdisplay.com/store/login/${store.storeId} in your dashboard.`;
      
      if (
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
      ) {
        try {
          const twilio = require('twilio');
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          
          // Always notify store admin if phone exists
          if (store.adminPhone) {
            await client.messages.create({
              to: store.adminPhone,
              from: process.env.TWILIO_PHONE_NUMBER,
              body: storeMsg
            });
          }
          
          // Also notify all on-call staff members
          try {
            const { notifyOnCallStaff } = await import('@/lib/staff-notifications');
            await notifyOnCallStaff({
              storeId: store.storeId,
              message: storeMsg,
            });
          } catch (staffErr) {
            console.warn('⚠️ Failed to notify on-call staff:', staffErr);
            // Don't fail the request if staff notifications fail
          }
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
            const sms = `Thanks for your request! ${store.storeName} will text you when your ${product.name} is ready for pickup. Typically 1-3 Days Max.`;
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
            store: { storeName: store.storeName, storeId: store.storeId },
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
        adminEmail: true,
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
