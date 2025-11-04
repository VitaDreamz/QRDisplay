import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  const { displayId } = await params;

  try {
    // Get display with organization info
    const display = (await prisma.display.findUnique({
      where: { displayId },
      include: {
        organization: true,
        store: true,
      },
    })) as any;

    if (!display || !display.organization) {
      return NextResponse.json(
        { error: 'Display not found or not assigned to an organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: display.organization.name,
      logoUrl: display.organization.logoUrl,
      supportEmail: display.organization.supportEmail || 'support@qrdisplay.com',
      supportPhone: display.organization.supportPhone,
      storeName: display.store?.storeName || null,
      availableSamples: display.store?.availableSamples || [],
    });
  } catch (error) {
    console.error('Error fetching brand info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand information' },
      { status: 500 }
    );
  }
}
