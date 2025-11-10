import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ displayId: string }> }
) {
  try {
    const { displayId } = await params;

    if (!displayId) {
      return NextResponse.json({ error: 'Missing displayId' }, { status: 400 });
    }

    const body = await req.json();
    const { status, assignedOrgId } = body || {};

    // Validate allowed status values (keep flexible for now but restrict to known)
    const allowedStatuses = ['inventory', 'sold', 'active', 'inactive'];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // If assignedOrgId provided, verify it exists and get the CUID
    let orgCuid: string | null = null;
    if (assignedOrgId) {
      const org = await prisma.organization.findUnique({ where: { orgId: assignedOrgId } });
      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 400 });
      }
      orgCuid = org.id; // Use CUID, not orgId string
    }

    // Ensure display exists
    const existing = await prisma.display.findUnique({ where: { displayId } });
    if (!existing) {
      return NextResponse.json({ error: 'Display not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof status === 'string') updateData.status = status;
    if (typeof assignedOrgId === 'string') updateData.assignedOrgId = orgCuid; // Use CUID
    if (assignedOrgId === null) updateData.assignedOrgId = null; // Allow clearing

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.display.update({
      where: { displayId },
      data: updateData,
      include: {
        organization: true,
        store: true,
      },
    });

    return NextResponse.json({ success: true, display: updated });
  } catch (err) {
    console.error('Display PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
