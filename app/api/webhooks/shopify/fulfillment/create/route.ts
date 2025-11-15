import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyShopifyWebhook } from '@/lib/shopify';
import crypto from 'crypto';

/**
 * Shopify Order Fulfillment Webhook
 * Triggered when an order is marked as fulfilled in Shopify
 * Updates wholesale order status and sets inventory as "incoming"
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

    // Find wholesale order by Shopify order ID
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
            storeName: true,
            purchasingPhone: true,
          },
        },
      },
    });

    if (!wholesaleOrder) {
      console.log(`No wholesale order found for Shopify order ${data.id}`);
      return NextResponse.json({ received: true });
    }

    // Update order status to fulfilled
    await prisma.wholesaleOrder.update({
      where: { id: wholesaleOrder.id },
      data: {
        status: 'fulfilled',
        fulfilledAt: new Date(),
        shopifyOrderId: data.id?.toString(),
        shopifyFulfillmentId: data.fulfillments?.[0]?.id?.toString(),
        trackingNumber: data.fulfillments?.[0]?.tracking_number,
      },
    });

    // Calculate retail units and update inventory as "incoming"
    for (const item of wholesaleOrder.items) {
      const wholesaleProduct = item.product;
      
      // Get the retail SKU (remove -BX suffix)
      const retailSku = wholesaleProduct.sku.replace('-BX', '');
      
      // Calculate retail units (boxes * units per box)
      const unitsPerBox = wholesaleProduct.unitsPerBox || 1;
      const retailUnits = item.quantity * unitsPerBox;

      // Update item with retail info
      await prisma.wholesaleOrderItem.update({
        where: { id: item.id },
        data: {
          retailSku,
          retailUnits,
        },
      });

      // Update inventory to show incoming
      await prisma.storeInventory.upsert({
        where: {
          storeId_productSku: {
            storeId: wholesaleOrder.store.id,
            productSku: retailSku,
          },
        },
        create: {
          storeId: wholesaleOrder.store.id,
          productSku: retailSku,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityIncoming: retailUnits,
          quantityAvailable: 0,
          pendingOrderId: wholesaleOrder.orderId,
        },
        update: {
          quantityIncoming: {
            increment: retailUnits,
          },
          pendingOrderId: wholesaleOrder.orderId,
        },
      });

      // Log transaction
      await prisma.inventoryTransaction.create({
        data: {
          storeId: wholesaleOrder.store.id,
          productSku: retailSku,
          type: 'wholesale_incoming',
          quantity: retailUnits,
          balanceAfter: 0, // Will be updated when received
          notes: `Wholesale order ${wholesaleOrder.orderId} fulfilled - ${item.quantity}x ${wholesaleProduct.name} = ${retailUnits} units incoming`,
        },
      });
    }

    console.log(`✅ Marked order ${wholesaleOrder.orderId} as fulfilled, inventory set to incoming`);

    return NextResponse.json({ success: true, orderId: wholesaleOrder.orderId });
  } catch (error: any) {
    console.error('[Webhook fulfillment/create] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
