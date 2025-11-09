/**
 * Shopify Order Webhook Handler
 * Handles orders/paid and orders/fulfilled webhooks
 * Tracks sample-to-purchase conversions and calculates commissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyShopifyWebhook, addCustomerTimelineEvent, updateCustomerStage } from '@/lib/shopify';
import { shouldAttributeConversion, calculateCommission } from '@/lib/commission';

const prisma = new PrismaClient();

interface ShopifyOrder {
  id: number;
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
    title: string;
    quantity: number;
    price: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    // Get webhook headers
    const shopDomain = req.headers.get('x-shopify-shop-domain');
    const topic = req.headers.get('x-shopify-topic');
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');

    if (!shopDomain || !topic || !hmacHeader) {
      console.error('❌ Missing Shopify webhook headers');
      return NextResponse.json({ error: 'Missing webhook headers' }, { status: 400 });
    }

    // Get request body as text for HMAC verification
    const rawBody = await req.text();
    
    // Find organization by shop domain
    const org = await prisma.organization.findFirst({
      where: {
        shopifyStoreName: shopDomain,
        shopifyActive: true,
      },
    });

    if (!org) {
      console.error(`❌ Organization not found for shop: ${shopDomain}`);
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Verify webhook signature
    const isValid = verifyShopifyWebhook(rawBody, hmacHeader, org.shopifyWebhookSecret || '');
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      await logWebhook(org.id, null, topic, JSON.parse(rawBody), 'failed', 'Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse order data
    const order: ShopifyOrder = JSON.parse(rawBody);
    console.log(`📦 Processing ${topic} webhook for order #${order.id}`);

    // Handle different webhook topics
    if (topic === 'orders/paid' || topic === 'orders/create') {
      await handleOrderPaid(org.id, order, topic);
    } else if (topic === 'orders/fulfilled') {
      await handleOrderFulfilled(org.id, order, topic);
    } else {
      console.log(`ℹ️  Ignoring webhook topic: ${topic}`);
      await logWebhook(org.id, null, topic, order, 'ignored', `Topic not handled: ${topic}`);
    }

    return NextResponse.json({ success: true, processed: topic });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
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

    console.log(`💰 Order paid: $${orderTotal} by customer ${shopifyCustomerId}`);
    console.log(`📞 Phone in order: ${order.customer.phone}`);
    console.log(`📧 Email in order: ${order.customer.email}`);
    console.log(`🏷️  Customer tags: ${order.customer.tags}`);

    // Extract memberId from customer tags (e.g., "member:MEM-027")
    let memberId: string | null = null;
    if (order.customer.tags) {
      const memberTag = order.customer.tags.split(',').find(tag => tag.trim().startsWith('member:'));
      if (memberTag) {
        memberId = memberTag.trim().replace('member:', '');
        console.log(`🎯 Found member tag: ${memberId}`);
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

    // Strategy 2: Find by Shopify customer ID
    if (!customer) {
      customer = await prisma.customer.findFirst({
        where: { shopifyCustomerId: shopifyCustomerId },
        include: { store: true },
      });
      if (customer) {
        console.log(`✅ Matched by Shopify customer ID: ${shopifyCustomerId}`);
      }
    }

    // Strategy 3: Fallback to phone/email matching
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

    // Check if conversion already exists
    const existingConversion = await prisma.conversion.findFirst({
      where: {
        shopifyOrderId,
        orgId,
      },
    });

    if (existingConversion) {
      console.log(`ℹ️  Conversion already tracked for order ${shopifyOrderId}`);
      await logWebhook(orgId, customer.id, topic, order, 'success', 'Conversion already tracked');
      return;
    }

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

    // Apply store credit to the store
    const storeId = customer.attributedStoreId || customer.storeId;
    if (storeId) {
      try {
        await applyStoreCredit(storeId, commissionAmount, conversion.id, customer.store?.storeName || 'Store');
        
        // Mark conversion as paid
        await prisma.conversion.update({
          where: { id: conversion.id },
          data: { paid: true },
        });
        
        console.log(`💳 Store credit applied: $${commissionAmount.toFixed(2)} to ${customer.store?.storeName}`);
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
  storeId: string,
  amount: number,
  conversionId: string,
  storeName: string
) {
  // Get current store credit balance
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { storeCredit: true },
  });

  if (!store) {
    throw new Error(`Store not found: ${storeId}`);
  }

  const previousBalance = parseFloat(store.storeCredit.toString());
  const newBalance = previousBalance + amount;

  // Update store credit balance
  await prisma.store.update({
    where: { id: storeId },
    data: { storeCredit: newBalance },
  });

  // Create credit transaction record
  await prisma.storeCreditTransaction.create({
    data: {
      storeId,
      amount,
      type: 'commission',
      reason: `Commission earned from retail customer purchase (Conversion #${conversionId})`,
      balance: newBalance,
    },
  });

  console.log(`💰 Store credit applied to ${storeName}:`);
  console.log(`   Previous balance: $${previousBalance.toFixed(2)}`);
  console.log(`   Commission earned: $${amount.toFixed(2)}`);
  console.log(`   New balance: $${newBalance.toFixed(2)}`);
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
