import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const storeIdCookie = cookieStore.get('store-id')?.value;
    const role = cookieStore.get('store-role')?.value;

    if (!storeIdCookie) {
      return NextResponse.json({ error: 'No store session found' }, { status: 401 });
    }

    if (role !== 'owner') {
      return NextResponse.json({ error: 'Access denied. Store owner only.' }, { status: 403 });
    }

    // Get store's internal ID
    const store = await prisma.store.findUnique({
      where: { storeId: storeIdCookie },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const body = await req.json();
    const { 
      promoOffer, 
      followupDays, 
      contactEmail, 
      contactPhone, 
      contactName, 
      staffPin,
      ownerName,
      ownerPhone,
      ownerEmail,
      purchasingManager,
      purchasingPhone,
      purchasingEmail
    } = body;

    const updateData: any = {};
    
    if (promoOffer !== undefined) updateData.promoOffer = String(promoOffer).trim();
    if (followupDays !== undefined && Array.isArray(followupDays)) {
      updateData.followupDays = followupDays.map(d => parseInt(d)).filter(d => d > 0);
    }
    if (contactEmail !== undefined) updateData.contactEmail = String(contactEmail).trim();
    if (contactPhone !== undefined) updateData.contactPhone = String(contactPhone).trim();
    if (contactName !== undefined) updateData.contactName = String(contactName).trim();
    if (ownerName !== undefined) updateData.ownerName = String(ownerName).trim();
    if (ownerPhone !== undefined) updateData.ownerPhone = String(ownerPhone).trim();
    if (ownerEmail !== undefined) updateData.ownerEmail = String(ownerEmail).trim();
    if (purchasingManager !== undefined) updateData.purchasingManager = String(purchasingManager).trim();
    if (purchasingPhone !== undefined) updateData.purchasingPhone = String(purchasingPhone).trim();
    if (purchasingEmail !== undefined) updateData.purchasingEmail = String(purchasingEmail).trim();
    if (staffPin !== undefined) {
      // Validate PIN is 4 digits
      if (!/^\d{4}$/.test(staffPin)) {
        return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
      }
      updateData.staffPin = String(staffPin);
    }

    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: updateData
    });

    return NextResponse.json({ success: true, store: updatedStore });
  } catch (err) {
    console.error('Store settings update error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
