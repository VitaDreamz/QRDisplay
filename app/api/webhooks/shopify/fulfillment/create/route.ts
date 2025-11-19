import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyShopifyWebhook } from '@/lib/shopify';

/**
 * Shopify Fulfillment Webhook  
 * Triggered when an order is fulfilled (including 3rd party like ShipBob)
 * Adds verification token to inventory and sends SMS notification
 * 
 * This handles the same logic as handleWholesaleFulfilled in orders/route.ts
 * but is triggered by fulfillments/create instead of orders/fulfilled
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const hmacHeader = req.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain = req.headers.get('X-Shopify-Shop-Domain');
    const topic = req.headers.get('X-Shopify-Topic');

    console.log(`🚀 [Fulfillment Webhook] ${topic} received for ${shopDomain}`);

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

    const fulfillmentData = JSON.parse(body);
    console.log(`[Fulfillment Webhook] Fulfillment ID: ${fulfillmentData.id}`);
    console.log(`[Fulfillment Webhook] Order ID: ${fulfillmentData.order_id}`);
    console.log(`[Fulfillment Webhook] Tracking: ${fulfillmentData.tracking_number || 'N/A'}`);
    console.log(`[Fulfillment Webhook] Status: ${fulfillmentData.status || 'N/A'}`);
    console.log(`[Fulfillment Webhook] Shipment Status: ${fulfillmentData.shipment_status || 'N/A'}`);

    // Only process when status is delivered or out_for_delivery
    // Possible values: pending, open, success, cancelled, error, failure
    // Shipment status: label_printed, label_purchased, attempted_delivery, ready_for_pickup, 
    //                  confirmed, in_transit, out_for_delivery, delivered, failure
    const shouldNotify = fulfillmentData.shipment_status === 'delivered' || 
                        fulfillmentData.shipment_status === 'out_for_delivery';

    if (!shouldNotify) {
      console.log(`ℹ️  Fulfillment status is '${fulfillmentData.shipment_status}' - waiting for delivery`);
      return NextResponse.json({ 
        received: true, 
        message: `Waiting for delivery status, current: ${fulfillmentData.shipment_status}` 
      });
    }

    console.log(`📬 Fulfillment is ${fulfillmentData.shipment_status} - processing...`);

    // Fetch the full order using REST API
    const orderUrl = `https://${shopDomain}/admin/api/2025-01/orders/${fulfillmentData.order_id}.json`;
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'X-Shopify-Access-Token': org.shopifyAccessToken!,
      },
    });

    if (!orderResponse.ok) {
      console.log(`❌ Failed to fetch order: ${orderResponse.status}`);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }

    const orderData = await orderResponse.json();
    const order = orderData.order;

    if (!order) {
      console.log(`❌ Order not found: ${fulfillmentData.order_id}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`📦 Order #${order.order_number} - Customer ID: ${order.customer?.id}`);

    // Check if wholesale order by customer tags
    const customerTags = order.customer?.tags ? order.customer.tags.split(', ') : [];
    console.log(`🏷️  Customer tags: ${customerTags.join(', ')}`);
    
    if (!customerTags.includes('wg_wholesale')) {
      console.log(`ℹ️  Not a wholesale order - skipping`);
      return NextResponse.json({ received: true, message: 'Not a wholesale order' });
    }

    // Get customer ID
    const customerId = order.customer?.id?.toString();
    if (!customerId) {
      console.log(`❌ No customer ID found`);
      return NextResponse.json({ error: 'No customer ID' }, { status: 400 });
    }

    // Find the store by Shopify customer ID
    const store = await prisma.store.findFirst({
      where: { shopifyCustomerId: customerId },
      select: {
        id: true,
        storeId: true,
        storeName: true,
        purchasingPhone: true,
        ownerPhone: true,
      }
    });

    if (!store) {
      console.log(`❌ Store not found for customer ${customerId}`);
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    console.log(`✅ Found store: ${store.storeName} (${store.storeId})`);

    const trackingNumber = fulfillmentData.tracking_number || null;
    const wholesaleItems = [];

    // Process each line item
    for (const item of order.line_items) {
      try {
        let wholesaleProduct = null;
        let matchMethod = '';

        // Match by Shopify Variant ID (BEST)
        if (item.variant_id) {
          const variantGid = `gid://shopify/ProductVariant/${item.variant_id}`;
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              shopifyVariantId: variantGid,
              unitsPerBox: { not: null }
            }
          });
          if (wholesaleProduct) matchMethod = 'variant ID';
        }

        // Match by Shopify Product ID (GOOD)
        if (!wholesaleProduct && item.product_id) {
          const productGid = `gid://shopify/Product/${item.product_id}`;
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              shopifyProductId: productGid,
              unitsPerBox: { not: null }
            }
          });
          if (wholesaleProduct) matchMethod = 'product ID';
        }

        // Match by SKU ending in -BX (FALLBACK)
        if (!wholesaleProduct && item.sku?.endsWith('-BX')) {
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              sku: item.sku,
              unitsPerBox: { not: null }
            }
          });
          if (wholesaleProduct) matchMethod = 'SKU';
        }

        if (!wholesaleProduct || !wholesaleProduct.unitsPerBox) {
          console.log(`ℹ️  Skipping non-wholesale item: ${item.title}`);
          continue;
        }

        console.log(`✅ Matched wholesale product via ${matchMethod}: ${wholesaleProduct.name}`);

        const retailSku = wholesaleProduct.sku.replace(/-BX$/, '');
        const unitsShipped = item.quantity * wholesaleProduct.unitsPerBox;

        console.log(`📦 ${item.quantity}x ${wholesaleProduct.sku} = ${unitsShipped} units of ${retailSku}`);

        wholesaleItems.push({
          productName: wholesaleProduct.name,
          retailSku,
          unitsShipped
        });

        // No additional updates needed - quantityIncoming already set by orders/create webhook

        // Log transaction
        await prisma.inventoryTransaction.create({
          data: {
            storeId: store.id,
            productSku: retailSku,
            type: 'wholesale_fulfilled',
            quantity: unitsShipped,
            balanceAfter: 0,
            notes: `Order ${order.name} fulfilled and shipped - ${item.quantity}x ${wholesaleProduct.name} = ${unitsShipped} units. Tracking: ${trackingNumber || 'N/A'}`,
          },
        });

      } catch (itemError) {
        console.error(`❌ Error processing item:`, itemError);
      }
    }

    if (wholesaleItems.length === 0) {
      console.log(`ℹ️  No wholesale items in this fulfillment`);
      return NextResponse.json({ received: true, message: 'No wholesale items' });
    }

    console.log(`✅ Fulfillment processing complete - ${wholesaleItems.length} items`);

    // Send SMS notifications
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qrdisplay.vercel.app';
    const dashboardUrl = `${appUrl}/store/dashboard`;
    
    const totalUnits = wholesaleItems.reduce((sum, item) => sum + item.unitsShipped, 0);
    
    // Simple, clean SMS message - only sent when delivered or out for delivery
    const statusText = fulfillmentData.shipment_status === 'delivered' ? 'delivered' : 'arriving soon';
    const message = `📦 Wholesale order ${statusText}! ${totalUnits} units ready to receive.${trackingNumber ? `\nTracking: ${trackingNumber}` : ''}\n\nMark as received: ${dashboardUrl}`;

    // Send to purchasing contact
    if (store.purchasingPhone) {
      console.log(`📱 Sending SMS to purchasing: ${store.purchasingPhone}`);
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: store.purchasingPhone,
      });
    }

    // Send to owner if different
    if (store.ownerPhone && store.ownerPhone !== store.purchasingPhone) {
      console.log(`📱 Sending SMS to owner: ${store.ownerPhone}`);
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: store.ownerPhone,
      });
    }

    return NextResponse.json({ 
      success: true, 
      store: store.storeId,
      items: wholesaleItems.length
    });

  } catch (error: any) {
    console.error('❌ [Fulfillment Webhook] Error:', error);
    console.error(error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
