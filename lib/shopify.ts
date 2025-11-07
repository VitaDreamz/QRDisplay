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
  }
) {
  try {
    const restClient = await getShopifyRestClient(org);

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
            tags: `qrdisplay,store:${customer.storeId},member:${customer.memberId}`,
            note: `QRDisplay Member: ${customer.memberId} | Store: ${customer.storeId}`,
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
            tags: `qrdisplay,store:${customer.storeId},member:${customer.memberId}`,
            note: `QRDisplay Member: ${customer.memberId} | Store: ${customer.storeId}`,
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
