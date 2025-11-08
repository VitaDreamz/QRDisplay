import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getTierConfig } from '@/lib/subscription-tiers';
import { applyWholesaleToStoreInventory } from '@/lib/inventory-conversion';
import { decryptSafe } from '@/lib/encryption';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

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
      businessName,
      streetAddress,
      city,
      state,
      zipCode,
      ownerName,
      ownerPhone,
      ownerEmail,
      adminName,
      adminPhone,
      adminEmail,
      purchasingName,
      purchasingPhone,
      purchasingEmail,
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

    // Validate contact information
    if (!ownerName || !ownerEmail) {
      return NextResponse.json(
        { error: 'Owner name and email are required' },
        { status: 400 }
      );
    }

    if (!adminName || !adminEmail) {
      return NextResponse.json(
        { error: 'Program admin name and email are required' },
        { status: 400 }
      );
    }

    // Get organization's Shopify credentials
    const org = await prisma.organization.findUnique({
      where: { orgId },
      select: {
        shopifyStoreName: true,
        shopifyAccessToken: true
      }
    });

    // Decrypt credentials (store name is plain text, access token is encrypted)
    const shopifyStore = org?.shopifyStoreName || process.env.SHOPIFY_STORE;
    const shopifyToken = org?.shopifyAccessToken 
      ? decryptSafe(org.shopifyAccessToken) 
      : process.env.SHOPIFY_ACCESS_TOKEN;

    if (!shopifyStore || !shopifyToken) {
      return NextResponse.json(
        { error: 'Shopify not configured for this organization' },
        { status: 400 }
      );
    }

    // Get Shopify customer details
    const shopifyResponse = await fetch(
      `https://${shopifyStore}/admin/api/2024-01/customers/${shopifyCustomerId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
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
        storeId,
        orgId,
        shopifyCustomerId: customer.id.toString(),
        storeName: businessName || customer.first_name,
        streetAddress: streetAddress || customer.default_address?.address1 || null,
        address2: customer.default_address?.address2 || null,
        city: city || customer.default_address?.city || null,
        state: state || customer.default_address?.province || null,
        zipCode: zipCode || customer.default_address?.zip || null,
        // Owner contact
        ownerName,
        ownerPhone: ownerPhone || null,
        ownerEmail,
        // Program administrator
        adminName,
        adminPhone: adminPhone || null,
        adminEmail,
        // Purchasing manager (optional)
        purchasingManager: purchasingName || null,
        purchasingPhone: purchasingPhone || null,
        purchasingEmail: purchasingEmail || null,
        status: 'active',
        subscriptionTier,
        subscriptionStatus: 'active',
        customerSlotsGranted: tierConfig.features.newCustomersPerBilling,
        samplesPerQuarter: tierConfig.features.samplesPerQuarter,
        commissionRate: tierConfig.features.commissionRate,
        promoReimbursementRate: tierConfig.features.promoReimbursementRate
      }
    });

    // Tag the Shopify customer with our storeId
    try {
      const updateResponse = await fetch(
        `https://${shopifyStore}/admin/api/2024-01/customers/${shopifyCustomerId}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
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
          `https://${shopifyStore}/admin/api/2024-01/draft_orders.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
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
      storeId: store.storeId,  // Human-readable ID like "SID-001"
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
