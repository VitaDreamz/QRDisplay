import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const short = await prisma.shortlink.findUnique({ where: { slug } });
    if (!short) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

    const created = (short as any).createdAt as Date;
    const expired = created ? Date.now() - created.getTime() > TTL_MS : true;
    const used = !!short.usedAt;

    let storeName: string | null = null;
    let sampleChoice: string | null = null;
    if (short.memberId) {
      const cust = await prisma.customer.findUnique({ where: { memberId: short.memberId } });
      if (cust) sampleChoice = cust.sampleChoice;
      if (cust?.storeId) {
        const store = await prisma.store.findUnique({ where: { storeId: cust.storeId } });
        storeName = store?.storeName || null;
      }
    }

    return NextResponse.json({
      ok: true,
      slug,
      role: short.role,
      action: short.action,
      requiresPin: short.requiresPin,
      expired,
      used,
      storeName,
      sampleChoice,
    });
  } catch (err) {
    console.error('Shortlink lookup error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
