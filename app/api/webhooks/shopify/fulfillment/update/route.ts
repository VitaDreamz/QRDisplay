import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyShopifyWebhook } from '@/lib/shopify';
import { sendSMS } from '@/lib/twilio';
import crypto from 'crypto';

/**
 * Shopify Order Delivery Webhook
 * Triggered when an order is marked as delivered
 * Sends SMS to store with verification link
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.headers.get('X-Shopify-Shop-Domain');
    const topic = req.headers.get('X-Shopify-Topic');

    if (!hmacHeader || !shopDomain) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 });
    }

    // Get organization for this Shopify domain
    const org = await prisma.organization.findFirst({
      where: { shopifyStoreName: shopDomain },
    });

    if (!org || !org.shopifyWebhookSecret) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify webhook signature
    const isValid = verifyShopifyWebhook(body, hmacHeader, org.shopifyWebhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(body);
    console.log(`[Shopify Webhook] ${topic} for order ${data.id}`);

    // Find wholesale order
    const wholesaleOrder = await prisma.wholesaleOrder.findFirst({
      where: {
        OR: [
          { shopifyDraftOrderId: data.id?.toString() },
          { shopifyOrderId: data.id?.toString() },
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
            name: true,
            contactPhone: true,
          },
        },
      },
    });

    if (!wholesaleOrder) {
      console.log(`No wholesale order found for Shopify order ${data.id}`);
      return NextResponse.json({ received: true });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/store/wholesale/verify/${verificationToken}`;

    // Update order status
    await prisma.wholesaleOrder.update({
      where: { id: wholesaleOrder.id },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
        verificationToken,
      },
    });

    // Send SMS notification to store
    if (wholesaleOrder.store.contactPhone) {
      const itemCount = wholesaleOrder.items.reduce((sum, item) => sum + (item.retailUnits || 0), 0);
      
      const message = `📦 Your wholesale order #${wholesaleOrder.orderId} has been delivered! 

You're expecting ${itemCount} units across ${wholesaleOrder.items.length} products.

Please verify you received everything: ${verificationUrl}

-QRDisplay`;

      await sendSMS(wholesaleOrder.store.contactPhone, message);
      console.log(`✅ Sent verification SMS to ${wholesaleOrder.store.contactPhone}`);
    }

    return NextResponse.json({ success: true, orderId: wholesaleOrder.orderId });
  } catch (error: any) {
    console.error('[Webhook fulfillment/update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
