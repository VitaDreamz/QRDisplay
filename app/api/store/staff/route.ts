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

    // Get store details
    const storeRecord = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true, storeId: true, storeName: true }
    });

    if (!storeRecord) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

  const storeInternalId = storeRecord.id;
  const storePublicId = storeRecord.storeId;
  const storeNameValue = storeRecord.storeName;

    const staff = await prisma.staff.findMany({
      where: { storeId: storeInternalId },
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
      select: { id: true, storeId: true, storeName: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

  const storeInternalId = store.id;
  const storePublicId = store.storeId;
  const storeNameValue = store.storeName;

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      type,
      // staffPin is now derived from phone (last 4)
      onCallDays,
      onCallHoursStart,
      onCallHoursStop,
      hireDate,
      status,
      notes
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !phone || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Derive staff PIN from last 4 of phone
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 4) {
      return NextResponse.json(
        { error: 'Phone must contain at least 4 digits to derive PIN' },
        { status: 400 }
      );
    }
    const derivedPin = digits.slice(-4);

    // Check if PIN is already in use by another staff member at this store
    const existingStaff = await prisma.staff.findFirst({
      where: {
        storeId: storeInternalId,
        staffPin: derivedPin,
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
      where: { storeId: storeInternalId }
    });

    const newStaffId = generateStaffId(staffCount);

    const staff = await prisma.staff.create({
      data: {
        staffId: newStaffId,
        storeId: storeInternalId,
        firstName,
        lastName,
        email,
        phone,
        type,
        staffPin: derivedPin,
        onCallDays: onCallDays || [],
        onCallHoursStart: onCallHoursStart || '09:00',
        onCallHoursStop: onCallHoursStop || '17:00',
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        status: status || 'active',
        notes
      }
    });

    // Send welcome notifications (best-effort)
    try {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  const loginUrl = `${baseUrl}/store/login/${storePublicId}`;

      // SMS via Twilio (if configured)
      if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const twilio = require('twilio');
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          const text = `Welcome to the team! Login: ${loginUrl} | Your Staff ID: ${newStaffId} | PIN: ${derivedPin}`;
          await client.messages.create({
            to: phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: text
          });
          console.log('✅ Staff welcome SMS sent to:', phone);
        } catch (smsErr) {
          console.warn('SMS send failed (staff welcome):', smsErr);
        }
      }

      // Email via Resend (if configured)
      if (email && process.env.RESEND_API_KEY) {
        try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: 'QRDisplay <noreply@qrdisplay.com>',
            to: email,
            subject: `Welcome to ${storeNameValue}!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #7c3aed;">Welcome to ${storeNameValue}</h1>
                <p>You're set up as a staff member.</p>
                <p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                <p><strong>Staff ID:</strong> <code>${newStaffId}</code><br/>
                   <strong>PIN:</strong> <code>${derivedPin}</code></p>
                <p style="color:#555; font-size: 12px;">Bookmark your login link. This link never expires.</p>
              </div>
            `
          });
          console.log('✅ Staff welcome email sent to:', email);
        } catch (mailErr) {
          console.warn('Email send failed (staff welcome):', mailErr);
        }
      }
    } catch (notifyErr) {
      console.warn('Welcome notifications skipped:', notifyErr);
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}
