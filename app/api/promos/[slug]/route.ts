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

    if (shortlink.action !== 'promo-redeem') {
      return NextResponse.json({ ok: false, error: 'Not a promo link' }, { status: 400 });
    }

    // Check if expired (72 hours)
    const now = new Date();
    const createdAt = new Date(shortlink.createdAt);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 72) {
      return NextResponse.json({ ok: false, expired: true }, { status: 400 });
    }

    // Check if already used
    if (shortlink.redeemed || shortlink.usedAt) {
      return NextResponse.json({ ok: false, used: true }, { status: 400 });
    }

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
        contactPhone: true,
      }
    });

    if (!store) {
      return NextResponse.json({ ok: false, error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      storeName: store.storeName,
      promoOffer: store.promoOffer,
      customerName: `${customer.firstName} ${customer.lastName}`,
      store: {
        storeName: store.storeName,
        streetAddress: store.streetAddress,
        city: store.city,
        state: store.state,
        zipCode: store.zipCode,
        contactPhone: store.contactPhone,
      }
    });
  } catch (err) {
    console.error('Error fetching promo:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
