import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { storeId, loginType, pin, staffId } = await request.json();

    // Validate input
    if (!storeId || !loginType || !pin) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (loginType === 'staff' && !staffId) {
      return NextResponse.json(
        { error: 'Staff ID required for staff login' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    // Find the store
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: {
        id: true,
        storeId: true,
        storeName: true,
        staffPin: true
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // OWNER LOGIN
    if (loginType === 'owner') {
      // Verify owner PIN
      if (store.staffPin !== pin) {
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        );
      }

      // Create session
      const response = NextResponse.json({
        success: true,
        role: 'owner',
        storeId: store.storeId,
        storeName: store.storeName
      });

      const cookieStore = await cookies();
      
      // Set session cookies
      cookieStore.set('store-id', store.storeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      cookieStore.set('store-role', 'owner', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      return response;
    }

    // STAFF LOGIN
    if (loginType === 'staff') {
      // Find staff member
      const staffMember = await prisma.staff.findFirst({
        where: {
          staffId: staffId,
          storeId: store.id
        },
        select: {
          id: true,
          staffId: true,
          firstName: true,
          lastName: true,
          staffPin: true,
          status: true
        }
      });

      if (!staffMember) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        );
      }

      // Check if staff is active
      if (staffMember.status !== 'active') {
        return NextResponse.json(
          { error: 'Staff account is inactive. Contact your manager.' },
          { status: 403 }
        );
      }

      // Verify staff PIN
      if (staffMember.staffPin !== pin) {
        return NextResponse.json(
          { error: 'Invalid PIN' },
          { status: 401 }
        );
      }

      // Create session
      const response = NextResponse.json({
        success: true,
        role: 'staff',
        storeId: store.storeId,
        storeName: store.storeName,
        staffId: staffMember.staffId,
        staffName: `${staffMember.firstName} ${staffMember.lastName}`
      });

      const cookieStore = await cookies();

      // Set session cookies
      cookieStore.set('store-id', store.storeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      cookieStore.set('store-role', 'staff', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      cookieStore.set('staff-id', staffMember.staffId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      return response;
    }

    return NextResponse.json(
      { error: 'Invalid login type' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
