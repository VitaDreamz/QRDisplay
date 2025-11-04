import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const storeId = (await cookies()).get('store-id')?.value;
  if (!storeId) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { availableSamples } = await req.json();

    // Validation
    if (!availableSamples || !Array.isArray(availableSamples)) {
      return NextResponse.json(
        { success: false, error: 'availableSamples must be an array' },
        { status: 400 }
      );
    }

    if (availableSamples.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one sample must be selected' },
        { status: 400 }
      );
    }

    // Update store
    const store = await prisma.store.update({
      where: { storeId },
      data: { availableSamples },
    });

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error('Error updating available samples:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update available samples' },
      { status: 500 }
    );
  }
}
