import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await context.params;
    const cookieStore = await cookies();
    const storePublicId = cookieStore.get('store-id')?.value;

    if (!storePublicId) {
      return NextResponse.json({ error: 'No store session found' }, { status: 401 });
    }

    const store = await prisma.store.findUnique({
      where: { storeId: storePublicId },
      select: { id: true, storeId: true, storeName: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const staff = await prisma.staff.findFirst({
      where: { staffId, storeId: store.id },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    if (staff.verified) {
      return NextResponse.json({ ok: true, message: 'Already verified' });
    }

    const verificationToken = crypto.randomBytes(16).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        verificationToken,
        verificationExpiry,
        status: 'pending'
      }
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const verifyUrl = `${baseUrl}/staff/verify/${verificationToken}`;
    const loginUrl = `${baseUrl}/store/login/${store.storeId}`;

    // SMS via Twilio (if configured)
    if (staff.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        const text = `Welcome back to ${store.storeName}!\n\nVerify your account:\n${verifyUrl}\n\nYour PIN is the last 4 digits of your phone: ${staff.staffPin}\n\nLogin after verification: ${loginUrl}`;
        await client.messages.create({
          to: staff.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: text
        });
      } catch (smsErr) {
        console.warn('Resend verification SMS failed:', smsErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Failed to resend verification' }, { status: 500 });
  }
}
