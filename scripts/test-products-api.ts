import prisma from '../lib/prisma';

async function testProductsAPI() {
  // Check what's in the database
  const allProducts = await prisma.product.findMany({
    select: { sku: true, name: true, active: true, orgId: true }
  });
  
  console.log('All products in database:', allProducts.length);
  allProducts.forEach(p => {
    console.log(`  - ${p.sku}: ${p.name} (orgId: ${p.orgId}, active: ${p.active})`);
  });
  
  // Check what the API returns
  const orgProducts = await prisma.product.findMany({
    where: { orgId: 'ORG-86X0W98L' },
    orderBy: [
      { featured: 'desc' },
      { active: 'desc' },
      { name: 'asc' }
    ]
  });
  
  console.log('\nProducts for ORG-86X0W98L:', orgProducts.length);
  orgProducts.forEach(p => {
    console.log(`  - ${p.sku}: ${p.name} (active: ${p.active})`);
  });
}

testProductsAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
