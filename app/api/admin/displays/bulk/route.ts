import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

type BulkAction = 'status' | 'organization' | 'reset';

export async function PATCH(req: NextRequest) {
  try {
    // Auth: super-admin only
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user || user.role !== 'super-admin') {
      return NextResponse.json({ error: 'Unauthorized - Super admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const displayIds: string[] = body?.displayIds || [];
    const action: BulkAction = body?.action;
    const rawValue: string | null = body?.value ?? null;

    if (!Array.isArray(displayIds) || displayIds.length === 0) {
      return NextResponse.json({ error: 'No displays selected' }, { status: 400 });
    }
    if (!action || !['status', 'organization', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Map UI value "available" -> DB status "inventory"
    const normalizeStatus = (v: string) => (v === 'available' ? 'inventory' : v);

    let data: any = {};
    if (action === 'status') {
      if (!rawValue) return NextResponse.json({ error: 'Missing status value' }, { status: 400 });
      const value = normalizeStatus(rawValue);
      if (!['inventory', 'sold', 'active', 'inactive'].includes(value)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      data.status = value;
      // On making inventory/sold, clear any store assignment + activation
      if (value === 'inventory' || value === 'sold') {
        data.storeId = null;
        data.activatedAt = null;
      }
    } else if (action === 'organization') {
      // Assign or unassign to an org
      if (!rawValue) return NextResponse.json({ error: 'Missing organization value' }, { status: 400 });
      if (rawValue === 'none') {
        data = {
          assignedOrgId: null,
          status: 'inventory',
          storeId: null,
          activatedAt: null,
        };
      } else {
        // Ensure org exists
        const org = await prisma.organization.findUnique({ where: { orgId: rawValue } });
        if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        data = {
          assignedOrgId: rawValue,
          status: 'sold', // Sold but not activated
          storeId: null,
          activatedAt: null,
        };
      }
    } else if (action === 'reset') {
      // Reset displays: keep assignedOrgId, clear store/activation, set to sold
      data = {
        storeId: null,
        activatedAt: null,
        status: 'sold',
      };
    }

    const result = await prisma.display.updateMany({
      where: { displayId: { in: displayIds } },
      data,
    });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Bulk update failed', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}
