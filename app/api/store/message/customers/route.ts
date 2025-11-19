import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store-id')?.value;
    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { audience = 'all', message = '', channel = 'sms', customerId, templateUsed = null } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ 
      where: { storeId },
      select: {
        id: true,
        storeId: true,
        storeName: true,
        messageCreditBalance: true,
        lastMessageBlastAt: true,
      }
    });
    
    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    let customers;
    
    // Handle specific customer message (direct message - no credits, no rate limit)
    if (audience === 'specific' && customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, storeId: store.storeId },
        select: { phone: true, smsOptedOut: true }
      });
      if (!customer) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }
      if (customer.smsOptedOut) {
        return NextResponse.json({ success: false, error: 'Customer has opted out of SMS' }, { status: 400 });
      }
      customers = [customer];
    } else {
      // Handle bulk messaging (blast) - requires credits and rate limiting
      
      // Check rate limit (24 hours between blasts)
      if (store.lastMessageBlastAt) {
        const hoursSinceLastBlast = (Date.now() - new Date(store.lastMessageBlastAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastBlast < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceLastBlast);
          return NextResponse.json({ 
            success: false, 
            error: `Rate limit: Wait ${hoursRemaining} hours before next blast` 
          }, { status: 429 });
        }
      }

      // Get customers (exclude opted-out)
      const where: any = { storeId: store.storeId, smsOptedOut: false };
      if (audience === 'undecided') where.redeemed = false;
      if (audience === 'sampling') where.AND = [{ redeemed: true }, { promoRedeemed: false }];
      if (audience === 'purchased') where.promoRedeemed = true;
      if (audience === 'ready_for_pickup') where.currentStage = 'ready_for_pickup';

      customers = await prisma.customer.findMany({ 
        where, 
        select: { phone: true, smsOptedOut: true } 
      });

      const recipientCount = customers.length;

      // Check credit balance
      if (store.messageCreditBalance < recipientCount) {
        return NextResponse.json({ 
          success: false, 
          error: `Insufficient credits: Need ${recipientCount}, have ${store.messageCreditBalance}` 
        }, { status: 402 });
      }

      // Deduct credits BEFORE sending
      await prisma.store.update({
        where: { id: store.id },
        data: {
          messageCreditBalance: { decrement: recipientCount },
          totalMessagesSent: { increment: recipientCount },
          lastMessageBlastAt: new Date(),
        }
      });
    }

    let sent = 0;
    let failed = 0;

    // SMS via Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      for (const c of customers) {
        if (!c.phone || c.smsOptedOut) continue;
        try {
          await client.messages.create({ 
            to: c.phone, 
            from: process.env.TWILIO_PHONE_NUMBER, 
            body: message 
          });
          sent++;
        } catch (error) {
          console.error('Twilio send error:', error);
          failed++;
        }
      }
    } else {
      return NextResponse.json({ success: false, error: 'SMS not configured' }, { status: 500 });
    }

    // Log campaign (only for bulk blasts, not direct messages)
    if (audience !== 'specific') {
      await prisma.messageCampaign.create({
        data: {
          storeId: store.id,
          message,
          audience,
          templateUsed,
          recipientCount: customers.length,
          sentCount: sent,
          creditsUsed: customers.length,
          optOutCount: 0, // Will be updated by webhook
        }
      });
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (err) {
    console.error('Customer message error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

