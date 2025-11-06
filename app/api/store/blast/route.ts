import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, audience, message } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - userId required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user || user.role !== 'store-admin' || !user.storeId) {
      return NextResponse.json({ error: 'Access denied. Store admin only.' }, { status: 403 });
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 160) {
      return NextResponse.json({ error: 'Message must be 160 characters or less' }, { status: 400 });
    }

    // Rate limit: Check last blast time
    const recentBlast = await prisma.messageLog.findFirst({
      where: {
        storeId: user.storeId,
        templateKey: 'STORE_BLAST',
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (recentBlast) {
      return NextResponse.json({ 
        error: 'Rate limit: Only one blast per hour allowed' 
      }, { status: 429 });
    }

    // Get customers based on audience filter
    const whereClause: any = {
      storeId: user.storeId
    };

    if (audience === 'redeemed') {
      whereClause.redeemed = true;
    } else if (audience === 'not-promo') {
      whereClause.redeemed = true;
      whereClause.promoRedeemed = false;
    }
    // 'all' = no additional filter

    const customers = await prisma.customer.findMany({
      where: whereClause
    });

    if (customers.length === 0) {
      return NextResponse.json({ error: 'No customers match the selected audience' }, { status: 400 });
    }

    // Send SMS to each customer
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    let sent = 0;
    let failed = 0;

    // Fetch all opted-out phone numbers
    const optOuts = await prisma.optOut.findMany({ select: { phone: true } });
    const optOutSet = new Set(optOuts.map(o => o.phone));

    for (const customer of customers) {
      // Skip if opted out
      if (optOutSet.has(customer.phone)) {
        continue;
      }
      try {
        await client.messages.create({
          to: customer.phone,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: message + ' Reply STOP to opt out.'
        });

        // Log successful send
        await prisma.messageLog.create({
          data: {
            type: 'sms',
            templateKey: 'STORE_BLAST',
            toAddress: customer.phone,
            status: 'sent',
            storeId: user.storeId,
            memberId: customer.memberId,
            body: message
          }
        });

        sent++;
      } catch (err) {
        console.error(`SMS failed for ${customer.phone}:`, err);
        
        // Log failure
        await prisma.messageLog.create({
          data: {
            type: 'sms',
            templateKey: 'STORE_BLAST',
            toAddress: customer.phone,
            status: 'failed',
            storeId: user.storeId,
            memberId: customer.memberId,
            body: message
          }
        });

        failed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent, 
      failed,
      total: customers.length 
    });
  } catch (err) {
    console.error('Blast SMS error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
