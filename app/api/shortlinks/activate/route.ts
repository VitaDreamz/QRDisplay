import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    // If PIN required, validate
    if (short.requiresPin) {
      const pinRegex = /^\d{4}$/;
      if (!pin || !pinRegex.test(pin)) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
      }
      if (!store.staffPin || store.staffPin !== pin) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
      }
    }

    // Mark customer redeemed
    const updated = await prisma.customer.update({
      where: { memberId: customer.memberId },
      data: { redeemed: true, redeemedAt: new Date() },
    });

    // Mark shortlink used (and redeemed flags for audit)
    await prisma.shortlink.update({
      where: { slug },
      data: { usedAt: new Date(), redeemed: true, redeemedAt: new Date() },
    });

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
