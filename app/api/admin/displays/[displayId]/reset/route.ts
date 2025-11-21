import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await params;

    const display = await prisma.display.findUnique({
      where: { displayId },
      include: { store: true }
    });

    if (!display) {
      return NextResponse.json(
        { error: 'Display not found' },
        { status: 404 }
      );
    }

    if (!display.storeId) {
      return NextResponse.json(
        { error: 'Display is not activated' },
        { status: 400 }
      );
    }

    // Reset activation but keep organization assignment
    await prisma.display.update({
      where: { displayId },
      data: {
        storeId: null,
        status: 'inventory',
        activatedAt: null,
        // assignedOrgId stays unchanged
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Display reset successfully'
    });
  } catch (error) {
    console.error('Display reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
