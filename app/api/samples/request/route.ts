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
  const { displayId, firstName, lastName, phone, sampleChoice } = body || {};

    if (!displayId || !firstName || !lastName || !phone || !sampleChoice) {
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

    // Validate that the sample SKU is available at this store
    if (!display.store.availableSamples || !display.store.availableSamples.includes(sampleChoice)) {
      return NextResponse.json({ error: 'This sample is not offered at this store' }, { status: 400 });
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

    // Generate Member ID
    const memberId = await generateMemberId();

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        memberId,
        orgId: display.assignedOrgId || display.organization!.id,
        storeId: display.store.storeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: normalizedPhone,
        sampleChoice: sampleLabel,
        activated: false,
        redeemed: false,
        requestedAt: new Date(),
        attributedStoreId: display.store.storeId, // Set for commission tracking
        sampleDate: new Date(), // Track when sample was requested
      }
    });

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
      const last = String(lastName).trim();
      const last4 = customer.phone.replace(/\D/g, '').slice(-4);

  // Customer SMS with activation link
  const customerMsg = `Hi ${first}, Your ${sampleLabel} is ready for pickup! Ask a ${storeName} Staff Member to enter their PIN on this link to unlock your freebie. ${baseUrl}/a/${slugActivate}`;
      await client.messages.create({
        to: customer.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: customerMsg,
      });

      // Store alert SMS (if store has admin phone)
      if (display.store.adminPhone) {
  const storeMsg = `${display.organization?.name || 'VitaDreamz'} Sample Request: ${sampleLabel} for ${first} ${last}. ${customer.memberId}. Have them enter a STAFF PIN via the link on their phone to verify and give them the sample.`;
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
      if (display.organization?.supportEmail) {
        await sendBrandSampleRequestEmail({
          brandEmail: display.organization.supportEmail,
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
      // Fetch full organization with Shopify fields
      const org = await prisma.organization.findUnique({
        where: { orgId: display.assignedOrgId || display.organization!.orgId },
      });
      
      if (org?.shopifyActive) {
        const result = await syncCustomerToShopify(org, {
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
          await addCustomerTimelineEvent(org, result.shopifyCustomerId, {
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
