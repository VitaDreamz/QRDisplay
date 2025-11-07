/**
 * Multi-tenant Shopify API client
 * Each organization can have their own Shopify store connection
 */

import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { Organization } from '@prisma/client';
import { decryptSafe } from './encryption';

/**
 * Initialize Shopify API client for a specific organization
 */
export function getShopifyClient(org: Organization) {
  // Decrypt credentials
  const accessToken = decryptSafe(org.shopifyAccessToken);
  const apiKey = decryptSafe(org.shopifyApiKey);
  const apiSecret = decryptSafe(org.shopifyApiSecret);

  if (!org.shopifyStoreName || !accessToken) {
    throw new Error(`Shopify not connected for organization ${org.orgId}`);
  }

  // Initialize Shopify client
  const shopify = shopifyApi({
    apiKey: apiKey || 'placeholder', // For private apps, these can be placeholder
    apiSecretKey: apiSecret || 'placeholder',
    scopes: ['read_products', 'write_customers', 'read_customers', 'read_orders'],
    hostName: org.shopifyStoreName,
    apiVersion: ApiVersion.October24,
    isEmbeddedApp: false,
    isCustomStoreApp: true, // We're using private apps
    adminApiAccessToken: accessToken, // Private app access token
  });

  // Create session with access token
  const session = new Session({
    id: `offline_${org.shopifyStoreName}`,
    shop: org.shopifyStoreName,
    state: 'offline',
    isOnline: false,
    accessToken: accessToken,
  });

  return { shopify, session };
}

/**
 * Get Shopify REST client for making API calls
 */
export async function getShopifyRestClient(org: Organization) {
  const { shopify, session } = getShopifyClient(org);
  return new shopify.clients.Rest({ session });
}

/**
 * Get Shopify GraphQL client for making API calls
 */
export async function getShopifyGraphQLClient(org: Organization) {
  const { shopify, session } = getShopifyClient(org);
  return new shopify.clients.Graphql({ session });
}

/**
 * Verify webhook signature from Shopify
 */
export function verifyShopifyWebhook(
  body: string,
  hmacHeader: string,
  webhookSecret: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', webhookSecret)
    .update(body, 'utf8')
    .digest('base64');
  
  return hash === hmacHeader;
}

/**
 * Sync a customer to Shopify (create or update)
 */
export async function syncCustomerToShopify(
  org: Organization,
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string | null;
    storeId: string;
    memberId: string;
    sampleProduct?: string; // e.g., "Slumber Berry 4ct"
    stage?: 'requested' | 'redeemed' | 'purchase-intent' | 'converted'; // Customer journey stage
  }
) {
  try {
    const restClient = await getShopifyRestClient(org);

    // Build tags array
    const tags = [
      'qrdisplay',
      `store:${customer.storeId}`,
      `member:${customer.memberId}`,
      'In-Store Sample',
    ];
    
    // Add stage-based tag
    if (customer.stage === 'requested') {
      tags.push('Sample-Requested');
    } else if (customer.stage === 'redeemed') {
      tags.push('Sample-Redeemed');
    } else if (customer.stage === 'purchase-intent') {
      tags.push('Purchase-Intent');
    } else if (customer.stage === 'converted') {
      tags.push('Converted-Customer');
    }
    
    // Add product-specific tag if provided
    if (customer.sampleProduct) {
      tags.push(customer.sampleProduct);
    }
    
    const tagsString = tags.join(',');

    // Search for existing customer by phone
    const searchResponse = await restClient.get({
      path: 'customers/search',
      query: { query: `phone:${customer.phone}` },
    });

    const existingCustomers = (searchResponse.body as any).customers || [];

    if (existingCustomers.length > 0) {
      // Customer exists - update with tags
      const shopifyCustomer = existingCustomers[0];
      
      await restClient.put({
        path: `customers/${shopifyCustomer.id}`,
        data: {
          customer: {
            id: shopifyCustomer.id,
            tags: tagsString,
            note: `QRDisplay Member: ${customer.memberId} | Store: ${customer.storeId}${customer.sampleProduct ? ` | Sample: ${customer.sampleProduct}` : ''}`,
          },
        },
      });

      return {
        shopifyCustomerId: shopifyCustomer.id.toString(),
        isNew: false,
      };
    } else {
      // Create new customer
      const createResponse = await restClient.post({
        path: 'customers',
        data: {
          customer: {
            first_name: customer.firstName,
            last_name: customer.lastName,
            phone: customer.phone,
            email: customer.email || undefined,
            tags: tagsString,
            note: `QRDisplay Member: ${customer.memberId} | Store: ${customer.storeId}${customer.sampleProduct ? ` | Sample: ${customer.sampleProduct}` : ''}`,
            accepts_marketing: true,
            accepts_marketing_updated_at: new Date().toISOString(),
          },
        },
      });

      const newCustomer = (createResponse.body as any).customer;
      
      return {
        shopifyCustomerId: newCustomer.id.toString(),
        isNew: true,
      };
    }
  } catch (error) {
    console.error('Error syncing customer to Shopify:', error);
    throw error;
  }
}

/**
 * Add a timeline event to a customer's profile in Shopify
 */
export async function addCustomerTimelineEvent(
  org: Organization,
  shopifyCustomerId: string,
  event: {
    message: string;
    occurredAt?: Date;
  }
) {
  try {
    const graphqlClient = await getShopifyGraphQLClient(org);

    const mutation = `
      mutation customerSMSMarketingConsentUpdate($input: CustomerSmsMarketingConsentUpdateInput!) {
        customerSmsMarketingConsentUpdate(input: $input) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Note: Shopify's timeline events via API are limited
    // We'll use metafields instead to store custom events that can be displayed
    const metafieldMutation = `
      mutation createCustomerMetafield($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // For now, we'll add events as customer notes/tags
    // A more robust solution would use a custom app with timeline access
    const restClient = await getShopifyRestClient(org);
    
    // Get current customer
    const customerResponse = await restClient.get({
      path: `customers/${shopifyCustomerId}`,
    });
    
    const customer = (customerResponse.body as any).customer;
    const currentNote = customer.note || '';
    const timestamp = (event.occurredAt || new Date()).toISOString();
    const newNote = `${currentNote}\n[${timestamp}] ${event.message}`;
    
    // Update customer note with event
    await restClient.put({
      path: `customers/${shopifyCustomerId}`,
      data: {
        customer: {
          id: shopifyCustomerId,
          note: newNote.trim(),
        },
      },
    });

    console.log(`✅ Added timeline event for customer ${shopifyCustomerId}: ${event.message}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error adding customer timeline event:', error);
    throw error;
  }
}

/**
 * Update customer stage tags in Shopify
 * This adds new stage tags while preserving existing tags
 */
export async function updateCustomerStage(
  org: Organization,
  shopifyCustomerId: string,
  newStage: 'requested' | 'redeemed' | 'purchase-intent' | 'converted'
) {
  try {
    const restClient = await getShopifyRestClient(org);
    
    // Get current customer
    const customerResponse = await restClient.get({
      path: `customers/${shopifyCustomerId}`,
    });
    
    const customer = (customerResponse.body as any).customer;
    const currentTags = customer.tags ? customer.tags.split(',').map((t: string) => t.trim()) : [];
    
    // Remove old stage tags
    const stageTagsToRemove = ['Sample-Requested', 'Sample-Redeemed', 'Purchase-Intent', 'Converted-Customer'];
    const filteredTags = currentTags.filter((tag: string) => !stageTagsToRemove.includes(tag));
    
    // Add new stage tag
    const newStageTag = 
      newStage === 'requested' ? 'Sample-Requested' :
      newStage === 'redeemed' ? 'Sample-Redeemed' :
      newStage === 'purchase-intent' ? 'Purchase-Intent' :
      'Converted-Customer';
    
    filteredTags.push(newStageTag);
    
    // Update customer with new tags
    await restClient.put({
      path: `customers/${shopifyCustomerId}`,
      data: {
        customer: {
          id: shopifyCustomerId,
          tags: filteredTags.join(','),
        },
      },
    });
    
    console.log(`✅ Updated customer ${shopifyCustomerId} stage to: ${newStageTag}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating customer stage in Shopify:', error);
    throw error;
  }
}

/**
 * Get order details from Shopify
 */
export async function getShopifyOrder(org: Organization, orderId: string) {
  try {
    const restClient = await getShopifyRestClient(org);
    
    const response = await restClient.get({
      path: `orders/${orderId}`,
    });

    return (response.body as any).order;
  } catch (error) {
    console.error('Error fetching Shopify order:', error);
    throw error;
  }
}
