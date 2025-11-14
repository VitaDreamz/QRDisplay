import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStore() {
  const store = await prisma.store.findUnique({
    where: { storeId: 'SID-003' },
    include: {
      brandPartnerships: {
        where: { active: true },
        include: {
          brand: true
        }
      }
    }
  });
  
  console.log('🏪 Store:', store?.storeName);
  console.log('📊 Brand Partnerships:', store?.brandPartnerships?.length || 0);
  
  if (store?.brandPartnerships && store.brandPartnerships.length > 0) {
    const brandIds = store.brandPartnerships.map(p => p.brand.id);
    console.log('Brand IDs:', brandIds);
    
    const products = await prisma.product.findMany({
      where: { 
        orgId: { in: brandIds },
        active: true 
      }
    });
    
    console.log('\n✅ Total Products Found:', products.length);
    products.forEach(p => console.log(`  - ${p.sku}: ${p.name} (orgId: ${p.orgId})`));
  } else {
    console.log('\n❌ No brand partnerships found!');
    console.log('This means when you created SID-003, no brand partnerships were created.');
  }
  
  await prisma.$disconnect();
}

checkStore().catch(console.error);
