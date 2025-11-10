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

    console.log('🔄 Running retention check...', dryRun ? '(dry run)' : '');

    // Get customers who have made a purchase (converted from sample)
    const customers = (await prisma.customer.findMany({
      where: {
        currentStage: {
          in: ['purchased', 'repeat'] // Customers who bought at least once
        }
      },
      include: {
        store: {
          select: {
            storeId: true,
            storeName: true,
            returningCustomerPromo: true,
            postPurchaseFollowupDays: true,
            timezone: true
          }
        }
      }
    })) as any[];

    console.log(`Found ${customers.length} customers to check for retention`);

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
      // Use the most recent purchase date or stage change date
      const relevantDate = customer.stageChangedAt || customer.requestedAt;
      const daysSincePurchase = daysSince(relevantDate as any);

      // Each store config controls retention schedule (default: 45, 90 days)
      const retentionDays: number[] = (customer.store?.postPurchaseFollowupDays as any) || [45, 90];
      const minDay = Math.min(...retentionDays);
      const maxDay = Math.max(...retentionDays);

      for (const retentionDay of retentionDays) {
        // Send if we're within the 24h window of that day
        if (daysSincePurchase >= retentionDay && daysSincePurchase < retentionDay + 1) {
          const templateKey = `DAY${retentionDay}_RETENTION`;

          // Prevent duplicates
          const alreadySent = await prisma.messageLog.findFirst({
            where: {
              toAddress: customer.phone,
              memberId: customer.memberId,
              templateKey: templateKey
            }
          });

          if (alreadySent) {
            console.log(`⏭️  Already sent Day ${retentionDay} retention to ${customer.memberId}`);
            continue;
          }

          // Build message tone based on timing
          const isFirstRetention = retentionDay === minDay;
          const isLastRetention = retentionDay === maxDay;
          const returningPromo = customer.store?.returningCustomerPromo || '10% Off In-Store Purchase';
          const promoLink = customer.returningPromoSlug ? `${baseUrl}/p/${customer.returningPromoSlug}` : null;

          let message: string;
          if (isFirstRetention) {
            message = promoLink
              ? `Hi ${customer.firstName}! Hope you're enjoying your ${customer.sampleChoice}! ${customer.store?.storeName} is offering ${returningPromo} for returning customers. Redeem at ${promoLink} anytime! Reply STOP to opt out.`
              : `Hi ${customer.firstName}! Hope you're enjoying your ${customer.sampleChoice}! ${customer.store?.storeName} is offering ${returningPromo} for returning customers. Come back anytime! Reply STOP to opt out.`;
          } else if (isLastRetention) {
            message = promoLink
              ? `${customer.firstName}, we miss you at ${customer.store?.storeName}! Still offering ${returningPromo} on your next purchase. Redeem at ${promoLink} today! Reply STOP to opt out.`
              : `${customer.firstName}, we miss you at ${customer.store?.storeName}! Still offering ${returningPromo} on your next purchase. Stop by soon! Reply STOP to opt out.`;
          } else {
            message = promoLink
              ? `Hi ${customer.firstName}! Reminder: ${customer.store?.storeName} offers ${returningPromo} for returning customers like you. Redeem at ${promoLink} before it expires! Reply STOP to opt out.`
              : `Hi ${customer.firstName}! Reminder: ${customer.store?.storeName} offers ${returningPromo} for returning customers like you! Reply STOP to opt out.`;
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
            sentByDay[`day${retentionDay}`] = (sentByDay[`day${retentionDay}`] || 0) + 1;
            console.log(`✅ Day ${retentionDay} retention ${dryRun ? '(dry)' : ''} sent to ${customer.firstName} ${customer.lastName} (${customer.memberId})`);
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

    console.log(`✅ Retention check complete. Total ${dryRun ? 'matched' : 'sent'}: ${totalSent}`);
    console.log('Breakdown:', sentByDay);

    return NextResponse.json({
      success: true,
      dryRun,
      checked: customers.length,
      total: totalSent,
      sentByDay
    });
  } catch (error) {
    console.error('❌ Retention cron error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Production cron (example Vercel):
 * {
 *   "crons": [{
 *     "path": "/api/cron/retention",
 *     "schedule": "0 17 * * *"
 *   }]
 * }
 */
