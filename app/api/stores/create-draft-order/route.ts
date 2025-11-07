import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopifyClient } from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storeName, boxQuantities, notes, storeCredit, contactName, contactEmail, contactPhone } = body;

    console.log('🛍️ [Draft Order] Creating draft order for store:', storeId);

    if (!storeId || !boxQuantities || Object.keys(boxQuantities).length === 0) {
      return NextResponse.json(
        { error: 'Store ID and at least one product are required' },
        { status: 400 }
      );
    }

    // Filter to only SKUs with quantity > 0
    const orderedSkus = Object.entries(boxQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([sku]) => sku);

    if (orderedSkus.length === 0) {
      return NextResponse.json(
        { error: 'At least one product with quantity > 0 is required' },
        { status: 400 }
      );
    }

    // Get store and organization info
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: { organization: true }
    });

    if (!store || !store.organization) {
      return NextResponse.json(
        { error: 'Store or organization not found' },
        { status: 404 }
      );
    }

    const org = store.organization;

    // Check if Shopify is connected
    if (!org.shopifyStoreName || !org.shopifyAccessToken) {
      return NextResponse.json(
        { error: 'Shopify not connected for this organization' },
        { status: 400 }
      );
    }

    console.log('🛍️ [Draft Order] Shopify connected:', org.shopifyStoreName);

    // Get product details from database
    const products = await prisma.product.findMany({
      where: { sku: { in: orderedSkus } }
    });

    console.log('🛍️ [Draft Order] Products found:', products.length);

    // Get Shopify client
    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    // Build line items for draft order
    const lineItems = products.map(p => {
      const qty = boxQuantities[p.sku] || 0;
      return {
        title: p.name,
        price: Number(p.price).toFixed(2),
        quantity: qty,
        // Add custom attributes for tracking
        properties: [
          { name: 'SKU', value: p.sku },
          { name: 'Units per Box', value: String(p.unitsPerBox || 1) },
          { name: 'Type', value: 'Wholesale Box' }
        ]
      };
    });

    // Calculate subtotal
    const subtotal = products.reduce((sum, p) => {
      const qty = boxQuantities[p.sku] || 0;
      return sum + (Number(p.price) * qty);
    }, 0);

    console.log('🛍️ [Draft Order] Subtotal:', subtotal);
    console.log('🛍️ [Draft Order] Store credit available:', storeCredit);

    // Determine how much credit to apply (up to available balance, but not more than order total)
    const creditToApply = Math.min(Number(storeCredit || 0), subtotal);
    
    console.log('🛍️ [Draft Order] Credit to apply:', creditToApply);

    // Add discount line item if there's credit to apply
    if (creditToApply > 0) {
      lineItems.push({
        title: 'Store Credit Applied',
        price: (-creditToApply).toFixed(2), // Negative amount for discount
        quantity: 1,
        properties: [
          { name: 'Type', value: 'Store Credit Discount' }
        ]
      });
    }

    // Build customer info
    const customer = {
      first_name: contactName?.split(' ')[0] || storeName,
      last_name: contactName?.split(' ').slice(1).join(' ') || '',
      email: contactEmail || store.adminEmail || store.ownerEmail || `${storeId}@placeholder.com`,
    };

    // Build draft order note
    let draftOrderNote = `Wholesale order from ${storeName} (${storeId})`;
    if (notes) {
      draftOrderNote += `\n\nStore Notes: ${notes}`;
    }
    if (creditToApply > 0) {
      draftOrderNote += `\n\nStore Credit Applied: $${creditToApply.toFixed(2)}`;
    }

    console.log('🛍️ [Draft Order] Creating draft order in Shopify...');

    // Create draft order
    const response = await client.post({
      path: 'draft_orders',
      data: {
        draft_order: {
          line_items: lineItems,
          customer,
          note: draftOrderNote,
          email: customer.email,
          shipping_address: store.streetAddress ? {
            address1: store.streetAddress,
            city: store.city,
            province: store.state,
            zip: store.zipCode,
            country: 'US'
          } : undefined,
          billing_address: store.streetAddress ? {
            address1: store.streetAddress,
            city: store.city,
            province: store.state,
            zip: store.zipCode,
            country: 'US'
          } : undefined,
          use_customer_default_address: false,
        }
      }
    });

    const draftOrder = (response.body as any).draft_order;
    
    console.log('✅ [Draft Order] Created successfully:', draftOrder.id);
    console.log('🛍️ [Draft Order] Invoice URL:', draftOrder.invoice_url);

    // If credit was applied, deduct from store balance and create transaction
    if (creditToApply > 0) {
      const currentBalance = Number(store.storeCredit || 0);
      const newBalance = currentBalance - creditToApply;

      await prisma.$transaction([
        // Update store credit balance
        prisma.store.update({
          where: { id: store.id },
          data: { storeCredit: newBalance }
        }),
        // Create transaction record
        prisma.storeCreditTransaction.create({
          data: {
            storeId: store.id,
            amount: -creditToApply,
            type: 'redeemed',
            reason: `Applied to Shopify Draft Order #${draftOrder.name || draftOrder.id}`,
            balance: newBalance,
          }
        })
      ]);

      console.log(`💰 [Draft Order] Deducted $${creditToApply.toFixed(2)} credit. New balance: $${newBalance.toFixed(2)}`);
    }

    // Send invoice email via Shopify
    try {
      await client.post({
        path: `draft_orders/${draftOrder.id}/send_invoice`,
        data: {
          draft_order_invoice: {
            to: customer.email,
            subject: `Invoice for Wholesale Order - ${storeName}`,
            custom_message: creditToApply > 0 
              ? `Your wholesale order is ready! We've applied $${creditToApply.toFixed(2)} in store credit to this order.\n\nClick the link below to review and pay for your order.`
              : `Your wholesale order is ready! Click the link below to review and pay for your order.`
          }
        }
      });
      console.log('📧 [Draft Order] Invoice email sent');
    } catch (emailErr) {
      console.error('⚠️ [Draft Order] Failed to send invoice email:', emailErr);
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({
      success: true,
      draftOrderId: draftOrder.id,
      draftOrderNumber: draftOrder.name,
      invoiceUrl: draftOrder.invoice_url,
      subtotal: Number(draftOrder.subtotal_price).toFixed(2),
      creditApplied: creditToApply.toFixed(2),
      total: Number(draftOrder.total_price).toFixed(2),
    });

  } catch (error: any) {
    console.error('❌ [Draft Order] Error:', error);
    console.error('❌ [Draft Order] Error details:', error.response?.body || error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to create draft order' },
      { status: 500 }
    );
  }
}
