import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Return basic display info used by the setup wizard
// - storeId (if activated)
// - status (inventory | sold | active | ...)
// - organization (optional minimal info)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  const { displayId } = await params;

  if (!displayId) {
    return NextResponse.json({ error: 'displayId required' }, { status: 400 });
  }

  try {
    const display = await prisma.display.findUnique({
      where: { displayId },
      select: {
        displayId: true,
        status: true,
        storeId: true,
        assignedOrgId: true,
      },
    });

    if (!display) {
      return NextResponse.json({ error: 'Display not found' }, { status: 404 });
    }

    return NextResponse.json({
      displayId: display.displayId,
      status: display.status,
      storeId: display.storeId || null,
      orgId: display.assignedOrgId || null,
    });
  } catch (err) {
    console.error('GET /api/displays/[displayId] failed:', err);
    return NextResponse.json({ error: 'Failed to fetch display' }, { status: 500 });
  }
}
