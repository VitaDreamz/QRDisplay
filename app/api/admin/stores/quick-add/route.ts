import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTierConfig } from '@/lib/subscription-tiers';
import { applyWholesaleToStoreInventory } from '@/lib/inventory-conversion';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

const SHOPIFY_STORE = process.env.SHOPIFY_STORE!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

interface InventoryEntry {
  productSku: string;
  quantity: number;
}

interface TrialKitItem {
  productSku: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shopifyCustomerId,
      subscriptionTier,
      inventoryEntries = [],
      trialKitItems = [],
      orgId
    } = body;

    // Validate required fields
    if (!shopifyCustomerId || !subscriptionTier || !orgId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Shopify customer details
    const shopifyResponse = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-01/customers/${shopifyCustomerId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!shopifyResponse.ok) {
      throw new Error('Failed to fetch Shopify customer');
    }

    const { customer } = await shopifyResponse.json();

    // Generate store ID
    const storeCount = await prisma.store.count();
    const storeId = `SID-${String(storeCount + 1).padStart(3, '0')}`;

    // Get tier configuration
    const tierConfig = getTierConfig(subscriptionTier as SubscriptionTier);

    // Create store record
    const store = await prisma.store.create({
      data: {
        id: storeId,
        orgId,
        shopifyCustomerId: customer.id.toString(),
        name: customer.company || `${customer.first_name} ${customer.last_name}`,
        address: customer.default_address ? {
          address1: customer.default_address.address1,
          address2: customer.default_address.address2 || null,
          city: customer.default_address.city,
          state: customer.default_address.province,
          zip: customer.default_address.zip,
          country: customer.default_address.country
        } : {},
        contactName: `${customer.first_name} ${customer.last_name}`,
        contactEmail: customer.email,
        contactPhone: customer.phone || customer.default_address?.phone || '',
        status: 'active',
        subscriptionTier,
        subscriptionStatus: 'active',
        customerSlotsGranted: tierConfig.newCustomersPerBilling,
        samplesPerQuarter: tierConfig.samplesPerQuarter,
        commissionRate: tierConfig.commissionRate,
        promoReimbursementRate: tierConfig.promoReimbursementRate
      }
    });

    // Add manual inventory entries
    if (inventoryEntries.length > 0) {
      for (const entry of inventoryEntries as InventoryEntry[]) {
        if (entry.quantity > 0) {
          await prisma.storeInventory.create({
            data: {
              storeId: store.id,
              productSku: entry.productSku,
              quantityOnHand: entry.quantity,
              quantityReserved: 0,
              quantityAvailable: entry.quantity
            }
          });

          // Create transaction record
          await prisma.inventoryTransaction.create({
            data: {
              storeId: store.id,
              productSku: entry.productSku,
              type: 'initial_stock',
              quantity: entry.quantity,
              balanceAfter: entry.quantity,
              notes: 'Initial inventory entry during store setup'
            }
          });
        }
      }
    }

    // Process trial kit items (wholesale boxes -> retail inventory)
    if (trialKitItems.length > 0) {
      const wholesaleItems = (trialKitItems as TrialKitItem[]).map(item => ({
        sku: item.productSku,
        quantity: item.quantity
      }));

      const conversionResult = await applyWholesaleToStoreInventory(
        store.id,
        wholesaleItems,
        orgId,
        'trial_kit',
        'Trial kit order - wholesale boxes converted to retail inventory'
      );

      if (!conversionResult.success) {
        console.error('Inventory conversion errors:', conversionResult.errors);
        // Note: We don't fail the entire operation if inventory conversion has issues
        // The store is still created successfully
      }

      // Create draft order in Shopify for the trial kit
      try {
        const lineItems = trialKitItems.map((item: TrialKitItem) => ({
          variant_id: null, // Will need to look up variant ID
          quantity: item.quantity,
          sku: item.productSku
        }));

        const draftOrderResponse = await fetch(
          `https://${SHOPIFY_STORE}/admin/api/2024-01/draft_orders.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              draft_order: {
                customer: { id: customer.id },
                line_items: lineItems,
                note: `Trial kit order for ${store.name} (${store.id})`,
                tags: 'trial-kit, qrdisplay'
              }
            })
          }
        );

        if (draftOrderResponse.ok) {
          const { draft_order } = await draftOrderResponse.json();
          console.log(`Created draft order ${draft_order.id} for trial kit`);
        }
      } catch (error) {
        console.error('Failed to create draft order:', error);
        // Don't fail the store creation if draft order fails
      }
    }

    return NextResponse.json({
      success: true,
      storeId: store.id,
      storeName: store.name,
      subscriptionTier: store.subscriptionTier,
      inventoryAdded: inventoryEntries.length + trialKitItems.length
    });

  } catch (error) {
    console.error('Error creating store:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create store' },
      { status: 500 }
    );
  }
}
