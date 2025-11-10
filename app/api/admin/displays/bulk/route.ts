import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

type BulkAction = 'status' | 'organization' | 'reset' | 'delete';

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
    if (!action || !['status', 'organization', 'reset', 'delete'].includes(action)) {
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
      
      // ONLY update status-related fields based on specific status value
      if (value === 'inventory') {
        // Available = not sold to anyone (full reset to inventory)
        data = {
          status: 'inventory',
          storeId: null,
          assignedOrgId: null,
          activatedAt: null
        };
      } else if (value === 'sold') {
        // Sold = assigned to org but not activated
        // ONLY clear store/activation, keep organization assignment!
        data = {
          status: 'sold',
          storeId: null,
          activatedAt: null
          // assignedOrgId: UNCHANGED - don't touch it!
        };
      } else if (value === 'active') {
        // Just mark as active, don't change anything else
        data = {
          status: 'active'
        };
      } else if (value === 'inactive') {
        // Just mark as inactive, don't change anything else
        data = {
          status: 'inactive'
        };
      }
      
    } else if (action === 'organization') {
      // ONLY update organization field
      if (!rawValue) return NextResponse.json({ error: 'Missing organization value' }, { status: 400 });
      if (rawValue === 'none') {
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
        status: 'sold'
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
