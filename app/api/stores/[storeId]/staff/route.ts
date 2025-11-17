import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    // Get store with staff
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: {
        staff: {
          where: { status: 'active' },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            type: true,
            status: true,
            onCallDays: true,
            onCallHoursStart: true,
            onCallHoursStop: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ staff: store.staff });
  } catch (error) {
    console.error('Store staff API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store staff' },
      { status: 500 }
    );
  }
}
