const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-004' },
    include: {
      brandPartnerships: true
    }
  });
  
  console.log('\n=== SID-004 ===');
  console.log('Store:', store.storeName);
  console.log('\nBrand Partnerships:', store.brandPartnerships.length);
  
  store.brandPartnerships.forEach(bp => {
    console.log(`\n- Brand: ${bp.brandOrgId}`);
    console.log(`  Samples: ${bp.availableSamples.join(', ')}`);
    console.log(`  Full-size: ${bp.availableProducts.join(', ')}`);
  });
  
  await prisma.$disconnect();
}

check();
