import prisma from '../lib/prisma';

async function deleteWrongProducts() {
  const result = await prisma.product.deleteMany({
    where: { orgId: 'ORG-VITADREAMZ' }
  });
  
  console.log(`✓ Deleted ${result.count} products with wrong orgId`);
}

deleteWrongProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
