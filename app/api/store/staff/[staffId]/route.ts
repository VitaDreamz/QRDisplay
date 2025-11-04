import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET single staff member
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await context.params;
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store-id')?.value;

    if (!storeId) {
      return NextResponse.json(
        { error: 'No store session found' },
        { status: 401 }
      );
    }

    // Get store's internal ID
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const staff = await prisma.staff.findFirst({
      where: {
        staffId,
        storeId: store.id
      },
      include: {
        _count: {
          select: {
            customerRedemptions: true,
            promoRedemptions: true
          }
        }
      }
    });

    if (!staff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff member' },
      { status: 500 }
    );
  }
}

// PATCH update staff member
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await context.params;
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store-id')?.value;

    if (!storeId) {
      return NextResponse.json(
        { error: 'No store session found' },
        { status: 401 }
      );
    }

    // Get store's internal ID
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      type,
      staffPin,
      onCallDays,
      onCallHoursStart,
      onCallHoursStop,
      hireDate,
      status,
      notes
    } = body;

    // If updating PIN, check if it's already in use by another staff member
    if (staffPin) {
      const existingStaff = await prisma.staff.findFirst({
        where: {
          storeId: store.id,
          staffPin,
          staffId: { not: staffId },
          status: 'active'
        }
      });

      if (existingStaff) {
        return NextResponse.json(
          { error: 'PIN already in use by another staff member' },
          { status: 400 }
        );
      }
    }

    const staff = await prisma.staff.updateMany({
      where: {
        staffId,
        storeId: store.id
      },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(type !== undefined && { type }),
        ...(staffPin !== undefined && { staffPin }),
        ...(onCallDays !== undefined && { onCallDays }),
        ...(onCallHoursStart !== undefined && { onCallHoursStart }),
        ...(onCallHoursStop !== undefined && { onCallHoursStop }),
        ...(hireDate !== undefined && { hireDate: new Date(hireDate) }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes })
      }
    });

    if (staff.count === 0) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Fetch updated staff
    const updated = await prisma.staff.findFirst({
      where: { staffId, storeId: store.id }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
}

// DELETE staff member
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await context.params;
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store-id')?.value;

    if (!storeId) {
      return NextResponse.json(
        { error: 'No store session found' },
        { status: 401 }
      );
    }

    // Get store's internal ID
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    await prisma.staff.deleteMany({
      where: {
        staffId,
        storeId: store.id
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff member' },
      { status: 500 }
    );
  }
}
