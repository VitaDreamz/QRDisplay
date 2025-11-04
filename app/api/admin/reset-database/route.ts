import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  // Check admin authentication
  const cookieStore = await cookies();
  const userId = cookieStore.get('user-id')?.value;
  
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Verify user is admin
  const user = await prisma.user.findUnique({
    where: { userId: userId }
  });

  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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
