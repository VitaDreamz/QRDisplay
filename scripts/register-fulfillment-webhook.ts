/**
 * Register fulfillments/create webhook in Shopify
 * This webhook fires when an order is fulfilled/shipped
 */

import prisma from '@/lib/prisma';

async function registerFulfillmentWebhook() {
  try {
    // Get the active organization
    const org = await prisma.organization.findFirst({
      where: { shopifyActive: true },
      select: {
        orgId: true,
        name: true,
        shopifyStoreName: true,
        shopifyAccessToken: true,
      }
    });

    if (!org || !org.shopifyAccessToken) {
      console.error('❌ No active Shopify organization found with access token');
      return;
    }

    console.log(`📊 Organization: ${org.name} (${org.shopifyStoreName})`);

    const shopifyDomain = org.shopifyStoreName;
    const accessToken = org.shopifyAccessToken;

    // First, list existing webhooks
    console.log('\n📋 Listing existing webhooks...');
    const listResponse = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/webhooks.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Failed to list webhooks: ${listResponse.statusText}`);
    }

    const existingWebhooks = await listResponse.json();
    console.log(`Found ${existingWebhooks.webhooks?.length || 0} existing webhooks:`);
    existingWebhooks.webhooks?.forEach((wh: any) => {
      console.log(`  - ${wh.topic} → ${wh.address}`);
    });

    // Check if fulfillments/create already exists
    const fulfillmentWebhook = existingWebhooks.webhooks?.find(
      (wh: any) => wh.topic === 'fulfillments/create'
    );

    if (fulfillmentWebhook) {
      console.log('\n✅ fulfillments/create webhook already registered');
      console.log(`   Address: ${fulfillmentWebhook.address}`);
      return;
    }

    // Register the webhook
    console.log('\n📝 Registering fulfillments/create webhook...');
    
    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/fulfillment/create`
      : 'https://qrdisplay.vercel.app/api/webhooks/shopify/fulfillment/create';

    console.log(`   URL: ${webhookUrl}`);

    const registerResponse = await fetch(
      `https://${shopifyDomain}/admin/api/2024-10/webhooks.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            topic: 'fulfillments/create',
            address: webhookUrl,
            format: 'json',
          },
        }),
      }
    );

    if (!registerResponse.ok) {
      const errorData = await registerResponse.text();
      throw new Error(`Failed to register webhook: ${registerResponse.statusText} - ${errorData}`);
    }

    const result = await registerResponse.json();
    console.log('✅ Webhook registered successfully!');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

registerFulfillmentWebhook();
