import prisma from '../lib/prisma';

async function checkProducts() {
  const products = await prisma.product.findMany({
    select: { sku: true, orgId: true, name: true }
  });
  
  console.log(`Found ${products.length} products:`);
  products.forEach(p => {
    console.log(`  - ${p.sku}: ${p.name} (orgId: ${p.orgId})`);
  });
  
  const vitadreamzOrg = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  console.log('\nVitaDreamz org:', vitadreamzOrg?.orgId);
}

checkProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
