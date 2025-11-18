/**
 * Cron Job: Wholesale Delivery Reminders
 * Runs every 24 hours to remind stores about unverified wholesale deliveries
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/wholesale-delivery-reminders",
 *     "schedule": "0 10 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { isStaffOnCall } from '@/lib/staff-notifications';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Running wholesale delivery reminders cron job...');

    // Find delivered orders that haven't been verified
    const unverifiedOrders = await prisma.wholesaleOrder.findMany({
      where: {
        status: 'delivered',
        receivedAt: null, // Not yet verified/received
        deliveredAt: {
          lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Delivered at least 24h ago
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
        items: {
          include: {
            product: true,
          },
        },
        store: {
          select: {
            id: true,
            storeId: true,
            storeName: true,
            adminPhone: true,
            ownerPhone: true,
            purchasingPhone: true,
            timezone: true,
          },
        },
      },
    });

    console.log(`📦 Found ${unverifiedOrders.length} unverified deliveries`);

    let remindersSent = 0;

    for (const order of unverifiedOrders) {
      try {
        const notifications: Array<{ phone: string; role: string }> = [];

        // Get all active staff for this store
        const staff = await prisma.staff.findMany({
          where: {
            storeId: order.store.id,
            status: 'active',
          },
          select: {
            phone: true,
            type: true,
            onCallDays: true,
            onCallHoursStart: true,
            onCallHoursStop: true,
          },
        });

        // Add admin staff
        const adminStaff = staff.filter(s => s.type === 'admin');
        adminStaff.forEach(s => {
          if (s.phone) notifications.push({ phone: s.phone, role: 'Admin' });
        });

        // Add owner
        const ownerPhone = order.store.adminPhone || order.store.ownerPhone;
        if (ownerPhone) notifications.push({ phone: ownerPhone, role: 'Owner' });

        // Add purchasing contact
        if (order.store.purchasingPhone) {
          notifications.push({ phone: order.store.purchasingPhone, role: 'Purchasing' });
        }

        // Add on-call staff
        const onCallStaff = staff.filter(s =>
          s.type !== 'admin' && isStaffOnCall(s, order.store.timezone || 'America/Los_Angeles')
        );
        onCallStaff.forEach(s => {
          if (s.phone) notifications.push({ phone: s.phone, role: 'On-Call Staff' });
        });

        // Remove duplicates
        const uniqueNotifications = Array.from(
          new Map(notifications.map(n => [n.phone, n])).values()
        );

        if (uniqueNotifications.length > 0) {
          const itemCount = order.items.reduce((sum, item) => sum + (item.retailUnits || 0), 0);
          const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/store/wholesale/verify/${order.verificationToken}`;

          const message = `⏰ REMINDER: Wholesale order #${order.orderId} still needs verification!

Expected: ${itemCount} units across ${order.items.length} products.

Please verify receipt: ${verificationUrl}

-QRDisplay`;

          // Send to all recipients
          for (const recipient of uniqueNotifications) {
            try {
              await sendSMS(recipient.phone, message);
              console.log(`✅ Sent reminder to ${recipient.role} (${recipient.phone}) for order ${order.orderId}`);
            } catch (smsError) {
              console.error(`❌ Failed to send SMS to ${recipient.phone}:`, smsError);
            }
          }

          remindersSent++;

          // Update lastReminderSentAt
          await prisma.wholesaleOrder.update({
            where: { id: order.id },
            data: { lastReminderSentAt: new Date() },
          });
        }
      } catch (orderError) {
        console.error(`❌ Error processing order ${order.orderId}:`, orderError);
        // Continue with other orders
      }
    }

    console.log(`✅ Sent ${remindersSent} wholesale delivery reminders`);

    return NextResponse.json({
      success: true,
      ordersFound: unverifiedOrders.length,
      remindersSent,
    });
  } catch (error) {
    console.error('❌ Wholesale delivery reminders cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
