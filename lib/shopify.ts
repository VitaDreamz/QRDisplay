/**
 * Multi-tenant Shopify API client
 * Each organization can have their own Shopify store connection
 */

import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { Organization } from '@prisma/client';
import { decryptSafe } from './encryption';
import prisma from './prisma';

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

/**
 * Get a Shopify customer by ID
 */
export async function getShopifyCustomer(org: Organization, shopifyCustomerId: string) {
  try {
    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    const response = await client.get({
      path: `customers/${shopifyCustomerId}`,
    });

    const customer = response.body.customer as any;
    const defaultAddress = customer.default_address;

    return {
      id: customer.id.toString(),
      email: customer.email,
      phone: customer.phone || defaultAddress?.phone,
      firstName: customer.first_name,
      lastName: customer.last_name,
      companyName: defaultAddress?.company,
      tags: customer.tags, // Include customer tags
      // Address fields for pre-filling store location
      address: defaultAddress?.address1,
      address2: defaultAddress?.address2,
      city: defaultAddress?.city,
      province: defaultAddress?.province,
      zip: defaultAddress?.zip,
      country: defaultAddress?.country,
    };
  } catch (error) {
    console.error('Error fetching Shopify customer:', error);
    throw error;
  }
}

/**
 * Search for Shopify customers by email, phone, or business name
 */
export async function searchShopifyCustomers(org: Organization, query: string) {
  try {
    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    const response = await client.get({
      path: `customers/search`,
      query: { query },
    });

    const customers = response.body.customers as any[];
    
    return customers.map((customer) => {
      const defaultAddress = customer.default_address;
      return {
        id: customer.id.toString(),
        email: customer.email,
        phone: customer.phone || defaultAddress?.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        companyName: defaultAddress?.company,
        // Address fields for pre-filling store location
        address: defaultAddress?.address1,
        address2: defaultAddress?.address2,
        city: defaultAddress?.city,
        province: defaultAddress?.province,
        zip: defaultAddress?.zip,
        country: defaultAddress?.country,
      };
    });
  } catch (error) {
    console.error('Error searching Shopify customers:', error);
    return [];
  }
}

/**
 * Add tags to a Shopify customer (for tracking stores and displays)
 */
export async function tagShopifyCustomer(
  org: Organization,
  shopifyCustomerId: string,
  tags: {
    storeId?: string;
    displayId?: string;
    state?: string; // 2-letter state code
    status?: 'active' | 'inactive';
    activatedDate?: string; // YYYY-MM-DD format
  }
) {
  try {
    console.log(`[Shopify Tagging] Starting tag update for customer ${shopifyCustomerId}`);
    console.log(`[Shopify Tagging] Tags to add:`, tags);
    
    const { shopify, session } = getShopifyClient(org);
    const client = new shopify.clients.Rest({ session });

    // Extract numeric ID if it's a GraphQL ID (gid://shopify/Customer/123456)
    let customerId = shopifyCustomerId;
    if (customerId.includes('gid://')) {
      customerId = customerId.split('/').pop() || customerId;
    }
    
    console.log(`[Shopify Tagging] Using customer ID: ${customerId}`);

    // First, get the current customer to retrieve existing tags
    const getResponse = await client.get({
      path: `customers/${customerId}`,
    });

    const customer = getResponse.body.customer as any;
    const existingTags = customer.tags ? customer.tags.split(', ') : [];
    console.log(`[Shopify Tagging] Existing tags:`, existingTags);

    // Build new tags
    const newTags: string[] = [];
    
    if (tags.storeId) {
      newTags.push(`Store:${tags.storeId}`);
    }
    
    if (tags.displayId) {
      newTags.push(`Display:${tags.displayId}`);
    }
    
    if (tags.state) {
      newTags.push(`State:${tags.state}`);
    }
    
    if (tags.status) {
      newTags.push(`Display:${tags.status}`);
    }

    if (tags.activatedDate) {
      newTags.push(`Activated:${tags.activatedDate}`);
    }

    console.log(`[Shopify Tagging] New tags to add:`, newTags);

    // Merge existing tags with new ones (avoid duplicates)
    const allTags = [...new Set([...existingTags, ...newTags])];
    console.log(`[Shopify Tagging] Final tags:`, allTags);

    // Update customer with new tags
    await client.put({
      path: `customers/${customerId}`,
      data: {
        customer: {
          id: customerId,
          tags: allTags.join(', '),
        },
      },
    });

    console.log(`✅ Successfully tagged Shopify customer ${customerId}:`, newTags);
    return allTags;
  } catch (error) {
    console.error('Error tagging Shopify customer:', error);
    throw error;
  }
}

/**
 * Add store credit to a store's balance in QRDisplay
 * This is managed internally, not through Shopify
 */
export async function addStoreCredit(
  storeId: string,
  amount: number,
  reason: string,
  displayId?: string
) {
  try {
    console.log(`💰 Adding $${amount} credit to store ${storeId} - ${reason}`);
    
    // Get current store balance
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true, storeCredit: true },
    });

    if (!store) {
      throw new Error(`Store ${storeId} not found`);
    }

    // Calculate new balance
    const currentBalance = store.storeCredit || 0;
    const newBalance = Number(currentBalance) + amount;

    // Create transaction record and update store balance in a transaction
    const [transaction] = await prisma.$transaction([
      prisma.storeCreditTransaction.create({
        data: {
          storeId: store.id,
          amount,
          type: 'earned',
          reason,
          displayId,
          balance: newBalance,
        },
      }),
      prisma.store.update({
        where: { id: store.id },
        data: { storeCredit: newBalance },
      }),
    ]);

    console.log(`✅ Successfully added $${amount} credit to store ${storeId}. New balance: $${newBalance.toFixed(2)}`);
    
    return {
      success: true,
      previousBalance: Number(currentBalance),
      amountAdded: amount,
      newBalance,
      transaction,
    };
  } catch (error) {
    console.error('Error adding store credit:', error);
    throw error;
  }
}

/**
 * Create a Draft Order in Shopify for wholesale orders
 */
export async function createShopifyDraftOrder(
  shopifyDomain: string,
  accessToken: string,
  draftOrderData: {
    line_items: Array<{
      variant_id?: string | null;
      title: string;
      quantity: number;
      price: string;
    }>;
    customer?: {
      id?: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    note?: string;
    tags?: string;
    applied_discount?: {
      description: string;
      value_type: 'fixed_amount' | 'percentage';
      value: string;
      amount: string;
    };
    email?: {
      to: string;
      bcc?: string[]; // CC emails (Shopify uses BCC for draft order emails)
      subject?: string;
      custom_message?: string;
    };
  }
) {
  try {
    const url = `https://${shopifyDomain}/admin/api/2024-10/draft_orders.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ draft_order: draftOrderData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify Draft Order Error:', errorText);
      throw new Error(`Failed to create draft order: ${response.statusText}`);
    }

    const result = await response.json();
    const draftOrder = result.draft_order;

    // Send invoice email if email config provided
    if (draftOrderData.email) {
      await sendDraftOrderInvoice(
        shopifyDomain,
        accessToken,
        draftOrder.id,
        draftOrderData.email
      );
    }

    return draftOrder;
  } catch (error) {
    console.error('Error creating Shopify draft order:', error);
    throw error;
  }
}

/**
 * Send draft order invoice email with optional BCC recipients
 */
export async function sendDraftOrderInvoice(
  shopifyDomain: string,
  accessToken: string,
  draftOrderId: string,
  emailConfig: {
    to?: string;
    bcc?: string[];
    subject?: string;
    custom_message?: string;
  }
) {
  try {
    const url = `https://${shopifyDomain}/admin/api/2024-10/draft_orders/${draftOrderId}/send_invoice.json`;
    
    const emailData: any = {};
    
    if (emailConfig.to) {
      emailData.to = emailConfig.to;
    }
    if (emailConfig.bcc && emailConfig.bcc.length > 0) {
      emailData.bcc = emailConfig.bcc;
    }
    if (emailConfig.subject) {
      emailData.subject = emailConfig.subject;
    }
    if (emailConfig.custom_message) {
      emailData.custom_message = emailConfig.custom_message;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ draft_order_invoice: emailData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify Send Invoice Error:', errorText);
      throw new Error(`Failed to send draft order invoice: ${response.statusText}`);
    }

    const result = await response.json();
    return result.draft_order_invoice;
  } catch (error) {
    console.error('Error sending draft order invoice:', error);
    throw error;
  }
}

