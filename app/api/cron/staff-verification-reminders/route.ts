/**
 * Cron Job: Staff Verification Reminders
 * Runs every 24 hours to remind unverified staff to complete their account verification
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/staff-verification-reminders",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Running staff verification reminders cron job...');

    // Find unverified staff created at least 24h ago
    const unverifiedStaff = await prisma.staff.findMany({
      where: {
        verified: false,
        status: {
          in: ['active', 'pending'], // Don't remind inactive staff
        },
        verificationToken: {
          not: null, // Has a verification token
        },
        verificationExpiry: {
          gte: new Date(), // Token hasn't expired
        },
        createdAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Created at least 24h ago
        },
        OR: [
          { lastReminderSentAt: null }, // Never sent reminder
          {
            lastReminderSentAt: {
              lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last reminder >24h ago
            },
          },
        ],
      },
      include: {
        store: {
          select: {
            storeName: true,
            storeId: true,
          },
        },
      },
    });

    console.log(`👥 Found ${unverifiedStaff.length} unverified staff members`);

    let remindersSent = 0;

    for (const staff of unverifiedStaff) {
      try {
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/staff/verify/${staff.verificationToken}`;

        const message = `⏰ REMINDER: Please verify your QRDisplay staff account for ${staff.store.storeName}!

Complete your verification: ${verificationUrl}

This link expires soon. If you need a new link, contact your store manager.

-QRDisplay`;

        await sendSMS(staff.phone, message);
        console.log(`✅ Sent verification reminder to ${staff.firstName} ${staff.lastName} (${staff.phone})`);

        // Update lastReminderSentAt
        await prisma.staff.update({
          where: { id: staff.id },
          data: { lastReminderSentAt: new Date() },
        });

        remindersSent++;
      } catch (staffError) {
        console.error(`❌ Error sending reminder to ${staff.staffId}:`, staffError);
        // Continue with other staff
      }
    }

    console.log(`✅ Sent ${remindersSent} staff verification reminders`);

    return NextResponse.json({
      success: true,
      staffFound: unverifiedStaff.length,
      remindersSent,
    });
  } catch (error) {
    console.error('❌ Staff verification reminders cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
