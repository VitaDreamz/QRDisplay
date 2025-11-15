/**
 * Shopify Customer Sync Service
 * 
 * Syncs QRDisplay stores to brand Shopify wholesale customers
 * Search by email → Update if exists → Create if not
 */

import { Store, Organization } from '@prisma/client';
import { getShopifyClient } from './shopify';

interface SyncParams {
  store: Store;
  brand: Organization;
  subscriptionTier: string;
}

interface ShopifyCustomer {
  id: string;
  email: string;
  phone?: string;
  tags?: string;
  note?: string;
}

/**
 * Search for existing Shopify customer by email
 */
async function searchCustomerByEmail(
  email: string,
  brand: Organization
): Promise<ShopifyCustomer | null> {
  try {
    const { shopify, session } = getShopifyClient(brand);
    const client = new shopify.clients.Rest({ session });

    // Search for customer by email using Shopify REST API
    const response = await client.get({
      path: 'customers/search',
      query: { query: `email:${email}`, limit: '1' },
    });

    const customers = (response.body as any).customers as ShopifyCustomer[];
    
    if (customers && customers.length > 0) {
      console.log(`✅ Found existing customer in ${brand.name}: ${customers[0].email}`);
      return customers[0];
    }
    
    console.log(`ℹ️ No existing customer found in ${brand.name} with email: ${email}`);
    return null;
  } catch (error) {
    console.error(`Error searching Shopify customer for ${brand.name}:`, error);
    return null;
  }
}

/**
 * Create new Shopify wholesale customer
 */
async function createShopifyCustomer(
  params: SyncParams
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  const { store, brand, subscriptionTier } = params;

  try {
    const { shopify, session } = getShopifyClient(brand);
    const client = new shopify.clients.Rest({ session });

    const tags = [
      'wholesale',
      `tier:${subscriptionTier}`,
      `state:${store.state}`,
      `city:${store.city}`,
      `store:${store.storeId}`,
      'qrdisplay:active',
    ].filter(Boolean).join(', ');

    const customerData = {
      customer: {
        email: store.ownerEmail,
        phone: store.ownerPhone,
        first_name: store.ownerName?.split(' ')[0] || store.storeName,
        last_name: store.ownerName?.split(' ').slice(1).join(' ') || '',
        tags,
        note: `QRDisplay Store: ${store.storeId}\nBusiness: ${store.storeName}\nCity: ${store.city}, ${store.state}\nTier: ${subscriptionTier}\nCreated: ${new Date().toISOString()}`,
        tax_exempt: true,
        metafields: [
          {
            namespace: 'qrdisplay',
            key: 'store_id',
            value: store.storeId,
            type: 'single_line_text_field',
          },
          {
            namespace: 'qrdisplay',
            key: 'subscription_tier',
            value: subscriptionTier,
            type: 'single_line_text_field',
          },
          {
            namespace: 'qrdisplay',
            key: 'last_sync',
            value: new Date().toISOString(),
            type: 'single_line_text_field',
          },
        ],
      },
    };

    const response = await client.post({
      path: 'customers',
      data: customerData,
    });

    console.log(`✅ Created Shopify customer for ${store.storeName} in ${brand.name}`);
    return {
      success: true,
      customerId: response.body.customer.id,
    };
  } catch (error: any) {
    console.error(`❌ Failed to create Shopify customer in ${brand.name}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update existing Shopify wholesale customer
 */
async function updateShopifyCustomer(
  params: SyncParams & { customerId: string }
): Promise<{ success: boolean; error?: string }> {
  const { store, brand, subscriptionTier, customerId } = params;

  try {
    const { shopify, session } = getShopifyClient(brand);
    const client = new shopify.clients.Rest({ session });

    // Get existing customer to merge tags
    const existingResponse = await client.get({
      path: `customers/${customerId}`,
    });
    const existingCustomer = existingResponse.body.customer as ShopifyCustomer;
    const existingTags = existingCustomer.tags ? existingCustomer.tags.split(', ') : [];

    // New tags to add
    const newTags = [
      'wholesale',
      `tier:${subscriptionTier}`,
      `state:${store.state}`,
      `city:${store.city}`,
      `store:${store.storeId}`,
      'qrdisplay:active',
    ];

    // Merge tags (remove old tier/state/city/store tags, add new ones)
    const filteredTags = existingTags.filter(
      (tag) =>
        !tag.startsWith('tier:') &&
        !tag.startsWith('state:') &&
        !tag.startsWith('city:') &&
        !tag.startsWith('store:') &&
        !tag.startsWith('qrdisplay:')
    );
    const mergedTags = [...new Set([...filteredTags, ...newTags])].join(', ');

    const updateData = {
      customer: {
        id: customerId,
        tags: mergedTags,
        note: `${existingCustomer.note || ''}\n\n[QRDisplay Update ${new Date().toISOString()}]\nStore: ${store.storeId} | ${store.storeName}\nTier: ${subscriptionTier} | Location: ${store.city}, ${store.state}`,
        metafields: [
          {
            namespace: 'qrdisplay',
            key: 'store_id',
            value: store.storeId,
            type: 'single_line_text_field',
          },
          {
            namespace: 'qrdisplay',
            key: 'subscription_tier',
            value: subscriptionTier,
            type: 'single_line_text_field',
          },
          {
            namespace: 'qrdisplay',
            key: 'last_sync',
            value: new Date().toISOString(),
            type: 'single_line_text_field',
          },
        ],
      },
    };

    await client.put({
      path: `customers/${customerId}`,
      data: updateData,
    });

    console.log(`✅ Updated Shopify customer for ${store.storeName} in ${brand.name}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Failed to update Shopify customer in ${brand.name}:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main sync function: Search → Update or Create
 */
export async function syncStoreToShopify(
  params: SyncParams
): Promise<{ success: boolean; action: 'created' | 'updated' | 'skipped'; error?: string }> {
  const { store, brand, subscriptionTier } = params;

  // Skip if no email
  if (!store.ownerEmail) {
    console.warn(`⚠️ Store ${store.storeId} has no email - skipping Shopify sync for ${brand.name}`);
    return { success: false, action: 'skipped', error: 'No email address' };
  }

  // Skip if brand doesn't have Shopify configured
  if (!brand.shopifyStoreName || !brand.shopifyAccessToken) {
    console.warn(`⚠️ Brand ${brand.name} has no Shopify configured - skipping sync`);
    return { success: false, action: 'skipped', error: 'Shopify not configured' };
  }

  try {
    // Search for existing customer
    const existingCustomer = await searchCustomerByEmail(store.ownerEmail, brand);

    if (existingCustomer) {
      // Update existing customer
      const result = await updateShopifyCustomer({
        ...params,
        customerId: existingCustomer.id,
      });
      return {
        success: result.success,
        action: 'updated',
        error: result.error,
      };
    } else {
      // Create new customer
      const result = await createShopifyCustomer(params);
      return {
        success: result.success,
        action: 'created',
        error: result.error,
      };
    }
  } catch (error: any) {
    console.error(`❌ Shopify sync failed for ${store.storeId} → ${brand.name}:`, error);
    return {
      success: false,
      action: 'skipped',
      error: error.message,
    };
  }
}

/**
 * Sync store to all brand partnerships
 */
export async function syncStoreToAllBrands(
  store: Store,
  brandIds: string[],
  subscriptionTier: string
): Promise<{
  total: number;
  created: number;
  updated: number;
  failed: number;
  results: Array<{ brandName: string; action: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ brandName: string; action: string; success: boolean; error?: string }> = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  // Get brand organizations
  const prisma = (await import('./prisma')).default;
  const brands = await prisma.organization.findMany({
    where: { id: { in: brandIds } },
  });

  console.log(`\n🔄 Syncing store ${store.storeId} to ${brands.length} brand(s)...`);

  // Sync to each brand sequentially (to avoid rate limits)
  for (const brand of brands) {
    const result = await syncStoreToShopify({ store, brand, subscriptionTier });
    
    results.push({
      brandName: brand.name,
      action: result.action,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      if (result.action === 'created') created++;
      if (result.action === 'updated') updated++;
    } else {
      failed++;
    }

    // Rate limiting: wait 500ms between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Shopify sync complete: ${created} created, ${updated} updated, ${failed} failed\n`);

  return {
    total: brands.length,
    created,
    updated,
    failed,
    results,
  };
}
