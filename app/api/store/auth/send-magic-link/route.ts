import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Helper to normalize phone for comparison
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+${cleaned}`;
  }
  return phone;
}

export async function POST(req: NextRequest) {
  try {
    const { storeId, contact } = await req.json();

    if (!storeId || !contact) {
      return NextResponse.json(
        { error: 'Store ID and contact information required' },
        { status: 400 }
      );
    }

    // Find store by ID
    const store = await prisma.store.findUnique({
      where: { storeId: storeId.toUpperCase() }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Verify contact matches store records
    const contactLower = contact.toLowerCase().trim();
    const normalizedContact = normalizePhone(contact);
    
    const emailMatch = store.contactEmail?.toLowerCase() === contactLower;
    const phoneMatch = store.contactPhone === normalizedContact || 
                       store.contactPhone === contact.replace(/\D/g, '');

    if (!emailMatch && !phoneMatch) {
      return NextResponse.json(
        { error: 'Contact information does not match store records' },
        { status: 403 }
      );
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store token in database
    await prisma.magicLink.create({
      data: {
        token,
        storeId: store.storeId,
        expiresAt,
        used: false
      }
    });

    const magicUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/store/auth/verify?token=${token}`;

    // Send email if email was verified
    if (emailMatch && store.contactEmail) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'QRDisplay <noreply@qrdisplay.com>',
          to: store.contactEmail,
          subject: 'Your Store Dashboard Login Link',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #7c3aed;">Store Dashboard Access</h1>
              <p>Hi ${store.contactName || 'there'},</p>
              <p>Click the button below to access your ${store.storeName} dashboard:</p>
              <div style="margin: 30px 0;">
                <a href="${magicUrl}" 
                   style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Access Dashboard
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 15 minutes.<br>
                If you didn't request this, please ignore this email.
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Or copy this link: ${magicUrl}
              </p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
        // Don't fail if email fails, SMS might still work
      }
    }

    // Send SMS if phone was verified
    if (phoneMatch && store.contactPhone) {
      try {
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        await client.messages.create({
          to: store.contactPhone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: `Your ${store.storeName} dashboard login link:\n\n${magicUrl}\n\nExpires in 15 minutes.`
        });
      } catch (smsErr) {
        console.error('SMS send failed:', smsErr);
        // Don't fail if SMS fails, email might have worked
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to your email and phone'
    });
  } catch (err) {
    console.error('Magic link error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
