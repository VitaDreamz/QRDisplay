/**
 * Shopify Order Webhook Handler
 * Handles orders/paid and orders/fulfilled webhooks
 * Tracks sample-to-purchase conversions and calculates commissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyShopifyWebhook, addCustomerTimelineEvent, updateCustomerStage } from '@/lib/shopify';
import { shouldAttributeConversion, calculateCommission } from '@/lib/commission';
import { awardOnlineSalePoints } from '@/lib/staff-points';

const prisma = new PrismaClient();

interface ShopifyOrder {
  id: number;
  order_number?: number;
  email: string;
  phone: string | null;
  total_price: string;
  customer: {
    id: number;
    email: string;
    phone: string | null;
    first_name: string;
    last_name: string;
    tags?: string; // Customer tags like "member:MEM-027"
  };
  created_at: string;
  line_items: Array<{
    id: number;
    product_id: number;
    variant_id?: number; // Shopify variant ID
    title: string;
    quantity: number;
    price: string;
    sku?: string; // SKU for wholesale detection (fallback)
  }>;
  fulfillments?: Array<{
    id: number;
    tracking_number?: string;
    tracking_company?: string;
    tracking_url?: string;
    estimated_delivery_at?: string;
  }>;
}

export async function POST(req: NextRequest) {
  // Log to both console and return in response for debugging
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };
  
  log('🚀 WEBHOOK RECEIVED - Starting processing');
  log(`Headers: shopDomain=${req.headers.get('x-shopify-shop-domain')}, topic=${req.headers.get('x-shopify-topic')}, hasHmac=${!!req.headers.get('x-shopify-hmac-sha256')}`);
  
  try {
    // Get webhook headers
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');

    if (!shopDomain || !topic || !hmacHeader) {
      log('❌ Missing Shopify webhook headers');
      console.error('❌ Missing Shopify webhook headers');
      return NextResponse.json({ error: 'Missing webhook headers', logs }, { status: 400 });
    }

    // Get request body as text for HMAC verification
    const rawBody = await req.text();
    log(`📦 Raw body length: ${rawBody.length}`);
    
    // Find organization by shop domain
    const org = await prisma.organization.findFirst({
      where: {
        shopifyStoreName: shopDomain,
        shopifyActive: true,
      },
    });

    if (!org) {
      log(`❌ Organization not found for shop: ${shopDomain}`);
      console.error(`❌ Organization not found for shop: ${shopDomain}`);
      return NextResponse.json({ error: 'Organization not found', logs }, { status: 404 });
    }

    log(`✅ Found organization: ${org.name}`);

    // Verify webhook signature
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, org.shopifyWebhookSecret || '');
    if (!isValid) {
      log('❌ Invalid webhook signature');
      console.error('❌ Invalid webhook signature');
      await logWebhook(org.id, null, topic, JSON.parse(rawBody), 'failed', 'Invalid signature');
      return NextResponse.json({ error: 'Invalid signature', logs }, { status: 401 });
    }

    log('✅ Webhook signature verified');

    // Parse order data
    const order: ShopifyOrder = JSON.parse(rawBody);
    log(`📦 Processing ${topic} webhook for order #${order.id}`);

    // Handle different webhook topics
    if (topic === 'orders/paid' || topic === 'orders/create') {
      await handleOrderPaid(org.id, order, topic);
      await handleWholesaleOrder(org.id, order, topic); // Process wholesale orders
    } else if (topic === 'orders/fulfilled') {
      await handleOrderFulfilled(org.id, order, topic);
      await handleWholesaleFulfilled(org.id, order, topic); // Update wholesale tracking
    } else {
      log(`ℹ️  Ignoring webhook topic: ${topic}`);
      console.log(`ℹ️  Ignoring webhook topic: ${topic}`);
      await logWebhook(org.id, null, topic, order, 'ignored', `Topic not handled: ${topic}`);
    }

    log('✅ Webhook processing complete');
    return NextResponse.json({ success: true, processed: topic, logs });
  } catch (error) {
    log(`❌ Webhook processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error instanceof Error ? error.message : 'Unknown error', logs },
      { status: 500 }
    );
  }
}

/**
 * Handle orders/paid webhook
 * Check if customer should be attributed and calculate commission
 */
async function handleOrderPaid(orgId: string, order: ShopifyOrder, topic: string) {
  try {
    const orderTotal = parseFloat(order.total_price);
    const shopifyCustomerId = order.customer.id.toString();
    const shopifyOrderId = order.id.toString();
    const purchaseDate = new Date(order.created_at);

    // IDEMPOTENCY CHECK: Prevent duplicate processing if webhook is received multiple times
    const existingConversion = await prisma.conversion.findFirst({
      where: {
        shopifyOrderId,
        orgId,
      },
    });

    if (existingConversion) {
      console.log(`⏭️  Order ${shopifyOrderId} already processed - skipping duplicate webhook`);
      await logWebhook(orgId, null, topic, order, 'success', 'Duplicate webhook - already processed');
      return;
    }

    console.log(`💰 Order paid: $${orderTotal} by customer ${shopifyCustomerId}`);
    console.log(`📞 Phone in order: ${order.customer.phone}`);
    console.log(`📧 Email in order: ${order.customer.email}`);
    console.log(`🏷️  Customer tags in webhook: ${order.customer.tags || 'Not included in webhook'}`);

    // If tags not in webhook, fetch them from Shopify API
    let customerTags = order.customer.tags || '';
    if (!customerTags) {
      console.log(`📡 Fetching customer tags from Shopify API...`);
      try {
        // Fetch org first to use Shopify API
        const orgForTags = await prisma.organization.findUnique({
          where: { id: orgId },
        });
        
        if (orgForTags) {
          const { getShopifyCustomer } = await import('@/lib/shopify');
          const shopifyCustomer = await getShopifyCustomer(orgForTags, shopifyCustomerId);
          customerTags = shopifyCustomer.tags || '';
          console.log(`✅ Fetched tags: ${customerTags}`);
        }
      } catch (err) {
        console.error(`❌ Failed to fetch customer tags:`, err);
        // Continue without tags
      }
    }

    // Extract memberId from customer tags (e.g., "member:MEM-027")
    let memberId: string | null = null;
    let storeTag: string | null = null;
    if (customerTags) {
      const memberTag = customerTags.split(',').find(tag => tag.trim().startsWith('member:'));
      if (memberTag) {
        memberId = memberTag.trim().replace('member:', '');
        console.log(`🎯 Found member tag: ${memberId}`);
      }
      
      // Also check for store tags (e.g., "SID-021" or "Store:SID-021")
      const sidTag = customerTags.split(',').find(tag => {
        const trimmed = tag.trim();
        return trimmed.startsWith('SID-') || trimmed.startsWith('Store:SID-');
      });
      if (sidTag) {
        storeTag = sidTag.trim().replace('Store:', ''); // Remove "Store:" prefix if present
        console.log(`🏪 Found store tag: ${storeTag}`);
      }
    }

    // Strategy 1: Find by memberId from tag (most reliable)
    let customer = null;
    if (memberId) {
      customer = await prisma.customer.findFirst({
        where: { memberId },
        include: { store: true },
      });
      if (customer) {
        console.log(`✅ Matched by memberId: ${memberId}`);
      }
    }

    // Strategy 2: Find by store tag (if customer doesn't have member tag yet)
    if (!customer && storeTag) {
      customer = await prisma.customer.findFirst({
        where: { 
          storeId: storeTag,
          OR: [
            order.customer.phone ? { phone: order.customer.phone } : {},
            order.customer.email ? { email: order.customer.email.toLowerCase() } : {},
          ].filter(obj => Object.keys(obj).length > 0) as any
        },
        include: { store: true },
      });
      if (customer) {
        console.log(`✅ Matched by store tag and phone/email: ${storeTag}`);
      }
    }

    // Strategy 3: Find by Shopify customer ID
    // Strategy 3: Find by Shopify customer ID
    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { shopifyCustomerId: shopifyCustomerId },
        include: { store: true },
      });
      if (customer) {
        console.log(`✅ Matched by Shopify customer ID: ${shopifyCustomerId}`);
      }
    }

    // Strategy 4: Fallback to phone/email matching
    if (!customer && (order.customer.phone || order.customer.email)) {
      const phoneQuery = order.customer.phone ? { phone: order.customer.phone } : undefined;
      const emailQuery = order.customer.email ? { email: order.customer.email.toLowerCase() } : undefined;
      
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            phoneQuery,
            emailQuery,
          ].filter(Boolean) as any,
        },
        include: {
          store: true,
        },
      });
      
      if (customer) {
        console.log(`✅ Matched by phone/email`);
      }
    }
    
    // If we found customer by any method, update their Shopify customer ID if missing
    if (customer && !customer.shopifyCustomerId) {
      console.log(`🔗 Linking customer ${customer.memberId} to Shopify ID ${shopifyCustomerId}`);
      await prisma.customer.update({
        where: { id: customer.id },
        data: { shopifyCustomerId },
      });
      customer.shopifyCustomerId = shopifyCustomerId;
    }

    if (!customer) {
      console.log(`ℹ️  Customer not found in QRDisplay - no attribution`);
      await logWebhook(orgId, null, topic, order, 'success', 'Customer not in QRDisplay system');
      return;
    }

    console.log(`👤 Found customer: ${customer.firstName} ${customer.lastName} (${customer.id})`);

    // Get organization for commission settings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    // Check if conversion should be attributed
    const attribution = shouldAttributeConversion(customer, org, purchaseDate);

    if (!attribution.shouldAttribute) {
      console.log(`❌ Not attributed: ${attribution.reason}`);
      await logWebhook(orgId, customer.id, topic, order, 'success', `Not attributed: ${attribution.reason}`);
      return;
    }

    console.log(`✅ Attribution approved: ${attribution.reason}`);

    // Calculate commission
    const commissionAmount = calculateCommission(orderTotal, org.commissionRate || 10.0);
    const daysToConversion = attribution.daysToConversion || 0;

    // Create conversion record
    const conversion = await prisma.conversion.create({
      data: {
        orgId,
        customerId: customer.memberId,
        shopifyOrderId,
        shopifyCustomerId,
        storeId: customer.attributedStoreId || customer.storeId,
        orderNumber: `#${order.id}`,
        orderTotal,
        commissionAmount,
        commissionRate: org.commissionRate || 10.0,
        sampleDate: customer.sampleDate || new Date(),
        purchaseDate,
        daysToConversion,
        attributed: true,
        paid: false, // Will be marked true when store credit is applied
      },
    });

    console.log(`✅ Conversion tracked: $${commissionAmount.toFixed(2)} commission`);
    console.log(`   Store: ${customer.store?.storeName} (${customer.store?.storeId})`);
    console.log(`   Days to conversion: ${daysToConversion}`);

    // Get the brand from customer's most recent sample
    // This determines which brand partnership gets credited
    const recentSample = await prisma.sampleHistory.findFirst({
      where: { customerId: customer.id },
      orderBy: { sampledAt: 'desc' },
      select: { brandId: true },
    });

    if (!recentSample) {
      console.log(`⚠️  No sample history found for customer ${customer.memberId} - cannot attribute to brand`);
      await logWebhook(orgId, customer.id, topic, order, 'success', 'No sample history for brand attribution');
      return;
    }

    const brandId = recentSample.brandId;
    console.log(`🎯 Attributing to brand: ${brandId}`);

    // Apply store credit to the brand partnership
    const storeId = customer.attributedStoreId || customer.storeId;
    if (storeId) {
      try {
        await applyStoreCredit(
          storeId, 
          brandId, 
          commissionAmount, 
          conversion.id, 
          customer.store?.storeName || 'Store',
          customer.id,
          `${customer.firstName} ${customer.lastName}`
        );
        
        // Mark conversion as paid
        await prisma.conversion.update({
          where: { id: conversion.id },
          data: { paid: true },
        });
        
        console.log(`💳 Store credit applied: $${commissionAmount.toFixed(2)} to ${customer.store?.storeName}`);
        
        // Award points to staff member (1 point per dollar)
        if ((customer as any).redeemedByStaffId) {
          try {
            await awardOnlineSalePoints({
              staffId: (customer as any).redeemedByStaffId,
              storeId,
              orgId,
              saleAmount: orderTotal,
              customerId: customer.id,
              customerName: `${customer.firstName} ${customer.lastName}`,
              conversionId: conversion.id,
            });
            console.log(`🎯 Points awarded for online sale: ${Math.floor(orderTotal)} points`);
          } catch (pointsErr) {
            console.error('❌ Failed to award staff points:', pointsErr);
            // Don't fail the whole process if points fail
          }
        }
      } catch (creditErr) {
        console.error('❌ Failed to apply store credit:', creditErr);
        // Don't fail the whole process if credit application fails
      }
    }

    // Update customer stage to converted
    if ((customer as any).shopifyCustomerId) {
      try {
        await updateCustomerStage(org, (customer as any).shopifyCustomerId, 'converted-online');
        
        // Add timeline event for purchase
        const productNames = order.line_items.map(item => item.title).join(', ');
        await addCustomerTimelineEvent(org, (customer as any).shopifyCustomerId, {
          message: `Purchased Online: ${productNames} ($${orderTotal.toFixed(2)}) - Commission: $${commissionAmount.toFixed(2)} to ${customer.store?.storeName}`,
          occurredAt: purchaseDate,
        });
      } catch (shopifyErr) {
        console.error('❌ Shopify stage update failed:', shopifyErr);
      }
    }

    await logWebhook(orgId, customer.id, topic, order, 'success', `Conversion tracked: $${commissionAmount.toFixed(2)} - Credit applied`);
  } catch (error) {
    console.error('❌ Error handling order paid:', error);
    await logWebhook(
      orgId,
      null,
      topic,
      order,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

/**
 * Apply store credit for commission earned
 */
async function applyStoreCredit(
  storeIdString: string,
  brandId: string,
  amount: number,
  conversionId: string,
  storeName: string,
  customerId?: string,
  customerName?: string
) {
  console.log(`💳 Applying store credit: $${amount.toFixed(2)} to ${storeIdString} for brand ${brandId}`);
  
  // Get store by storeId (string like "SID-021")
  const store = await prisma.store.findUnique({
    where: { storeId: storeIdString },
    select: { id: true },
  });

  if (!store) {
    throw new Error(`Store not found: ${storeIdString}`);
  }

  // Find the brand partnership between this store and brand
  const partnership = await prisma.storeBrandPartnership.findUnique({
    where: {
      storeId_brandId: {
        storeId: store.id,
        brandId: brandId,
      }
    },
    select: { 
      id: true, 
      storeCreditBalance: true,
      brand: {
        select: { name: true }
      }
    },
  });

  if (!partnership) {
    throw new Error(`Brand partnership not found between store ${storeIdString} and brand ${brandId}`);
  }

  const previousBalance = Number(partnership.storeCreditBalance);
  const newBalance = previousBalance + amount;

  console.log(`   Brand: ${partnership.brand.name}`);
  console.log(`   Previous balance: $${previousBalance.toFixed(2)}`);
  console.log(`   Commission earned: $${amount.toFixed(2)}`);
  console.log(`   New balance: $${newBalance.toFixed(2)}`);

  // Update partnership credit balance
  await prisma.storeBrandPartnership.update({
    where: { id: partnership.id },
    data: { storeCreditBalance: newBalance },
  });

  // Create credit transaction record linked to the brand partnership
  await prisma.storeCreditTransaction.create({
    data: {
      storeId: store.id,
      brandPartnershipId: partnership.id,
      amount,
      type: 'earned',
      reason: `Commission from Online Order #${conversionId}`,
      balance: newBalance,
      customerId,
      customerName,
    },
  });

  console.log(`✅ Store credit transaction created for ${storeName} with ${partnership.brand.name}`);
}

/**
 * Handle orders/fulfilled webhook
 * Can be used to track fulfillment status
 */
async function handleOrderFulfilled(orgId: string, order: ShopifyOrder, topic: string) {
  try {
    const shopifyOrderId = order.id.toString();

    console.log(`📦 Order fulfilled: ${shopifyOrderId}`);

    // Find existing conversion
    const conversion = await prisma.conversion.findFirst({
      where: {
        shopifyOrderId,
        orgId,
      },
    });

    if (!conversion) {
      console.log(`ℹ️  No conversion found for order ${shopifyOrderId}`);
      await logWebhook(orgId, null, topic, order, 'success', 'No conversion to update');
      return;
    }

    // Log fulfillment (future: could update conversion status)
    console.log(`✅ Order fulfilled for conversion ${conversion.id}`);
    await logWebhook(orgId, conversion.customerId, topic, order, 'success', 'Order fulfilled');
  } catch (error) {
    console.error('❌ Error handling order fulfilled:', error);
    await logWebhook(
      orgId,
      null,
      topic,
      order,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

/**
 * Handle wholesale orders when paid
 * Matches products by shopifyVariantId (preferred) or shopifyProductId or SKU (fallback)
 * Creates incoming inventory records for wholesale orders
 */
async function handleWholesaleOrder(orgId: string, order: ShopifyOrder, topic: string) {
  try {
    console.log(`🔍 Processing order ${order.id} for wholesale products...`);
    console.log(`   Order has ${order.line_items.length} line items`);
    console.log(`   Customer ID: ${order.customer.id}`);
    console.log(`   Org ID: ${orgId}`);

    // Find which store this order is for (via shopifyCustomerId)
    const store = await prisma.store.findFirst({
      where: { 
        shopifyCustomerId: order.customer.id.toString(),
        // Don't filter by orgId - store orgId is ORG-QRDISPLAY, order orgId is the brand
      }
    });

    if (!store) {
      console.error(`❌ Store not found for wholesale order. Shopify Customer ID: ${order.customer.id}`);
      console.error(`   Tried to find store with shopifyCustomerId: ${order.customer.id.toString()}`);
      return;
    }

    console.log(`✅ Found store: ${store.storeName} (${store.storeId})`);

    const wholesaleItems = [];

    // Process each line item
    for (const item of order.line_items) {
      console.log(`\n📦 Processing line item:`);
      console.log(`   Title: ${item.title}`);
      console.log(`   SKU: ${item.sku || 'NO SKU'}`);
      console.log(`   Product ID: ${item.product_id}`);
      console.log(`   Variant ID: ${item.variant_id || 'NO VARIANT ID'}`);
      console.log(`   Quantity: ${item.quantity}`);
      
      try {
        let wholesaleProduct = null;
        let matchMethod = '';

        // Method 1: Match by Shopify Variant ID (BEST - most accurate)
        if (item.variant_id) {
          const variantGid = `gid://shopify/ProductVariant/${item.variant_id}`;
          console.log(`   🔍 Trying variant match: ${variantGid}`);
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              shopifyVariantId: variantGid,
              // Don't filter by orgId here - will check after
              unitsPerBox: { not: null } // Must be a wholesale product
            }
          });
          if (wholesaleProduct) {
            matchMethod = `variant ID ${item.variant_id}`;
            console.log(`   ✅ MATCHED by variant ID!`);
          } else {
            console.log(`   ❌ No match by variant ID`);
          }
        }

        // Method 2: Match by Shopify Product ID (GOOD - less specific)
        if (!wholesaleProduct && item.product_id) {
          const productGid = `gid://shopify/Product/${item.product_id}`;
          console.log(`   🔍 Trying product match: ${productGid}`);
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              shopifyProductId: productGid,
              unitsPerBox: { not: null }
            }
          });
          if (wholesaleProduct) {
            matchMethod = `product ID ${item.product_id}`;
            console.log(`   ✅ MATCHED by product ID!`);
          } else {
            console.log(`   ❌ No match by product ID`);
          }
        }

        // Method 3: Match by SKU ending in -BX (FALLBACK - legacy)
        if (!wholesaleProduct && item.sku?.endsWith('-BX')) {
          console.log(`   🔍 Trying SKU match: ${item.sku}`);
          wholesaleProduct = await prisma.product.findFirst({
            where: { 
              sku: item.sku,
              unitsPerBox: { not: null }
            }
          });
          if (wholesaleProduct) {
            matchMethod = `SKU ${item.sku}`;
            console.log(`   ✅ MATCHED by SKU!`);
          } else {
            console.log(`   ❌ No match by SKU`);
          }
        }

        // If we found a wholesale product, process it
        if (wholesaleProduct && wholesaleProduct.unitsPerBox) {
          console.log(`✅ Matched wholesale product via ${matchMethod}: ${wholesaleProduct.name}`);
          console.log(`   Units per box: ${wholesaleProduct.unitsPerBox}`);
          
          // Find the corresponding retail product (same SKU without -BX)
          const retailSku = wholesaleProduct.sku.replace(/-BX$/, '');
          console.log(`   Looking for retail SKU: ${retailSku}`);
          
          const retailProduct = await prisma.product.findFirst({
            where: { 
              sku: retailSku,
              // Same brand as wholesale product
              orgId: wholesaleProduct.orgId
            }
          });

          if (!retailProduct) {
            console.error(`❌ Retail product not found for SKU: ${retailSku}`);
            continue;
          }

          console.log(`   ✅ Found retail product: ${retailProduct.name}`);

          const unitsOrdered = item.quantity * wholesaleProduct.unitsPerBox;
          console.log(`📦 ${item.quantity}x ${wholesaleProduct.sku} (${wholesaleProduct.name}) = ${unitsOrdered} units of ${retailSku}`);

          wholesaleItems.push({
            wholesaleProduct,
            retailProduct,
            retailSku,
            unitsOrdered
          });
        }
      } catch (itemError) {
        console.error(`Error processing line item ${item.id}:`, itemError);
      }
    }

    if (wholesaleItems.length === 0) {
      console.log(`ℹ️  No wholesale products found in order ${order.id}`);
      return; // Not a wholesale order
    }

    console.log(`📦 Wholesale order confirmed with ${wholesaleItems.length} wholesale items`);

    // Process each wholesale item to update inventory
    for (const { wholesaleProduct, retailSku, unitsOrdered } of wholesaleItems) {
      try {
        // Get or create store inventory
        let inventory = await prisma.storeInventory.findUnique({
          where: { 
            storeId_productSku: { 
              storeId: store.id, 
              productSku: retailSku 
            } 
          }
        });

        if (!inventory) {
          console.log(`➕ Creating new inventory record for ${retailSku}`);
          inventory = await prisma.storeInventory.create({
            data: {
              storeId: store.id,
              productSku: retailSku,
              quantityOnHand: 0,
              quantityIncoming: unitsOrdered,
              quantityReserved: 0,
              quantityAvailable: 0
            }
          });
        } else {
          console.log(`📈 Updating existing inventory for ${retailSku}`);
          // Add to incoming
          inventory = await prisma.storeInventory.update({
            where: { id: inventory.id },
            data: {
              quantityIncoming: { increment: unitsOrdered }
            }
          });
        }

        // NOTE: Old wholesale tracking code - now handled by proper WholesaleOrder system
        // The wholesale flow now uses /api/store/wholesale/submit which creates proper WholesaleOrders
        // This webhook still tracks retail conversions and commissions
        
        console.log(`✅ Updated inventory for ${retailSku}`);

        // Create transaction log
        await prisma.inventoryTransaction.create({
          data: {
            storeId: store.id,
            productSku: retailSku,
            type: 'wholesale_ordered',
            quantity: unitsOrdered,
            balanceAfter: inventory.quantityOnHand,
            notes: `Wholesale order #${order.order_number || order.id} - ${wholesaleProduct.name} (${unitsOrdered} units) - Status: Paid`
          }
        });

        console.log(`📝 Logged transaction for ${retailSku}`);

      } catch (itemError) {
        console.error(`❌ Error processing wholesale item ${wholesaleProduct?.sku}:`, itemError);
        // Continue processing other items
      }
    }

    console.log(`✅ Wholesale order processing complete`);

    // TODO: Notify store owner about incoming inventory
    // Can send email/SMS here with order details

  } catch (error) {
    console.error('❌ Error in handleWholesaleOrder:', error);
    // Don't throw - let the main webhook continue processing
  }
}

/**
 * Handle wholesale orders when fulfilled
 * Updates tracking information and order status
 */
async function handleWholesaleFulfilled(orgId: string, order: ShopifyOrder, topic: string) {
  try {
    console.log(`🚚 Processing fulfilled order ${order.id} for wholesale products...`);
    
    // Find which store this order is for
    const store = await prisma.store.findFirst({
      where: { 
        shopifyCustomerId: order.customer.id.toString(),
      }
    });

    if (!store) {
      console.log(`ℹ️  Store not found for fulfilled order - not a wholesale order`);
      return;
    }

    console.log(`✅ Found store: ${store.storeName} (${store.storeId})`);

    // Get fulfillment data (tracking, carrier, etc.)
    const fulfillment = order.fulfillments?.[0];
    const trackingNumber = fulfillment?.tracking_number || null;
    const trackingCompany = fulfillment?.tracking_company || null;
    const trackingUrl = fulfillment?.tracking_url || null;

    console.log(`📦 Fulfillment tracking: ${trackingCompany || 'N/A'} - ${trackingNumber || 'N/A'}`);

    // Process each line item to set as incoming and generate verification token
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
          continue; // Not a wholesale product
        }

        console.log(`✅ Matched wholesale product via ${matchMethod}: ${wholesaleProduct.name}`);

        const retailSku = wholesaleProduct.sku.replace(/-BX$/, '');
        const unitsShipped = item.quantity * wholesaleProduct.unitsPerBox;

        console.log(`📦 ${item.quantity}x ${wholesaleProduct.sku} = ${unitsShipped} units of ${retailSku} shipped`);

        // Generate verification token
        const verificationToken = `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Update store inventory with incoming units and verification token
        const inventory = await prisma.storeInventory.upsert({
          where: {
            storeId_productSku: {
              storeId: store.id,
              productSku: retailSku,
            },
          },
          create: {
            storeId: store.id,
            productSku: retailSku,
            quantityOnHand: 0,
            quantityIncoming: unitsShipped,
            quantityReserved: 0,
            quantityAvailable: 0,
            verificationToken,
          },
          update: {
            quantityIncoming: { increment: unitsShipped },
            verificationToken, // Set/update verification token
          },
        });

        console.log(`✅ Updated inventory for ${retailSku}: +${unitsShipped} incoming`);
        console.log(`   Verification token: ${verificationToken}`);

        // Log inventory transaction
        await prisma.inventoryTransaction.create({
          data: {
            storeId: store.id,
            productSku: retailSku,
            type: 'wholesale_incoming',
            quantity: unitsShipped,
            balanceAfter: inventory.quantityOnHand, // Unchanged until verified
            notes: `Order #${order.order_number || order.id} fulfilled and shipped - ${item.quantity}x ${wholesaleProduct.name} = ${unitsShipped} units incoming. Tracking: ${trackingNumber || 'N/A'}`,
          },
        });

      } catch (itemError) {
        console.error(`❌ Error processing fulfilled item:`, itemError);
      }
    }

    console.log(`✅ Wholesale fulfillment processing complete - inventory set to incoming with verification`);

    // TODO: Send SMS/email notification to store with tracking info and verification link

  } catch (error) {
    console.error('❌ Error in handleWholesaleFulfilled:', error);
  }
}

/**
 * Log webhook for audit trail
 */
async function logWebhook(
  orgId: string,
  customerId: string | null,
  topic: string,
  payload: any,
  status: 'success' | 'failed' | 'ignored',
  errorMessage?: string
) {
  try {
    await prisma.shopifyWebhookLog.create({
      data: {
        orgId,
        customerId: customerId || undefined,
        webhookId: payload.id?.toString() || `unknown-${Date.now()}`,
        topic,
        shopifyOrderId: payload.id?.toString() || null,
        payload,
        status,
        errorMessage,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('❌ Error logging webhook:', error);
  }
}
