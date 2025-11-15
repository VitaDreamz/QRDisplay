/**
 * Shopify Wholesale Customer Sync
 * Creates or updates a Shopify customer account for a store when they partner with a brand
 */

import prisma from './prisma';
import { Organization } from '@prisma/client';
import { getShopifyRestClient } from './shopify';

/**
 * Sync a store as a wholesale customer in a brand's Shopify store
 * Called when:
 * 1. Store is added to a brand partnership (admin adds brand to store)
 * 2. Store adds a brand from in-network brands
 * 3. Brand approves a store partnership request
 */
export async function syncStoreToShopifyWholesale(
  storeId: string,
  brandOrgId: string
) {
  try {
    // Get store details
    const store = await prisma.store.findUnique({
      where: { storeId },
    });

    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    // Get brand organization with Shopify credentials
    const brand = await prisma.organization.findUnique({
      where: { orgId: brandOrgId },
    });

    if (!brand || !brand.shopifyStoreName || !brand.shopifyAccessToken) {
      console.log(`Brand ${brandOrgId} doesn't have Shopify configured - skipping customer sync`);
      return { skipped: true, reason: 'No Shopify connection' };
    }

    // Determine contact email priority: purchasing > admin > owner
    const contactEmail = store.purchasingEmail || store.adminEmail || store.ownerEmail;
    
    if (!contactEmail) {
      throw new Error(`Store ${storeId} has no contact email (owner, admin, or purchasing)`);
    }

    const contactName = store.purchasingManager || store.adminName || store.ownerName || store.storeName;

    // Search for existing customer by email in brand's Shopify
    const restClient = await getShopifyRestClient(brand);
    
    const searchResponse = await restClient.get({
      path: 'customers/search',
      query: { query: `email:${contactEmail}` },
    });

    const existingCustomers = (searchResponse.body as any).customers || [];

    let shopifyCustomerId: string;

    if (existingCustomers.length > 0) {
      // Customer exists - update with store metadata
      const shopifyCustomer = existingCustomers[0];
      shopifyCustomerId = shopifyCustomer.id.toString();

      // Get existing tags and add store-specific tags
      const existingTags = shopifyCustomer.tags ? shopifyCustomer.tags.split(',').map((t: string) => t.trim()) : [];
      const newTags = [
        ...existingTags.filter((t: string) => !t.startsWith('qrdisplay-store:')), // Remove old store tags
        'qrdisplay',
        'wholesale',
        `qrdisplay-store:${store.storeId}`,
      ];

      // Update existing note or create new one
      const storeNote = `QRDisplay Store: ${store.storeId} - ${store.storeName}\nLocation: ${store.city}, ${store.state}\nContact: ${contactName} | ${contactEmail}`;
      const existingNote = shopifyCustomer.note || '';
      const updatedNote = existingNote.includes('QRDisplay Store:') 
        ? existingNote.replace(/QRDisplay Store:[\s\S]*?(?=\n\n|$)/, storeNote)
        : `${existingNote}\n\n${storeNote}`.trim();

      await restClient.put({
        path: `customers/${shopifyCustomer.id}`,
        data: {
          customer: {
            id: shopifyCustomer.id,
            tags: newTags.join(','),
            note: updatedNote,
            // Update metafields for better tracking
            metafields: [
              {
                namespace: 'qrdisplay',
                key: 'store_id',
                value: store.storeId,
                type: 'single_line_text_field',
              },
              {
                namespace: 'qrdisplay',
                key: 'store_name',
                value: store.storeName,
                type: 'single_line_text_field',
              },
              {
                namespace: 'qrdisplay',
                key: 'partnership_type',
                value: 'wholesale',
                type: 'single_line_text_field',
              },
            ],
          },
        },
      });

      console.log(`✅ Updated existing Shopify customer ${shopifyCustomerId} for store ${store.storeId} in ${brand.name}`);

      // Update store record with Shopify customer ID
      await prisma.store.update({
        where: { id: store.id },
        data: { shopifyCustomerId },
      });

      return {
        shopifyCustomerId,
        isNew: false,
        customerEmail: contactEmail,
      };
    } else {
      // Create new wholesale customer account
      const [firstName, ...lastNameParts] = contactName.split(' ');
      const lastName = lastNameParts.join(' ') || store.storeName;

      const createResponse = await restClient.post({
        path: 'customers',
        data: {
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: contactEmail,
            phone: store.purchasingPhone || store.adminPhone || store.ownerPhone,
            tags: [
              'qrdisplay',
              'wholesale',
              `qrdisplay-store:${store.storeId}`,
            ].join(','),
            note: `QRDisplay Store: ${store.storeId} - ${store.storeName}\nLocation: ${store.city}, ${store.state}\nContact: ${contactName} | ${contactEmail}\n\nWholesale customer account created via QRDisplay partnership.`,
            accepts_marketing: true,
            tax_exempt: false, // Can be updated if store has tax exemption
            // Add address if available
            addresses: store.streetAddress ? [{
              address1: store.streetAddress,
              address2: store.address2,
              city: store.city,
              province: store.state,
              zip: store.zipCode,
              country: 'US',
              company: store.storeName,
            }] : undefined,
            // Metafields for tracking
            metafields: [
              {
                namespace: 'qrdisplay',
                key: 'store_id',
                value: store.storeId,
                type: 'single_line_text_field',
              },
              {
                namespace: 'qrdisplay',
                key: 'store_name',
                value: store.storeName,
                type: 'single_line_text_field',
              },
              {
                namespace: 'qrdisplay',
                key: 'partnership_type',
                value: 'wholesale',
                type: 'single_line_text_field',
              },
              {
                namespace: 'qrdisplay',
                key: 'partnership_started',
                value: new Date().toISOString(),
                type: 'date',
              },
            ],
          },
        },
      });

      const newCustomer = (createResponse.body as any).customer;
      shopifyCustomerId = newCustomer.id.toString();

      console.log(`✅ Created new Shopify wholesale customer ${shopifyCustomerId} for store ${store.storeId} in ${brand.name}`);

      // Update store record with Shopify customer ID
      await prisma.store.update({
        where: { id: store.id },
        data: { shopifyCustomerId },
      });

      return {
        shopifyCustomerId,
        isNew: true,
        customerEmail: contactEmail,
      };
    }
  } catch (error) {
    console.error(`Error syncing store ${storeId} to Shopify wholesale:`, error);
    throw error;
  }
}

/**
 * Sync store to multiple brands at once
 * Used when creating a new store with multiple brand partnerships
 */
export async function syncStoreToMultipleBrands(
  storeId: string,
  brandOrgIds: string[]
) {
  const results = [];
  
  for (const brandOrgId of brandOrgIds) {
    try {
      const result = await syncStoreToShopifyWholesale(storeId, brandOrgId);
      results.push({
        brandOrgId,
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error(`Failed to sync store ${storeId} to brand ${brandOrgId}:`, error);
      results.push({
        brandOrgId,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}
