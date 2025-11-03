import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function daysSince(date: Date | string | null): number {
  if (!date) return 0;
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === '1';

    console.log('🔄 Running follow-up check...', dryRun ? '(dry run)' : '');

    // Get customers ready for follow-ups
    const customers = (await prisma.customer.findMany({
      where: {
        redeemed: true // Got their sample
      },
      include: {
        store: {
          select: {
            storeId: true,
            storeName: true,
            promoOffer: true,
            followupDays: true,   // Get store's schedule!
            timezone: true
          }
        }
      }
    })) as any[];

    console.log(`Found ${customers.length} customers to check`);

    let totalSent = 0;
    const sentByDay: { [key: string]: number } = {};

    let client: any = null;
    if (!dryRun) {
      const twilio = require('twilio');
      client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    process.env.APP_BASE_URL || 
                    'https://qrdisplay.com';

    for (const customer of customers) {
      // Skip customers who already used promo or don't have a promo slug
      const promoSlug = (customer as any).promoSlug as string | null;
      const promoRedeemed = Boolean((customer as any).promoRedeemed);
      if (!promoSlug || promoRedeemed) {
        continue;
      }

      const relevantDate = customer.redeemedAt || customer.requestedAt; // fallback
      const daysSinceEvent = daysSince(relevantDate as any);

      // Each store config controls schedule
  const followupDays: number[] = (customer.store?.followupDays as any) || [4, 12];
      const minDay = Math.min(...followupDays);
      const maxDay = Math.max(...followupDays);

      for (const followupDay of followupDays) {
        // Send if we're within the 24h window of that day
        if (daysSinceEvent >= followupDay && daysSinceEvent < followupDay + 1) {
          const templateKey = `DAY${followupDay}_FOLLOWUP`;

          // Prevent duplicates
          const alreadySent = await prisma.messageLog.findFirst({
            where: {
              toAddress: customer.phone,
              memberId: customer.memberId,
              templateKey: templateKey
            }
          });

          if (alreadySent) {
            console.log(`⏭️  Already sent Day ${followupDay} to ${customer.memberId}`);
            continue;
          }

          // Build message tone
          const isFirstFollowup = followupDay === minDay;
          const isLastFollowup = followupDay === maxDay;

          let message: string;
          if (isFirstFollowup) {
            message = `Hi ${customer.firstName}! Loved your ${customer.sampleChoice}?\n\nGet ${customer.store?.promoOffer} on your first purchase at ${customer.store?.storeName}!\n\nRedeem: ${baseUrl}/p/${customer.promoSlug}\n\nReply STOP to opt out.`;
          } else if (isLastFollowup) {
            message = `${customer.firstName}, still interested in better sleep?\n\nLast chance: ${customer.store?.promoOffer} at ${customer.store?.storeName}!\n\nRedeem: ${baseUrl}/p/${customer.promoSlug}\n\nReply STOP to opt out.`;
          } else {
            message = `Hi ${customer.firstName}! Reminder: Get ${customer.store?.promoOffer} at ${customer.store?.storeName}!\n\nRedeem: ${baseUrl}/p/${customer.promoSlug}\n\nReply STOP to opt out.`;
          }

          try {
            if (!dryRun) {
              await client.messages.create({
                to: customer.phone!,
                from: process.env.TWILIO_PHONE_NUMBER,
                body: message
              });

              await prisma.messageLog.create({
                data: {
                  type: 'sms',
                  templateKey,
                  toAddress: customer.phone!,
                  status: 'sent',
                  storeId: customer.storeId!,
                  memberId: customer.memberId!,
                  body: message
                }
              });
            }

            totalSent++;
            sentByDay[`day${followupDay}`] = (sentByDay[`day${followupDay}`] || 0) + 1;
            console.log(`✅ Day ${followupDay} ${dryRun ? '(dry)' : ''} sent to ${customer.firstName} ${customer.lastName} (${customer.memberId})`);
          } catch (smsError: any) {
            console.error(`❌ SMS failed for ${customer.memberId}:`, smsError);
            try {
              if (!dryRun) {
                await prisma.messageLog.create({
                  data: {
                    type: 'sms',
                    templateKey,
                    toAddress: customer.phone!,
                    status: 'failed',
                    sidOrReason: String(smsError),
                    storeId: customer.storeId!,
                    memberId: customer.memberId!
                  }
                });
              }
            } catch (logErr) {
              console.error('❌ Failed to log message failure:', logErr);
            }
          }
        }
      }
    }

    console.log(`✅ Follow-ups complete. Total ${dryRun ? 'matched' : 'sent'}: ${totalSent}`);
    console.log('Breakdown:', sentByDay);

    return NextResponse.json({
      success: true,
      dryRun,
      checked: customers.length,
      total: totalSent,
      sentByDay
    });
  } catch (error) {
    console.error('❌ Follow-up cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Production cron (example Vercel):
 * {
 *   "crons": [{
 *     "path": "/api/cron/followups",
 *     "schedule": "0 17 * * *"
 *   }]
 * }
 */
