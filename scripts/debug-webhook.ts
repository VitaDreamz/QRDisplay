/**
 * Debug webhook configuration and recent webhook logs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugWebhook() {
  console.log('🔍 WEBHOOK DEBUGGING REPORT\n');
  console.log('=' .repeat(80));
  
  // 1. Check organization configuration
  console.log('\n1️⃣  ORGANIZATION CONFIGURATION:');
  const org = await prisma.organization.findFirst({
    where: { shopifyActive: true }
  });
  
  if (!org) {
    console.log('❌ No active Shopify organization found!');
    process.exit(1);
  }
  
  console.log(`   Name: ${org.name}`);
  console.log(`   Shopify Store: ${org.shopifyStoreName}`);
  console.log(`   Shopify Active: ${org.shopifyActive}`);
  console.log(`   Has Webhook Secret: ${!!org.shopifyWebhookSecret}`);
  console.log(`   Secret Length: ${org.shopifyWebhookSecret?.length || 0} chars`);
  console.log(`   Commission Rate: ${org.commissionRate}%`);
  console.log(`   Attribution Window: ${org.attributionWindow} days`);
  
  // 2. Check recent webhook logs
  console.log('\n2️⃣  RECENT WEBHOOK LOGS (Last 10):');
  const logs = await prisma.shopifyWebhookLog.findMany({
    where: { orgId: org.id },
    orderBy: { processedAt: 'desc' },
    take: 10,
  });
  
  if (logs.length === 0) {
    console.log('   ❌ NO WEBHOOK LOGS FOUND! Webhooks may not be reaching your server.');
  } else {
    console.log(`   Found ${logs.length} recent webhook(s):\n`);
    logs.forEach((log, i) => {
      console.log(`   ${i + 1}. Topic: ${log.topic}`);
      console.log(`      Status: ${log.status}`);
      console.log(`      Order ID: ${log.shopifyOrderId || 'N/A'}`);
      console.log(`      Processed: ${log.processedAt}`);
      console.log(`      Error: ${log.errorMessage || 'None'}`);
      console.log('');
    });
  }
  
  // 3. Check customers with tags
  console.log('3️⃣  CUSTOMERS WITH SHOPIFY TAGS:');
  const customers = await prisma.customer.findMany({
    where: { 
      OR: [
        { shopifyCustomerId: { not: '' } },
        { memberId: { not: '' } }
      ]
    },
    include: { store: true },
    take: 5,
  });
  
  if (customers.length === 0) {
    console.log('   ❌ No customers with Shopify data found!');
  } else {
    console.log(`   Found ${customers.length} customer(s) with Shopify data:\n`);
    customers.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.firstName} ${c.lastName}`);
      console.log(`      Member ID: ${c.memberId}`);
      console.log(`      Shopify ID: ${c.shopifyCustomerId || 'N/A'}`);
      console.log(`      Store: ${c.store?.storeId} (${c.store?.storeName})`);
      console.log(`      Attributed Store: ${c.attributedStoreId || 'N/A'}`);
      console.log(`      Sample Date: ${c.sampleDate || 'N/A'}`);
      console.log('');
    });
  }
  
  // 4. Check conversions
  console.log('4️⃣  CONVERSIONS (Last 5):');
  const conversions = await prisma.conversion.findMany({
    orderBy: { purchaseDate: 'desc' },
    take: 5,
  });
  
  if (conversions.length === 0) {
    console.log('   ❌ NO CONVERSIONS FOUND! Commission tracking is not working.');
  } else {
    console.log(`   Found ${conversions.length} conversion(s):\n`);
    conversions.forEach((c, i) => {
      console.log(`   ${i + 1}. Order: ${c.orderNumber}`);
      console.log(`      Total: $${Number(c.orderTotal).toFixed(2)}`);
      console.log(`      Commission: $${Number(c.commissionAmount).toFixed(2)}`);
      console.log(`      Store: ${c.storeId}`);
      console.log(`      Paid: ${c.paid}`);
      console.log(`      Date: ${c.purchaseDate}`);
      console.log('');
    });
  }
  
  // 5. Check store credit transactions
  console.log('5️⃣  STORE CREDIT TRANSACTIONS (Last 5):');
  const transactions = await prisma.storeCreditTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      store: { select: { storeId: true, storeName: true } }
    }
  });
  
  if (transactions.length === 0) {
    console.log('   ❌ NO CREDIT TRANSACTIONS FOUND!');
  } else {
    console.log(`   Found ${transactions.length} transaction(s):\n`);
    transactions.forEach((t: any, i: number) => {
      console.log(`   ${i + 1}. ${t.type.toUpperCase()}: $${Number(t.amount).toFixed(2)}`);
      console.log(`      Store: ${t.store?.storeId} (${t.store?.storeName})`);
      console.log(`      Reason: ${t.reason}`);
      console.log(`      Balance: $${Number(t.balance).toFixed(2)}`);
      console.log(`      Date: ${t.createdAt}`);
      console.log('');
    });
  }
  
  // 6. Expected webhook URL
  console.log('6️⃣  EXPECTED WEBHOOK CONFIGURATION:');
  console.log(`   Webhook URL: https://qrdisplay.com/api/webhooks/shopify/orders`);
  console.log(`   Format: JSON`);
  console.log(`   API Version: Latest`);
  console.log(`   Topics: orders/create, orders/paid`);
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Debug report complete!');
  console.log('\nNEXT STEPS:');
  console.log('1. Go to Shopify Admin → Settings → Notifications → Webhooks');
  console.log('2. Check if webhook URL matches the expected URL above');
  console.log('3. Click on the webhook and check "Recent deliveries"');
  console.log('4. If no deliveries, webhook is not configured correctly');
  console.log('5. If deliveries show errors, check the error messages');
}

debugWebhook()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
