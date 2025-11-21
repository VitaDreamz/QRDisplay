import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnershipId } = await params;
    const cookieStore = await cookies();
    const storeIdCookie = cookieStore.get('store-id')?.value;

    if (!storeIdCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { availableSamples, availableProducts } = body;

    // Verify the partnership belongs to this store
    const partnership = await prisma.storeBrandPartnership.findUnique({
      where: { id: partnershipId },
      include: {
        store: true
      }
    });

    if (!partnership) {
      return NextResponse.json({ error: 'Partnership not found' }, { status: 404 });
    }

    // Check if partnership belongs to authenticated store
    if (partnership.store.id !== storeIdCookie) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update the partnership
    const updateData: any = {};
    if (availableSamples !== undefined && Array.isArray(availableSamples)) {
      updateData.availableSamples = availableSamples;
    }
    if (availableProducts !== undefined && Array.isArray(availableProducts)) {
      updateData.availableProducts = availableProducts;
    }

    const updated = await prisma.storeBrandPartnership.update({
      where: { id: partnershipId },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating partnership:', error);
    return NextResponse.json(
      { error: 'Failed to update partnership' },
      { status: 500 }
    );
  }
}
