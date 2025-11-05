import prisma from '../lib/prisma';

async function testAPI() {
  console.log('Testing products API logic...\n');
  
  // Simulate what the API does
  const orgId = 'ORG-VITADREAMZ';
  const where = orgId ? { orgId } : {};
  
  const products = await prisma.product.findMany({
    where,
    orderBy: [
      { featured: 'desc' },
      { active: 'desc' },
      { name: 'asc' }
    ]
  });
  
  console.log(`Query: prisma.product.findMany({ where: { orgId: '${orgId}' } })`);
  console.log(`Result: ${products.length} products found\n`);
  
  if (products.length > 0) {
    console.log('Products:');
    products.forEach(p => {
      console.log(`  ✓ ${p.sku}: ${p.name}`);
    });
  } else {
    console.log('❌ No products found!');
    
    // Check what's actually in the database
    const allProducts = await prisma.product.findMany({});
    console.log(`\nTotal products in database: ${allProducts.length}`);
    if (allProducts.length > 0) {
      console.log('All products:');
      allProducts.forEach(p => {
        console.log(`  - ${p.sku}: orgId = ${p.orgId}`);
      });
    }
  }
}

testAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
