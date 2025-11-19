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

    // We need to fetch the full order to get customer and line items
    // The fulfillment webhook only includes fulfillment data
    const shopify = await import('@shopify/shopify-api');
    const { shopifyApi, ApiVersion } = shopify;
    
    const shopifyClient = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecretKey: process.env.SHOPIFY_API_SECRET!,
      scopes: ['read_orders', 'write_orders'],
      hostName: shopDomain.replace('.myshopify.com', ''),
      apiVersion: ApiVersion.January25,
      isEmbeddedApp: false,
    });

    // Fetch the full order
    const session = {
      shop: shopDomain,
      accessToken: org.shopifyAccessToken!,
      isOnline: false,
      id: `offline_${shopDomain}`,
      state: 'enabled',
    };

    const orderGid = `gid://shopify/Order/${fulfillmentData.order_id}`;
    const client = new shopifyClient.clients.Graphql({ session: session as any });
    
    const orderQuery = `
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          customer {
            id
            tags
          }
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                sku
                quantity
                variant {
                  id
                }
                product {
                  id
                }
              }
            }
          }
        }
      }
    `;

    const orderResponse: any = await client.query({
      data: {
        query: orderQuery,
        variables: { id: orderGid },
      },
    });

    const order = orderResponse.body.data.order;
    if (!order) {
      console.log(`❌ Order not found: ${fulfillmentData.order_id}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`📦 Order ${order.name} - Customer tags: ${order.customer?.tags || 'none'}`);

    // Check if wholesale order
    const customerTags = order.customer?.tags || [];
    if (!customerTags.includes('wg_wholesale')) {
      console.log(`ℹ️  Not a wholesale order - skipping`);
      return NextResponse.json({ received: true, message: 'Not a wholesale order' });
    }

    // Extract numeric customer ID from GID
    const customerIdMatch = order.customer.id.match(/\/(\d+)$/);
    const customerId = customerIdMatch ? customerIdMatch[1] : null;

    if (!customerId) {
      console.log(`❌ Could not extract customer ID from: ${order.customer.id}`);
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
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

    // Generate ONE verification token for the entire order
    const verificationToken = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trackingNumber = fulfillmentData.tracking_number || null;
    const wholesaleItems = [];

    // Process each line item
    const lineItems = order.lineItems.edges.map((edge: any) => edge.node);
    
    for (const item of lineItems) {
      try {
        let wholesaleProduct = null;
        let matchMethod = '';

        // Extract numeric variant ID from GID
        const variantIdMatch = item.variant?.id?.match(/\/(\d+)$/);
        const variantId = variantIdMatch ? variantIdMatch[1] : null;

        // Extract numeric product ID from GID
        const productIdMatch = item.product?.id?.match(/\/(\d+)$/);
        const productId = productIdMatch ? productIdMatch[1] : null;

        // Match by Shopify Variant ID (BEST)
        if (variantId) {
          const variantGid = `gid://shopify/ProductVariant/${variantId}`;
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              shopifyVariantId: variantGid,
              unitsPerBox: { not: null }
            }
          });
          if (wholesaleProduct) matchMethod = 'variant ID';
        }

        // Match by Shopify Product ID (GOOD)
        if (!wholesaleProduct && productId) {
          const productGid = `gid://shopify/Product/${productId}`;
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

        // Update store inventory with verification token
        await prisma.storeInventory.update({
          where: {
            storeId_productSku: {
              storeId: store.id,
              productSku: retailSku,
            },
          },
          data: {
            verificationToken, // Add verification token to existing incoming inventory
          },
        });

        console.log(`✅ Added verification token to ${retailSku}`);

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
    console.log(`   Verification token: ${verificationToken}`);

    // Send SMS notifications
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qrdisplay.vercel.app';
    const verifyUrl = `${appUrl}/store/wholesale/verify/${verificationToken}`;
    
    const totalUnits = wholesaleItems.reduce((sum, item) => sum + item.unitsShipped, 0);
    const itemsList = wholesaleItems.map(item => `${item.unitsShipped} ${item.productName}`).join(', ');
    
    const message = `📦 Your wholesale order has shipped! ${totalUnits} units arriving: ${itemsList}. ${trackingNumber ? `Tracking: ${trackingNumber}` : ''} When delivered, verify receipt: ${verifyUrl}`;

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
      items: wholesaleItems.length,
      verificationToken 
    });

  } catch (error: any) {
    console.error('❌ [Fulfillment Webhook] Error:', error);
    console.error(error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
