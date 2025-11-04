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

    const { audience = 'all', message = '', channel = 'sms' } = await req.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Message required' }, { status: 400 });
    }

    const store = await prisma.store.findUnique({ where: { storeId } });
    if (!store) {
      return NextResponse.json({ success: false, error: 'Store not found' }, { status: 404 });
    }

    const where: any = { storeId: store.storeId };
    if (audience === 'redeemed') where.redeemed = true;
    if (audience === 'not-promo') where.AND = [{ redeemed: true }, { promoRedeemed: false }];

    const customers = await prisma.customer.findMany({ where, select: { phone: true, email: true } });

    let sent = 0;
    let failed = 0;

    // SMS via Twilio
    if (channel === 'sms' || channel === 'both') {
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
    }

    // Email via Resend
    if (channel === 'email' || channel === 'both') {
      if (process.env.RESEND_API_KEY) {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        for (const c of customers) {
          if (!c.email) continue;
          try {
            await resend.emails.send({
              from: 'QRDisplay <noreply@qrdisplay.com>',
              to: c.email,
              subject: `${store.storeName}: Update`,
              html: `<p>${message.replace(/\n/g, '<br/>')}</p>`
            });
            sent++;
          } catch {
            failed++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (err) {
    console.error('Customer message error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
