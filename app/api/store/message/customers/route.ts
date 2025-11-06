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

    const { audience = 'all', message = '', channel = 'sms', customerId } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    let customers;
    
    // Handle specific customer message
    if (audience === 'specific' && customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, storeId: store.storeId },
        select: { phone: true }
      });
      if (!customer) {
        return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
      }
      customers = [customer];
    } else {
      // Handle bulk messaging by status
      const where: any = { storeId: store.storeId };
      if (audience === 'undecided') where.currentStage = 'undecided';
      if (audience === 'sampling') where.currentStage = 'sampling';
      if (audience === 'purchased') where.currentStage = { in: ['purchased', 'repeat'] };
      if (audience === 'ready_for_pickup') where.currentStage = 'ready_for_pickup';

      customers = await prisma.customer.findMany({ where, select: { phone: true } });
    }

    let sent = 0;
    let failed = 0;

    // SMS via Twilio (only channel now)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      for (const c of customers) {
        if (!c.phone) continue;
        try {
          await client.messages.create({ to: c.phone, from: process.env.TWILIO_PHONE_NUMBER, body: message });
          sent++;
        } catch {
          failed++;
        }
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (err) {
    console.error('Customer message error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
