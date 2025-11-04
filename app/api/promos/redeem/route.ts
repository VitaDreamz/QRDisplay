import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendBrandPromoRedemptionEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { slug, pin, purchaseAmount, discountAmount } = await request.json();

    if (!slug || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Look up shortlink
    const shortlink = await prisma.shortlink.findUnique({
      where: { slug }
    });

    if (!shortlink) {
      return NextResponse.json({ error: 'Invalid promo link' }, { status: 404 });
    }

    if (shortlink.action !== 'promo-redeem') {
      return NextResponse.json({ error: 'Not a promo link' }, { status: 400 });
    }

    // 2. Validate not expired (72 hours)
    const now = new Date();
    const createdAt = new Date(shortlink.createdAt);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 72) {
      return NextResponse.json({ error: 'Promo link expired' }, { status: 400 });
    }

    // 3. Check if already used
    if (shortlink.redeemed || shortlink.usedAt) {
      return NextResponse.json({ error: 'Promo already redeemed' }, { status: 400 });
    }

    // 4. Get customer by memberId
    const customer = await prisma.customer.findFirst({
      where: { memberId: shortlink.memberId || '' }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 5. Get store and validate PIN
    const store = await prisma.store.findUnique({
      where: { storeId: shortlink.storeId }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (store.staffPin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    // 6. Create PromoRedemption record
    await prisma.promoRedemption.create({
      data: {
        customerId: customer.id,
        storeId: store.id,
        orgId: store.orgId,
        promoOffer: store.promoOffer,
        promoSlug: slug,
        redeemedAt: new Date(),
        redeemedBy: 'staff-pin',
        purchaseAmount: purchaseAmount ? parseFloat(purchaseAmount) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
      }
    });

    // 7. Update customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        promoRedeemed: true,
        promoRedeemedAt: new Date()
      }
    });

    // 8. Mark shortlink used
    await prisma.shortlink.update({
      where: { slug },
      data: {
        usedAt: new Date(),
        redeemed: true
      }
    });

    // Send brand notification email (fire-and-forget)
    try {
      const org = await prisma.organization.findUnique({
        where: { orgId: store.orgId }
      });
      
      if (org?.supportEmail) {
        await sendBrandPromoRedemptionEmail({
          brandEmail: org.supportEmail,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            memberId: customer.memberId,
          },
          store: {
            storeName: store.storeName,
          },
          redeemedAt: new Date(),
        });
      }
    } catch (emailErr) {
      console.error('❌ Brand promo notification email failed:', emailErr);
      // Do not fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        memberId: customer.memberId
      },
      promo: store.promoOffer,
      store: store.storeName
    });
  } catch (err) {
    console.error('Error redeeming promo:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
