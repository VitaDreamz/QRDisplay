import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// PATCH update store contact info
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const storeId = cookieStore.get('storeId')?.value;

    if (!storeId) {
      return NextResponse.json(
        { error: 'No store session found' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      ownerName,
      ownerPhone,
      ownerEmail,
      purchasingManager,
      purchasingPhone,
      purchasingEmail
    } = body;

    const store = await prisma.store.update({
      where: { storeId },
      data: {
        ...(ownerName !== undefined && { ownerName }),
        ...(ownerPhone !== undefined && { ownerPhone }),
        ...(ownerEmail !== undefined && { ownerEmail }),
        ...(purchasingManager !== undefined && { purchasingManager }),
        ...(purchasingPhone !== undefined && { purchasingPhone }),
        ...(purchasingEmail !== undefined && { purchasingEmail })
      }
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error updating contact info:', error);
    return NextResponse.json(
      { error: 'Failed to update contact info' },
      { status: 500 }
    );
  }
}
