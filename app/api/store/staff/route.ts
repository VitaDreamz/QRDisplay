import prisma from '@/lib/prisma';
import crypto from 'crypto';
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
    const cookieStoreId = cookieStore.get('store-id')?.value;
    const headerStoreId = request.headers.get('x-store-id') || request.headers.get('X-Store-Id');
    const urlStoreId = new URL(request.url).searchParams.get('storeId');
    const storeId = (headerStoreId || urlStoreId || cookieStoreId || '').toUpperCase();

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

    // Calculate total sales $ for each staff member
    const staffWithSales = await Promise.all(
      staff.map(async (member) => {
        const sales = await prisma.purchaseIntent.aggregate({
          where: {
            fulfilledByStaffId: member.id,
            status: 'fulfilled'
          },
          _sum: {
            finalPrice: true
          }
        });

        return {
          ...member,
          totalSales: Number(sales._sum.finalPrice || 0)
        };
      })
    );

    return NextResponse.json(staffWithSales);
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
    const cookieStoreId = cookieStore.get('store-id')?.value;
    // Try to read header/body provided storeId for wizard context
    const headerStoreId = request.headers.get('x-store-id') || request.headers.get('X-Store-Id');
    
    // Parse body once and only once
    const body = await request.json();
    const bodyStoreId = body?.storeId;
    const storeId = (headerStoreId || bodyStoreId || cookieStoreId || '').toUpperCase();

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

    // Get count for staffId generation (globally unique)
    const staffCount = await prisma.staff.count();

    // Generate unique staffId with retry logic in case of collision
    let newStaffId = generateStaffId(staffCount);
    let retries = 0;
    while (retries < 10) {
      const existing = await prisma.staff.findUnique({ where: { staffId: newStaffId } });
      if (!existing) break;
      retries++;
      newStaffId = generateStaffId(staffCount + retries);
    }

    const verificationToken = crypto.randomBytes(16).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        verified: false,
        verificationToken,
        verificationExpiry,
        onCallDays: Array.isArray(onCallDays) ? onCallDays : (typeof onCallDays === 'string' && onCallDays.length ? onCallDays.split(',') : []),
        onCallHoursStart: onCallHoursStart || '09:00',
        onCallHoursStop: onCallHoursStop || '17:00',
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        status: 'pending',
        notes
      } as any
    });

    // Send welcome notifications (best-effort)
    try {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  const loginUrl = `${baseUrl}/store/login/${storePublicId}`;
  const verifyUrl = `${baseUrl}/staff/verify/${verificationToken}`;

      // SMS via Twilio (if configured)
      if (phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        try {
          const twilio = require('twilio');
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          const text = `Welcome to ${storeNameValue}!\n\nYou've been added as a staff member.\n\nVerify your account:\n${verifyUrl}\n\nYour PIN is the last 4 digits of your phone: ${derivedPin}\n\nYou'll use this PIN to login at: ${loginUrl}`;
          await client.messages.create({
            to: phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: text
          });
          console.log('✅ Staff verification SMS sent to:', phone);
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
            subject: `Verify your staff account for ${storeNameValue}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #7c3aed;">Welcome to ${storeNameValue}</h1>
                <p>You have been added as a staff member.</p>
                <p><strong>Step 1:</strong> Verify your account within 24 hours:<br/>
                  <a href="${verifyUrl}">${verifyUrl}</a>
                </p>
                <p><strong>Your PIN:</strong> <code>${derivedPin}</code> (last 4 of your phone)</p>
                <p><strong>Step 2:</strong> After verification, login anytime at:<br/>
                  <a href="${loginUrl}">${loginUrl}</a>
                </p>
                <p style="color:#555; font-size: 12px;">You'll use your Staff PIN to login.</p>
              </div>
            `
          });
          console.log('✅ Staff verification email sent to:', email);
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
