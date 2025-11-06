import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { verifySlug, staffPin } = await request.json();

    if (!verifySlug || !staffPin) {
      return NextResponse.json({ error: 'verifySlug and staffPin are required' }, { status: 400 });
    }

    const intent = await prisma.purchaseIntent.findUnique({ where: { verifySlug } });

    if (!intent) {
      return NextResponse.json({ error: 'Purchase intent not found' }, { status: 404 });
    }

    if (intent.status === 'fulfilled') {
      return NextResponse.json({ ok: true, message: 'Already fulfilled' });
    }

    // Validate staff PIN for the store
    const staff = await prisma.staff.findFirst({
      where: {
        storeId: intent.storeId,
        staffPin
      }
    });

    if (!staff) {
      return NextResponse.json({ error: 'Invalid staff PIN' }, { status: 400 });
    }

    const updated = await prisma.purchaseIntent.update({
      where: { id: intent.id },
      data: {
        status: 'fulfilled',
        fulfilledAt: new Date(),
        // Use newly added relation if available in schema; if not present in generated client yet, drop this field
        fulfilledByStaffId: staff.id as any
      } as any
    });

    // Increment staff sales counter (for leaderboard)
    try {
      await prisma.staff.update({
        where: { id: staff.id },
        data: { salesGenerated: { increment: 1 } }
      });
    } catch (e) {
      console.warn('Failed to increment staff salesGenerated:', e);
    }

    return NextResponse.json({ ok: true, intent: updated, staff: { id: staff.id, name: `${staff.firstName} ${staff.lastName}` } });
  } catch (error) {
    console.error('[Purchase Intent Redeem API] POST error:', error);
    return NextResponse.json({ error: 'Failed to redeem purchase intent' }, { status: 500 });
  }
}
