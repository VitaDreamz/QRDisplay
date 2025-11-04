import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper to generate staff ID
function generateStaffId(count: number): string {
  return `STF-${String(count + 1).padStart(3, '0')}`;
}

// GET all staff for a store
export async function GET(request: NextRequest) {
  try {
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

    const staff = await prisma.staff.findMany({
      where: { storeId: store.id },
      orderBy: [
        { samplesRedeemed: 'desc' },
        { salesGenerated: 'desc' }
      ]
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

// POST new staff member
export async function POST(request: NextRequest) {
  try {
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

    // Validate required fields
    if (!firstName || !lastName || !phone || !type || !staffPin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if PIN is already in use by another staff member at this store
    const existingStaff = await prisma.staff.findFirst({
      where: {
        storeId: store.id,
        staffPin,
        status: 'active'
      }
    });

    if (existingStaff) {
      return NextResponse.json(
        { error: 'PIN already in use by another staff member' },
        { status: 400 }
      );
    }

    // Get count for staffId generation
    const staffCount = await prisma.staff.count({
      where: { storeId: store.id }
    });

    const newStaffId = generateStaffId(staffCount);

    const staff = await prisma.staff.create({
      data: {
        staffId: newStaffId,
        storeId: store.id,
        firstName,
        lastName,
        email,
        phone,
        type,
        staffPin,
        onCallDays: onCallDays || [],
        onCallHoursStart: onCallHoursStart || '09:00',
        onCallHoursStop: onCallHoursStop || '17:00',
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        status: status || 'active',
        notes
      }
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}
