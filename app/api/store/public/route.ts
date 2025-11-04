import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) {
      return NextResponse.json({ ok: false, error: 'storeId required' }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { storeId },
      select: {
        storeId: true,
        storeName: true,
        orgId: true,
      }
    });

    if (!store) {
      return NextResponse.json({ ok: false, error: 'Store not found' }, { status: 404 });
    }

    let organizationName: string | null = null;
    if (store.orgId) {
      const org = await prisma.organization.findUnique({
        where: { orgId: store.orgId },
        select: { name: true }
      });
      organizationName = org?.name || null;
    }

    return NextResponse.json({ ok: true, storeId: store.storeId, storeName: store.storeName, organizationName });
  } catch (err) {
    console.error('Public store info error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
