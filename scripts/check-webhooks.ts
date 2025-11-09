import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWebhooks() {
  // Check organization
  const org = await prisma.organization.findFirst({
    where: { shopifyActive: true },
    select: { 
      orgId: true,
      name: true,
      shopifyStoreName: true,
      commissionRate: true,
      attributionWindow: true
    }
  });
  console.log('📊 Organization:', JSON.stringify(org, null, 2));
  
  if (!org) {
    console.log('❌ No active Shopify organization found');
    return;
  }
  
  // Check recent webhooks
  const webhooks = await prisma.shopifyWebhookLog.findMany({
    where: { orgId: org.orgId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(`\n📨 Recent webhooks (${webhooks.length}):`);
  webhooks.forEach(w => {
    console.log(`  - ${w.topic} | ${w.status} | ${w.createdAt.toISOString()}`);
    if (w.errorMessage) console.log(`    Error: ${w.errorMessage}`);
  });
  
  // Check recent conversions
  const conversions = await prisma.conversion.findMany({
    where: { orgId: org.orgId },
    orderBy: { purchaseDate: 'desc' },
    take: 5,
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          phone: true
        }
      }
    }
  });
  console.log(`\n💰 Recent conversions (${conversions.length}):`);
  conversions.forEach(c => {
    console.log(`  - Order ${c.shopifyOrderId}: $${c.orderTotal} → $${c.commissionAmount} commission`);
    console.log(`    Customer: ${c.customer?.firstName} ${c.customer?.lastName} (${c.customer?.phone})`);
    console.log(`    Paid: ${c.paid ? 'Yes' : 'No'} | Date: ${c.purchaseDate.toISOString()}`);
  });
  
  // Check recent customers
  const customers = await prisma.customer.findMany({
    orderBy: { requestedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      shopifyCustomerId: true,
      storeId: true,
      requestedAt: true,
      store: {
        select: {
          storeId: true,
          storeName: true
        }
      }
    }
  });
  console.log(`\n👥 Recent customers (${customers.length}):`);
  customers.forEach(c => {
    console.log(`  - ${c.firstName} ${c.lastName} | ${c.phone}`);
    console.log(`    Shopify ID: ${c.shopifyCustomerId || 'None'}`);
    console.log(`    Store: ${c.store?.storeName} (${c.storeId})`);
  });
}

checkWebhooks()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
