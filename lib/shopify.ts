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
    stage?: 'requested' | 'redeemed' | 'purchase-intent' | 'converted-instore' | 'converted-online'; // Customer journey stage
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
    } else if (customer.stage === 'converted-instore') {
      tags.push('Converted-Customer-InStore');
    } else if (customer.stage === 'converted-online') {
      tags.push('Converted-Customer-Online');
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
 * Stores events in BOTH metafields (for querying) and notes (for visibility)
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
    const restClient = await getShopifyRestClient(org);
    const timestamp = (event.occurredAt || new Date()).toISOString();
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Get current customer data
    const customerResponse = await restClient.get({
      path: `customers/${shopifyCustomerId}`,
    });
    const customer = (customerResponse.body as any).customer;
    
    // 1. UPDATE NOTES (visible at top of customer page)
    const currentNote = customer.note || '';
    const newNoteLine = `[${formattedDate}] ${event.message}`;
    const updatedNote = currentNote ? `${currentNote}\n${newNoteLine}` : newNoteLine;
    
    await restClient.put({
      path: `customers/${shopifyCustomerId}`,
      data: {
        customer: {
          id: shopifyCustomerId,
          note: updatedNote.trim(),
        },
      },
    });
    
    // 2. UPDATE METAFIELDS (for structured querying)
    const metafieldsResponse = await restClient.get({
      path: `customers/${shopifyCustomerId}/metafields`,
    });
    
    const metafields = (metafieldsResponse.body as any).metafields || [];
    const eventsMetafield = metafields.find((m: any) => m.namespace === 'qrdisplay' && m.key === 'events');
    
    let events: Array<{ timestamp: string; message: string }> = [];
    if (eventsMetafield?.value) {
      try {
        events = JSON.parse(eventsMetafield.value);
      } catch (e) {
        console.warn('Failed to parse existing events:', e);
      }
    }
    
    // Add new event
    events.push({
      timestamp,
      message: event.message,
    });
    
    // Keep last 50 events to avoid metafield size limits
    if (events.length > 50) {
      events = events.slice(-50);
    }
    
    // Update or create metafield
    if (eventsMetafield) {
      await restClient.put({
        path: `customers/${shopifyCustomerId}/metafields/${eventsMetafield.id}`,
        data: {
          metafield: {
            id: eventsMetafield.id,
            value: JSON.stringify(events),
            type: 'json',
          },
        },
      });
    } else {
      await restClient.post({
        path: `customers/${shopifyCustomerId}/metafields`,
        data: {
          metafield: {
            namespace: 'qrdisplay',
            key: 'events',
            value: JSON.stringify(events),
            type: 'json',
          },
        },
      });
    }

    console.log(`✅ Added event for customer ${shopifyCustomerId}: ${event.message}`);
    
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
  newStage: 'requested' | 'redeemed' | 'purchase-intent' | 'converted-instore' | 'converted-online'
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
    const stageTagsToRemove = ['Sample-Requested', 'Sample-Redeemed', 'Purchase-Intent', 'Converted-Customer-InStore', 'Converted-Customer-Online'];
    const filteredTags = currentTags.filter((tag: string) => !stageTagsToRemove.includes(tag));
    
    // Add new stage tag
    const newStageTag = 
      newStage === 'requested' ? 'Sample-Requested' :
      newStage === 'redeemed' ? 'Sample-Redeemed' :
      newStage === 'purchase-intent' ? 'Purchase-Intent' :
      newStage === 'converted-instore' ? 'Converted-Customer-InStore' :
      'Converted-Customer-Online';
    
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
