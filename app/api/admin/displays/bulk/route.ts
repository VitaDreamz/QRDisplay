import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type BulkAction = 'status' | 'organization' | 'reset' | 'delete';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const displayIds: string[] = body?.displayIds || [];
    const action: BulkAction = body?.action;
    const rawValue: string | null = body?.value ?? null;

    if (!Array.isArray(displayIds) || displayIds.length === 0) {
      return NextResponse.json({ error: 'No displays selected' }, { status: 400 });
    }
    if (!action || !['status', 'organization', 'reset', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let data: any = {};

    if (action === 'status') {
      // Simple status update (sold/active/inventory)
      if (!rawValue) {
        return NextResponse.json({ error: 'Status value required' }, { status: 400 });
      }
      data = { status: rawValue };

    } else if (action === 'organization') {
      if (rawValue === '' || rawValue === null || rawValue === 'unassign') {
        // Unassigning = make available (clear everything)
        data = {
          assignedOrgId: null,
          status: 'inventory',
          storeId: null,
          activatedAt: null
        };
      } else {
        // Ensure org exists
        const org = await prisma.organization.findUnique({ where: { orgId: rawValue } });
        if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        
        // Assigning to org = ONLY change org, preserve current state!
        data = {
          assignedOrgId: org.id // Use CUID, not orgId string
          // Don't touch: status, storeId, activatedAt
          // Let display keep its current activation state
        };
      }
      
    } else if (action === 'reset') {
      // Reset = clear store/activation but KEEP organization assignment
      data = {
        storeId: null,
        activatedAt: null,
        status: 'inventory'
        // assignedOrgId: UNCHANGED - display stays assigned to org
      };
    } else if (action === 'delete') {
      // Delete = permanently remove displays from database
      const result = await prisma.display.deleteMany({
        where: { displayId: { in: displayIds } },
      });

      return NextResponse.json({ 
        success: true, 
        deleted: result.count,
        message: `Successfully deleted ${result.count} display${result.count !== 1 ? 's' : ''}`
      });
    }

    const result = await prisma.display.updateMany({
      where: { displayId: { in: displayIds } },
      data,
    });

    return NextResponse.json({ 
      success: true, 
      updated: result.count,
      message: `Successfully updated ${result.count} display${result.count !== 1 ? 's' : ''}`
    });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: 'Bulk update failed', details: error?.message || 'Unknown error' }, { status: 500 });
  }
}
