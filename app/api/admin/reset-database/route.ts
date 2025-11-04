import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  // Check Clerk authentication
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Verify user is admin (check if user exists in database with admin role)
  const user = await prisma.user.findUnique({
    where: { userId: userId }
  });

  if (!user || user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Unauthorized - Super admin access required' }, { status: 403 });
  }

  try {
    // Step 1: Delete all customers
    const deletedCustomers = await prisma.customer.deleteMany({});
    
    // Step 2: Delete all staff members
    const deletedStaff = await prisma.staff.deleteMany({});
    
    // Step 3: Delete all stores
    const deletedStores = await prisma.store.deleteMany({});
    
    // Step 4: Get VitaDreamz organization
    const vitadreamz = await prisma.organization.findUnique({
      where: { slug: 'vitadreamz' }
    });

    // Step 5: Reset all displays
    if (vitadreamz) {
      await prisma.display.updateMany({
        data: {
          status: 'sold',
          storeId: null,
          activatedAt: null,
          assignedOrgId: null,
          ownerOrgId: vitadreamz.id,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully',
      stats: {
        customersDeleted: deletedCustomers.count,
        staffDeleted: deletedStaff.count,
        storesDeleted: deletedStores.count
      }
    });

  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}
