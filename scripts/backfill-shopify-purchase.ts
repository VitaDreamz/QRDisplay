/**
 * Backfill Shopify note for existing purchase
 * Run with: npx tsx scripts/backfill-shopify-purchase.ts MEM-024
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { addCustomerTimelineEvent, updateCustomerStage } from '../lib/shopify';

// Load .env.local
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function backfillPurchase(memberId: string) {
  try {
    console.log(`🔍 Looking up customer ${memberId}...`);
    
    const customer = await prisma.customer.findUnique({
      where: { memberId }
    });

    if (!customer) {
      console.error('❌ Customer not found');
      return;
    }

    if (!(customer as any).shopifyCustomerId) {
      console.error('❌ Customer not synced to Shopify');
      return;
    }

    console.log(`✅ Found customer: ${customer.firstName} ${customer.lastName}`);

    // Get purchase intent
    const purchaseIntent = await prisma.purchaseIntent.findFirst({
      where: {
        customerId: customer.id,
        status: 'fulfilled'
      },
      orderBy: { fulfilledAt: 'desc' }
    });

    if (!purchaseIntent) {
      console.error('❌ No fulfilled purchase intent found');
      return;
    }

    // Get related product and store
    const product = await prisma.product.findUnique({
      where: { sku: purchaseIntent.productSku }
    });

    const store = await prisma.store.findUnique({
      where: { id: purchaseIntent.storeId }
    });

    console.log(`✅ Found purchase: ${product?.name} at ${store?.storeName}`);

    // Get organization
    const org = await prisma.organization.findUnique({
      where: { orgId: customer.orgId }
    });

    if (!org || !(org as any).shopifyActive) {
      console.error('❌ Organization not connected to Shopify');
      return;
    }

    console.log(`✅ Organization: ${org.name}`);

    // Update Shopify
    const shopifyCustomerId = (customer as any).shopifyCustomerId;

    console.log('📝 Updating Shopify stage to Converted-Customer-InStore...');
    await updateCustomerStage(org, shopifyCustomerId, 'converted-instore');

    // Build timeline message
    let message = `Purchased In-Store: ${product?.name || purchaseIntent.productSku}`;
    message += ` ($${purchaseIntent.finalPrice.toFixed(2)})`;
    if (purchaseIntent.discountPercent > 0) {
      const savings = Number(purchaseIntent.originalPrice) - Number(purchaseIntent.finalPrice);
      message += ` - saved $${savings.toFixed(2)} (${purchaseIntent.discountPercent}% off)`;
    }
    message += ` at ${store?.storeName}`;

    console.log('📝 Adding timeline event...');
    console.log(`   Message: ${message}`);
    
    await addCustomerTimelineEvent(org, shopifyCustomerId, {
      message,
      occurredAt: purchaseIntent.fulfilledAt || new Date(),
    });

    console.log('✅ Shopify updated successfully!');
    console.log('\n🎉 Done! Check the customer in Shopify to see the updated note and tag.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get member ID from command line
const memberId = process.argv[2];

if (!memberId) {
  console.error('Usage: npx tsx scripts/backfill-shopify-purchase.ts MEM-XXX');
  process.exit(1);
}

backfillPurchase(memberId);
