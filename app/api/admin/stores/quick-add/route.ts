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
    // Note: In Shopify, wholesale customers have:
    // - First Name = Business Name (e.g., "ABC Liquor Store")
    // - Last Name = "Wholesale"
    // - We only pull business info from Shopify, contact people entered manually
    const store = await prisma.store.create({
      data: {
        storeId,
        orgId,
        shopifyCustomerId: customer.id.toString(),
        storeName: customer.first_name, // Business name is in firstName
        streetAddress: customer.default_address?.address1 || null,
        address2: customer.default_address?.address2 || null,
        city: customer.default_address?.city || null,
        state: customer.default_address?.province || null,
        zipCode: customer.default_address?.zip || null,
        // Owner, admin, purchasing manager info entered manually during onboarding
        // Business contact info (if available from Shopify)
        ownerEmail: customer.email || null,
        ownerPhone: customer.phone || customer.default_address?.phone || null,
        status: 'active',
        subscriptionTier,
        subscriptionStatus: 'active',
        customerSlotsGranted: tierConfig.features.newCustomersPerBilling,
        samplesPerQuarter: tierConfig.features.samplesPerQuarter,
        commissionRate: tierConfig.features.commissionRate,
        promoReimbursementRate: tierConfig.features.promoReimbursementRate
      }
    });

    // Get organization's Shopify credentials for API calls
    const org = await prisma.organization.findUnique({
      where: { orgId },
      select: {
        shopifyStoreName: true,
        shopifyAccessToken: true
      }
    });

    if (!org?.shopifyStoreName || !org?.shopifyAccessToken) {
      console.error('Shopify not configured for organization');
      // Continue anyway - store is created, just can't tag in Shopify
    } else {
      // Tag the Shopify customer with our storeId
      try {
        const updateResponse = await fetch(
          `https://${org.shopifyStoreName}/admin/api/2024-01/customers/${shopifyCustomerId}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': org.shopifyAccessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customer: {
                id: shopifyCustomerId,
                metafields: [
                  {
                    namespace: 'qrdisplay',
                    key: 'store_id',
                    value: storeId,
                    type: 'single_line_text_field'
                  },
                  {
                    namespace: 'qrdisplay',
                    key: 'subscription_tier',
                    value: subscriptionTier,
                    type: 'single_line_text_field'
                  }
                ]
              }
            })
          }
        );

        if (updateResponse.ok) {
          console.log(`✅ Tagged Shopify customer ${shopifyCustomerId} with storeId: ${storeId}`);
        } else {
          const errorText = await updateResponse.text();
          console.error('Failed to tag Shopify customer:', updateResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error tagging Shopify customer:', error);
        // Don't fail the whole operation - store is created successfully
      }
    }

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
                note: `Trial kit order for ${store.storeName} (${store.id})`,
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
      storeName: store.storeName,
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
