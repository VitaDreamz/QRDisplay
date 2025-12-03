/**
 * CCPA Data Deletion API
 * 
 * Allows customers to request deletion of their personal data.
 * Flow:
 * 1. POST /api/privacy/data-deletion - Submit phone number, receive verification code
 * 2. POST /api/privacy/data-deletion/verify - Verify code and process deletion
 * 
 * Note: Uses in-memory storage for verification codes (valid for 15 minutes).
 * For serverless with multiple instances, consider Redis or DB table.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

// In-memory storage for verification codes
// Format: Map<requestId, { code, phone, expires, email? }>
interface VerificationData {
  code: string;
  phone: string;
  email?: string;
  expires: Date;
  ipAddress?: string;
}

// Global storage - will persist within the same serverless instance
declare global {
  // eslint-disable-next-line no-var
  var deletionVerificationCodes: Map<string, VerificationData> | undefined;
}

const verificationStore = globalThis.deletionVerificationCodes || new Map<string, VerificationData>();
if (!globalThis.deletionVerificationCodes) {
  globalThis.deletionVerificationCodes = verificationStore;
}

// Export for use in verify route
export { verificationStore };

// Clean up expired codes
function cleanupExpiredCodes() {
  const now = new Date();
  for (const [key, value] of verificationStore.entries()) {
    if (value.expires < now) {
      verificationStore.delete(key);
    }
  }
}

// POST: Initiate a data deletion request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    
    // Clean up expired codes
    cleanupExpiredCodes();

    // Check if there's already a pending verification for this phone
    for (const value of verificationStore.values()) {
      if (value.phone === normalizedPhone && value.expires > new Date()) {
        return NextResponse.json(
          { 
            error: 'A deletion request is already in progress. Please check your SMS for the verification code or wait 15 minutes.',
          },
          { status: 429 }
        );
      }
    }

    // Check if any customer records exist for this phone
    const customerCount = await prisma.customers.count({
      where: { phone: normalizedPhone },
    });

    if (customerCount === 0) {
      return NextResponse.json(
        { error: 'No records found for this phone number' },
        { status: 404 }
      );
    }

    // Generate verification code and request ID
    const verificationCode = generateVerificationCode();
    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the verification data
    verificationStore.set(requestId, {
      code: verificationCode,
      phone: normalizedPhone,
      email: email || undefined,
      expires: expiresAt,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    // Send verification SMS
    const smsSent = await sendSMS(
      normalizedPhone,
      `Your data deletion verification code is: ${verificationCode}. This code expires in 15 minutes. If you did not request this, please ignore.`
    );

    if (!smsSent) {
      verificationStore.delete(requestId);
      return NextResponse.json(
        { error: 'Failed to send verification SMS. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Verification code sent to your phone. Please verify within 15 minutes.',
    });

  } catch (error) {
    console.error('Data deletion request error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
