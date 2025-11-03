import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    
    // For now, get userId from body until Clerk is set up
    const userId = body.userId;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - userId required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user || user.role !== 'store-admin' || !user.storeId) {
      return NextResponse.json({ error: 'Access denied. Store admin only.' }, { status: 403 });
    }
    const { promoOffer, followupDays, contactEmail, contactPhone, contactName, staffPin } = body;

    const updateData: any = {};
    
    if (promoOffer !== undefined) updateData.promoOffer = String(promoOffer).trim();
    if (followupDays !== undefined && Array.isArray(followupDays)) {
      updateData.followupDays = followupDays.map(d => parseInt(d)).filter(d => d > 0);
    }
    if (contactEmail !== undefined) updateData.contactEmail = String(contactEmail).trim();
    if (contactPhone !== undefined) updateData.contactPhone = String(contactPhone).trim();
    if (contactName !== undefined) updateData.contactName = String(contactName).trim();
    if (staffPin !== undefined) {
      // Validate PIN is 4 digits
      if (!/^\d{4}$/.test(staffPin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
      }
      updateData.staffPin = String(staffPin);
    }

    const store = await prisma.store.update({
      where: { storeId: user.storeId },
      data: updateData
    });

    return NextResponse.json({ success: true, store });
  } catch (err) {
    console.error('Store settings update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
