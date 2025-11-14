import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { generateSlug } from '@/lib/slugs';
import { sendBrandSampleRequestEmail } from '@/lib/email';
import { syncCustomerToShopify, addCustomerTimelineEvent } from '@/lib/shopify';

async function generateMemberId(): Promise<string> {
  const count = await prisma.customer.count();
  const nextNum = count + 1;
  return 'MEM-' + String(nextNum).padStart(3, '0');
}

export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  const { displayId, firstName, lastName, phone, sampleChoice, brandOrgId } = body || {};

    if (!displayId || !firstName || !lastName || !phone || !sampleChoice) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Multi-brand: brandOrgId is optional for backwards compatibility
    // If not provided, fall back to display's assigned org (single-brand mode)

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

    // Multi-brand: Determine which brand org we're working with
    const targetBrandOrgId = brandOrgId || (display.assignedOrgId || display.organization!.orgId);
    
    // Multi-brand: Get brand organization
    const brandOrg = await prisma.organization.findUnique({
      where: { orgId: targetBrandOrgId },
    });
    
    if (!brandOrg) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Multi-brand: Validate brand partnership (if brandOrgId was provided)
    if (brandOrgId) {
      const partnership = await prisma.storeBrandPartnership.findFirst({
        where: {
          storeId: display.store.id,
          brandId: brandOrg.id,
          active: true,
        },
      });
      
      if (!partnership) {
        return NextResponse.json({ error: 'This brand is not available at this store' }, { status: 400 });
      }
      
      // Validate that the sample SKU is in the partnership's available samples
      if (!partnership.availableSamples || !partnership.availableSamples.includes(sampleChoice)) {
        return NextResponse.json({ error: 'This sample is not offered by this brand at this store' }, { status: 400 });
      }
    } else {
      // Legacy single-brand validation
      if (!display.store.availableSamples || !display.store.availableSamples.includes(sampleChoice)) {
        return NextResponse.json({ error: 'This sample is not offered at this store' }, { status: 400 });
      }
    }

    // Get the product name from database
    const product = await prisma.product.findUnique({
      where: { sku: sampleChoice }
    });

    if (!product) {
      return NextResponse.json({ error: 'Invalid sample choice' }, { status: 400 });
    }

    const sampleLabel = product.name;

    // Normalize phone
    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhone(phone);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Invalid phone' }, { status: 400 });
    }

    // Multi-brand: Check if customer already exists (by phone)
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        phone: normalizedPhone,
        orgId: brandOrg.id,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    // Multi-brand: Enforce 1 sample per day limit
    if (existingCustomer?.lastSampleDate) {
      const now = new Date();
      const lastSample = new Date(existingCustomer.lastSampleDate);
      const hoursSinceLastSample = (now.getTime() - lastSample.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSample < 24) {
        const hoursRemaining = Math.ceil(24 - hoursSinceLastSample);
        return NextResponse.json({ 
          error: `You can only claim one free sample per day. Please try again in ${hoursRemaining} hours.` 
        }, { status: 429 });
      }
    }

    // Generate Member ID
    const memberId = await generateMemberId();

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        memberId,
        orgId: brandOrg.id, // Use brand org, not display org
        storeId: display.store.storeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: normalizedPhone,
        sampleChoice: sampleLabel, // Keep for backwards compatibility
        activated: false,
        redeemed: false,
        requestedAt: new Date(),
        attributedStoreId: display.store.storeId, // Set for commission tracking
        sampleDate: new Date(), // Track when sample was requested
        lastSampleDate: new Date(), // NEW: Track for daily limit
      }
    });

    // Multi-brand: Create SampleHistory record
    const sampleHistory = await prisma.sampleHistory.create({
      data: {
        customerId: customer.id,
        brandId: brandOrg.id,
        storeId: display.store.id,
        displayId: display.id,
        productSku: sampleChoice,
        productName: sampleLabel,
        sampledAt: new Date(),
        attributionWindow: brandOrg.attributionWindow || 30,
        expiresAt: new Date(Date.now() + (brandOrg.attributionWindow || 30) * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`✅ SampleHistory created: ${sampleHistory.id} for ${customer.memberId} (${brandOrg.name})`);

    // Generate shortlink slugs
    const slugActivate = generateSlug(); // customer activation (requires PIN)
    const slugRedeem = generateSlug();   // store redemption (no PIN)
    const slugPromo = generateSlug();    // promo redemption (requires PIN)

    // Create shortlink records
    await prisma.shortlink.createMany({
      data: [
        {
          slug: slugActivate,
          action: 'manual-activate',
          storeId: customer.storeId,
          memberId: customer.memberId,
          role: 'public',
          requiresPin: true,
        },
        {
          slug: slugRedeem,
          action: 'redeem',
          storeId: customer.storeId,
          memberId: customer.memberId,
          role: 'store',
          requiresPin: false,
        },
        {
          slug: slugPromo,
          action: 'promo-redeem',
          storeId: customer.storeId,
          memberId: customer.memberId,
          role: 'public',
          requiresPin: true,
        },
      ],
    });

    // Save promo slug to customer record
    await prisma.customer.update({
      where: { id: customer.id },
      data: { promoSlug: slugPromo }
    });

    // Determine base URL for links
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? 'https://qrdisplay.com' : 'http://localhost:3001');

    // Send SMS messages (fire-and-forget style)
    try {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const storeName = display.store.storeName;
      const first = String(firstName).trim();
      const lastInitial = String(lastName).trim().slice(0, 1).toUpperCase() || '';
      const last4 = customer.phone.replace(/\D/g, '').slice(-4);

  // Customer SMS with activation link
  const customerMsg = `Hi ${first}! Show this text to staff at ${storeName} to claim your ${sampleLabel}.

Tap to activate: ${baseUrl}/a/${slugActivate}

Reply STOP to opt out.`;
      await client.messages.create({
        to: customer.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: customerMsg,
      });

      // Store alert SMS (if store has admin phone)
      if (display.store.adminPhone) {
  const storeMsg = `VitaDreamz Sample: ${sampleLabel} for ${first} ${lastInitial}. 

Member: ${last4}
Dashboard: qrdisplay.com/store/login/${display.store.storeId}`;
        await client.messages.create({
          to: display.store.adminPhone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: storeMsg,
        });
      }
    } catch (smsErr) {
      console.error('❌ SMS send failed:', smsErr);
      // Do not fail the request if SMS fails
    }

    // Send brand notification email
    try {
      if (brandOrg?.supportEmail) {
        await sendBrandSampleRequestEmail({
          brandEmail: brandOrg.supportEmail,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            memberId: customer.memberId,
            sampleChoice: customer.sampleChoice,
          },
          store: {
            storeName: display.store.storeName,
            storeId: display.store.storeId,
          },
          requestedAt: customer.requestedAt,
        });
      }
    } catch (emailErr) {
      console.error('❌ Brand notification email failed:', emailErr);
      // Do not fail the request if email fails
    }

    // Sync customer to Shopify (if integration is active)
    try {
      // Use brand org for Shopify sync (not display org)
      if (brandOrg?.shopifyActive) {
        const result = await syncCustomerToShopify(brandOrg, {
          ...customer,
          sampleProduct: sampleLabel, // Pass the sample product for tagging
          stage: 'requested', // Initial stage
        });
        
        // Update customer record with Shopify ID
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            shopifyCustomerId: result.shopifyCustomerId,
            syncedToShopify: true,
            syncedAt: new Date(),
          },
        });
        
        console.log(`✅ Customer ${customer.memberId} synced to Shopify (${result.isNew ? 'new' : 'existing'} customer #${result.shopifyCustomerId})`);
        
        // Add timeline event for sample request
        try {
          await addCustomerTimelineEvent(brandOrg, result.shopifyCustomerId, {
            message: `Requested Sample: ${sampleLabel} at ${display.store.storeName}`,
            occurredAt: customer.requestedAt,
          });
        } catch (timelineErr) {
          console.error('❌ Shopify timeline event failed:', timelineErr);
        }
      }
    } catch (shopifyErr) {
      console.error('❌ Shopify sync failed:', shopifyErr);
      // Do not fail the request if Shopify sync fails
    }

    // Return success and data for success page
    return NextResponse.json({
      ok: true,
      memberId: customer.memberId,
      storeName: display.store.storeName,
    });
  } catch (err) {
    console.error('Error handling sample request:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
