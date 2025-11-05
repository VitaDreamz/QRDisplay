import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActiveProducts() {
  const products = await prisma.product.findMany({
    where: { 
      orgId: 'ORG-VITADREAMZ',
      active: true 
    },
    select: {
      sku: true,
      name: true,
      active: true,
      productType: true
    },
    orderBy: { sku: 'asc' }
  });
  
  console.log('\n🔍 Active products in database:\n');
  products.forEach(p => {
    console.log(`  ${p.sku.padEnd(15)} | Active: ${p.active} | Type: ${(p.productType || 'NULL').padEnd(15)} | ${p.name}`);
  });
  console.log(`\n📊 Total active products: ${products.length}`);
  console.log(`   - Retail: ${products.filter(p => p.productType !== 'wholesale-box').length}`);
  console.log(`   - Wholesale: ${products.filter(p => p.productType === 'wholesale-box').length}`);
}

checkActiveProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
