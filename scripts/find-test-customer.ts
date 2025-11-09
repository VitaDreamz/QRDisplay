/**
 * Find a good customer to test webhook commission tracking
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findTestCustomer() {
  console.log('🔍 Finding a good customer for webhook testing...\n');
  
  // Find customers with sampleDate set and assigned to a store
  const customers = await prisma.customer.findMany({
    where: {
      sampleDate: { not: null },
      storeId: { not: '' },
    },
    include: {
      store: true,
    },
    orderBy: {
      sampleDate: 'desc',
    },
    take: 5,
  });
  
  if (customers.length === 0) {
    console.log('❌ No customers found with sampleDate and storeId');
    console.log('   You need to create a customer through the normal flow first.');
    process.exit(1);
  }
  
  console.log(`✅ Found ${customers.length} eligible customer(s):\n`);
  
  customers.forEach((c, i) => {
    const daysSinceSample = c.sampleDate 
      ? Math.floor((Date.now() - new Date(c.sampleDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    console.log(`${i + 1}. ${c.firstName} ${c.lastName}`);
    console.log(`   Email: ${c.email || 'N/A'}`);
    console.log(`   Phone: ${c.phone}`);
    console.log(`   Member ID: ${c.memberId}`);
    console.log(`   Store: ${c.store?.storeId} (${c.store?.storeName})`);
    console.log(`   Attributed Store: ${c.attributedStoreId || c.storeId}`);
    console.log(`   Sample Date: ${c.sampleDate}`);
    console.log(`   Days Since Sample: ${daysSinceSample} (${daysSinceSample <= 30 ? '✅ Within 30-day window' : '❌ Outside window'})`);
    console.log('');
  });
  
  const best = customers[0];
  const attributedStore = best.attributedStoreId || best.storeId;
  
  console.log('=' .repeat(80));
  console.log('\n📋 INSTRUCTIONS TO TEST WEBHOOK COMMISSION:\n');
  console.log('1. Go to Shopify Admin → Customers');
  console.log(`2. Search for: ${best.phone} or ${best.email || best.firstName + ' ' + best.lastName}`);
  console.log('3. If customer exists:');
  console.log(`   - Click on the customer`);
  console.log(`   - Add tags: member:${best.memberId}, Store:${attributedStore}`);
  console.log('   - Save');
  console.log('4. If customer does NOT exist:');
  console.log(`   - Create new customer with email: ${best.email || 'test@example.com'}`);
  console.log(`   - Phone: ${best.phone}`);
  console.log(`   - Tags: member:${best.memberId}, Store:${attributedStore}`);
  console.log('5. Place a test order for this customer in Shopify');
  console.log('6. Watch Vercel logs for commission processing');
  console.log(`7. Check store credit for ${best.store?.storeName} (${attributedStore})`);
  console.log('\n' + '='.repeat(80));
  console.log(`\n💡 Expected commission: ~$18.50 (10% of ~$185 test order)`);
}

findTestCustomer()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
