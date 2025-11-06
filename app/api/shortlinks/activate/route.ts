import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendBrandSampleRedemptionEmail } from '@/lib/email';

const TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

export async function POST(req: NextRequest) {
  try {
    const { slug, pin } = await req.json();
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

    const short = await prisma.shortlink.findUnique({ where: { slug } });
    if (!short) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check expiration
    const created = (short as any).createdAt as Date;
    if (created && Date.now() - created.getTime() > TTL_MS) {
      return NextResponse.json({ error: 'Link expired' }, { status: 410 });
    }

    // Already used?
    if (short.usedAt) {
      return NextResponse.json({ error: 'Link already used' }, { status: 409 });
    }

    // Fetch store and customer
    const store = await prisma.store.findUnique({ where: { storeId: short.storeId } });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const customer = await prisma.customer.findUnique({ where: { memberId: short.memberId! } });
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    // If PIN required, validate against store admin PIN or any active staff PIN
    let redeemedByStaffId: string | null = null;
    if (short.requiresPin) {
      const pinRegex = /^\d{4}$/;
      if (!pin || !pinRegex.test(pin)) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
      }
      
      // Check if it's the store admin PIN
      const isAdminPin = store.staffPin === pin;
      
      // Check if it's a staff member PIN
      let staffMember = null;
      if (!isAdminPin) {
        staffMember = await prisma.staff.findFirst({
          where: {
            storeId: store.id,
            staffPin: pin,
            status: 'active'
          }
        });
      }
      
      // If neither admin nor staff PIN matches, reject
      if (!isAdminPin && !staffMember) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
      }
      
      // Track which staff member redeemed it
      if (staffMember) {
        redeemedByStaffId = staffMember.id;
      }
    }

    // Mark customer redeemed and update status to "sampling"
    const updated = await prisma.customer.update({
      where: { memberId: customer.memberId },
      data: { 
        redeemed: true, 
        redeemedAt: new Date(),
        currentStage: 'sampling',
        stageChangedAt: new Date(),
        // Track which staff member redeemed the sample (if any)
        ...(redeemedByStaffId ? { redeemedByStaffId } : {})
      } as any,
    });
    
    // Increment staff member's samplesRedeemed counter for leaderboard
    if (redeemedByStaffId) {
      try {
        await prisma.staff.update({
          where: { id: redeemedByStaffId },
          data: { samplesRedeemed: { increment: 1 } }
        });
      } catch (e) {
        console.warn('Failed to increment staff samplesRedeemed:', e);
      }
    }

    // Mark shortlink used (and redeemed flags for audit)
    await prisma.shortlink.update({
      where: { slug },
      data: { usedAt: new Date(), redeemed: true, redeemedAt: new Date() },
    });

    // Send IMMEDIATE customer SMS with activation link (/a/[slug])
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
      const promoLink = customer.promoSlug ? `${baseUrl}/p/${customer.promoSlug}` : '';
      if (customer.phone) {
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const immediateMsg = `You're all set! If you love your ${customer.sampleChoice}, ${store.storeName} is offering ${store.promoOffer} when you come back! ${promoLink}`;
        await client.messages.create({
          to: customer.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: immediateMsg,
        });
        console.log('✅ Activation SMS sent to:', customer.phone);
      }
    } catch (smsErr) {
      console.error('❌ Activation SMS send failed:', smsErr);
      // Do not fail the request if SMS fails
    }

    // Send brand notification email (fire-and-forget)
    try {
      const org = await prisma.organization.findUnique({
        where: { orgId: customer.orgId }
      });
      if (org?.supportEmail) {
        await sendBrandSampleRedemptionEmail({
          brandEmail: org.supportEmail,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            memberId: customer.memberId,
            sampleChoice: customer.sampleChoice,
          },
          store: {
            storeName: store.storeName,
          },
          redeemedAt: updated.redeemedAt || new Date(),
        });
      }
    } catch (emailErr) {
      console.error('❌ Brand notification email failed:', emailErr);
      // Do not fail the request if email fails
    }

    return NextResponse.json({
      ok: true,
      memberId: updated.memberId,
      storeName: store.storeName,
      firstName: updated.firstName,
      lastName: updated.lastName,
      sampleChoice: updated.sampleChoice,
      role: short.role,
      action: short.action,
    });
  } catch (err) {
    console.error('Activation error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
