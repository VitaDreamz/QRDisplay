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

    // Validate staff PIN OR store admin PIN
    const staff = await prisma.staff.findFirst({
      where: {
        storeId: intent.storeId,
        staffPin
      }
    });

    let isStoreAdmin = false;

    // If no staff found, check if it's the store admin's PIN
    if (!staff) {
      const store = await prisma.store.findUnique({
        where: { id: intent.storeId },
        select: { staffPin: true, storeName: true }
      });

      if (!store || store.staffPin !== staffPin) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
      }

      // Store admin PIN is valid
      isStoreAdmin = true;
    }

    const updated = await prisma.purchaseIntent.update({
      where: { id: intent.id },
      data: {
        status: 'fulfilled',
        fulfilledAt: new Date(),
        // Only set staff ID if it's actual staff (not store admin)
        ...(staff ? { fulfilledByStaffId: staff.id as any } : {})
      } as any
    });

    // Increment staff sales counter (for leaderboard) - only if it's a staff member
    if (staff) {
      try {
        await prisma.staff.update({
          where: { id: staff.id },
          data: { salesGenerated: { increment: 1 } }
        });
      } catch (e) {
        console.warn('Failed to increment staff salesGenerated:', e);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      intent: updated, 
      staff: staff ? { id: staff.id, name: `${staff.firstName} ${staff.lastName}` } : { isStoreAdmin: true }
    });
  } catch (error) {
    console.error('[Purchase Intent Redeem API] POST error:', error);
    return NextResponse.json({ error: 'Failed to redeem purchase intent' }, { status: 500 });
  }
}
