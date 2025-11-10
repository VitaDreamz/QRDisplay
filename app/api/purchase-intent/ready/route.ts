import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { verifySlug } = await request.json();

    if (!verifySlug) {
      return NextResponse.json({ error: 'verifySlug is required' }, { status: 400 });
    }

    const intent = await prisma.purchaseIntent.findUnique({
      where: { verifySlug }
    });

    if (!intent) {
      return NextResponse.json({ error: 'Purchase intent not found' }, { status: 404 });
    }

    if (intent.status === 'fulfilled') {
      return NextResponse.json({ ok: true, message: 'Intent already fulfilled' });
    }

    // Mark as ready and set notified timestamp
    const updated = await prisma.purchaseIntent.update({
      where: { id: intent.id },
      data: { status: 'ready' }
    });

    // Update customer status to "ready_for_pickup"
    try {
      await prisma.customer.update({
        where: { id: intent.customerId },
        data: {
          currentStage: 'ready_for_pickup',
          stageChangedAt: new Date()
        }
      });
    } catch (e) {
      console.warn('Failed to update customer status to ready_for_pickup:', e);
    }

    // Send SMS to customer with redemption link (opt-out compliance)
    if (
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER
    ) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
        const redeemUrl = `${baseUrl}/r/${verifySlug}`;
        // Fetch related entities explicitly to avoid type issues with include
        const [customer, product, store] = await Promise.all([
          prisma.customer.findUnique({ where: { id: intent.customerId } }),
          prisma.product.findUnique({ where: { sku: intent.productSku } }),
          prisma.store.findUnique({ where: { id: intent.storeId } })
        ]);

        if (!customer?.phone) {
          return NextResponse.json({ ok: true, intent: updated, note: 'No customer phone on file' });
        }

        // Check opt-out
        const optOut = await prisma.optOut.findUnique({ where: { phone: customer.phone } });
        if (!optOut) {
          const twilio = require('twilio');
          const client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          const sms = `Good news! Your ${product?.name || 'item'} is ready for pickup at ${store?.storeName || 'the store'}. Head on over and have a staff member enter their PIN at ${redeemUrl} to redeem your ${intent.discountPercent}% off offer.`;
          await client.messages.create({
            to: customer.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: sms
          });
        }
      } catch (smsErr) {
        console.warn('Customer ready SMS failed:', smsErr);
      }
    }

    return NextResponse.json({ ok: true, intent: updated });
  } catch (error) {
    console.error('[Purchase Intent Ready API] POST error:', error);
    return NextResponse.json({ error: 'Failed to notify ready' }, { status: 500 });
  }
}
