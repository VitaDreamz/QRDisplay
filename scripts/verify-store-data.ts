import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyStoreData() {
  console.log('\n🔍 CHECKING STORE DATA FLOW\n');
  
  // Get the most recently created store
  const latestStore = await prisma.store.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      brandPartnerships: {
        include: {
          brand: true
        }
      },
      inventory: true
    }
  });
  
  if (!latestStore) {
    console.log('❌ No stores found in database');
    return;
  }
  
  console.log('📊 Latest Store:', latestStore.storeId, '-', latestStore.storeName);
  console.log('\n1️⃣ BASIC INFO:');
  console.log('  Store ID:', latestStore.storeId);
  console.log('  Business Name:', latestStore.storeName);
  console.log('  Location:', latestStore.city, latestStore.state, latestStore.zipCode);
  console.log('  Owner:', latestStore.ownerName);
  console.log('  Email:', latestStore.ownerEmail);
  console.log('  Phone:', latestStore.ownerPhone);
  console.log('  Admin PIN:', latestStore.staffPin);
  
  console.log('\n2️⃣ SUBSCRIPTION:');
  console.log('  Tier:', latestStore.subscriptionTier);
  console.log('  Status:', latestStore.subscriptionStatus);
  console.log('  Samples/Quarter:', latestStore.samplesPerQuarter);
  console.log('  Customer Slots:', latestStore.customerSlotsGranted);
  console.log('  Commission Rate:', latestStore.commissionRate + '%');
  console.log('  Promo Reimbursement:', latestStore.promoReimbursementRate + '%');
  
  console.log('\n3️⃣ BRAND PARTNERSHIPS:');
  console.log('  Total Partnerships:', latestStore.brandPartnerships.length);
  
  if (latestStore.brandPartnerships.length === 0) {
    console.log('  ❌ NO BRAND PARTNERSHIPS SAVED!');
  } else {
    latestStore.brandPartnerships.forEach((partnership, i) => {
      console.log(`\n  Partnership ${i + 1}:`);
      console.log('    Brand:', partnership.brand.name, '(' + partnership.brand.orgId + ')');
      console.log('    Status:', partnership.status);
      console.log('    Available Samples:', partnership.availableSamples || []);
      console.log('    Available Products:', partnership.availableProducts || []);
      console.log('    Commission Rates:');
      console.log('      - Online:', partnership.onlineCommission + '%');
      console.log('      - Subscription:', partnership.subscriptionCommission + '%');
      console.log('      - Promo:', partnership.promoCommission + '%');
    });
  }
  
  console.log('\n4️⃣ INVENTORY:');
  console.log('  Total SKUs in inventory:', latestStore.inventory.length);
  
  if (latestStore.inventory.length === 0) {
    console.log('  ❌ NO INVENTORY RECORDS SAVED!');
  } else {
    latestStore.inventory.forEach((item) => {
      console.log(`    ${item.productSku}: ${item.quantityOnHand} units`);
    });
  }
  
  console.log('\n5️⃣ TESTING PRODUCTS API:');
  const brandOrgIds = latestStore.brandPartnerships.map(p => p.brand.orgId);
  console.log('  Brand orgIds:', brandOrgIds);
  
  if (brandOrgIds.length > 0) {
    const products = await prisma.product.findMany({
      where: {
        orgId: { in: brandOrgIds },
        active: true
      }
    });
    
    console.log('  Products found for these brands:', products.length);
    products.forEach(p => {
      console.log(`    - ${p.sku}: ${p.name} (${p.orgId})`);
    });
  }
  
  console.log('\n✅ VERIFICATION COMPLETE\n');
  
  await prisma.$disconnect();
}

verifyStoreData().catch(console.error);
