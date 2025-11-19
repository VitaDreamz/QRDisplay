import { PrismaClient } from '@prisma/client';
import '@shopify/shopify-api/adapters/node';
import { shopifyApi, ApiVersion } from '@shopify/shopify-api';

const prisma = new PrismaClient();

async function listWebhooks() {
  const org = await prisma.organization.findFirst({
    where: { shopifyStoreName: 'vitadreamz.myshopify.com' },
  });

  if (!org || !org.shopifyAccessToken) {
    console.log('❌ No org or access token found');
    return;
  }

  console.log(`📍 Checking webhooks for ${org.shopifyStoreName}`);

  const shopify = shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: ['read_orders', 'write_orders'],
    hostName: org.shopifyStoreName.replace('.myshopify.com', ''),
    apiVersion: ApiVersion.October24,
    isEmbeddedApp: false,
  });

  const session = {
    id: `offline_${org.shopifyStoreName}`,
    shop: org.shopifyStoreName,
    state: 'active',
    isOnline: false,
    accessToken: org.shopifyAccessToken,
  };

  const client = new shopify.clients.Rest({ session: session as any });

  try {
    const response = await client.get({
      path: 'webhooks',
    });

    const webhooks = (response.body as any).webhooks || [];
    
    console.log(`\n✅ Found ${webhooks.length} registered webhooks:\n`);
    
    webhooks.forEach((webhook: any) => {
      console.log(`📨 ${webhook.topic}`);
      console.log(`   Address: ${webhook.address}`);
      console.log(`   Format: ${webhook.format}`);
      console.log(`   ID: ${webhook.id}`);
      console.log('');
    });

    // Check for our specific webhooks
    const hasOrdersPaid = webhooks.some((w: any) => w.topic === 'orders/paid');
    const hasOrdersFulfilled = webhooks.some((w: any) => w.topic === 'orders/fulfilled');

    console.log('📋 Status:');
    console.log(`   orders/paid: ${hasOrdersPaid ? '✅' : '❌'}`);
    console.log(`   orders/fulfilled: ${hasOrdersFulfilled ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Error fetching webhooks:', error);
  }
}

listWebhooks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
