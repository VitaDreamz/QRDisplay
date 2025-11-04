import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const organizationId = url.searchParams.get('organizationId');
    
    let where: any = {};
    
    if (organizationId) {
      // Get displays from this org, or available displays (no org assigned)
      where = {
        OR: [
          { assignedOrgId: organizationId },
          { assignedOrgId: null } // Available displays
        ]
      };
    }
    
    const displays = await prisma.display.findMany({
      where,
      include: {
        store: {
          select: {
            storeName: true,
            storeId: true
          }
        },
        organization: {
          select: {
            name: true
          }
        }
      },
      orderBy: { displayId: 'asc' }
    });
    
    return NextResponse.json({ displays });
  } catch (error: any) {
    console.error('Fetch displays error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch displays',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
