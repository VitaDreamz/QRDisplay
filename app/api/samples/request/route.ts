import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { generateSlug } from '@/lib/slugs';
import { sendBrandSampleRequestEmail } from '@/lib/email';

// Allowed sample choices
const SAMPLE_CHOICES = new Set([
  'Slumber Berry - Sleep Gummies (4ct)',
  'Luna Berry - Sleep Gummies (4ct)',
  'Bliss Berry - Relax Gummies (4ct)',
  'Berry Chill - Relax Gummies (4ct)'
]);

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

    if (!SAMPLE_CHOICES.has(sampleChoice)) {
      return NextResponse.json({ error: 'Invalid sample choice' }, { status: 400 });
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
        orgId: display.assignedOrgId || display.organization!.orgId,
        storeId: display.store.storeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        phone: normalizedPhone,
        sampleChoice,
        activated: false,
        redeemed: false,
        requestedAt: new Date(),
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
      const lastInitial = String(lastName).trim().slice(0, 1).toUpperCase() || '';
      const last4 = customer.phone.replace(/\D/g, '').slice(-4);

  // Customer SMS with activation link
  const customerMsg = `Hi ${first}! Show this text to staff at ${storeName} to claim your ${sampleChoice}.

Tap to activate: ${baseUrl}/a/${slugActivate}

Reply STOP to opt out.`;
      await client.messages.create({
        to: customer.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: customerMsg,
      });

      // Store alert SMS (if store has contact phone)
      if (display.store.contactPhone) {
  const storeMsg = `VitaDreamz Sample: ${sampleChoice} for ${first} ${lastInitial}. 

Member: ${last4}
Confirm: ${baseUrl}/r/${slugRedeem}`;
        await client.messages.create({
          to: display.store.contactPhone,
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
          },
          requestedAt: customer.requestedAt,
        });
      }
    } catch (emailErr) {
      console.error('❌ Brand notification email failed:', emailErr);
      // Do not fail the request if email fails
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
