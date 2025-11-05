import prisma from '../lib/prisma';

async function main() {
  console.log('Deleting placeholder products...');
  
  const result = await prisma.product.deleteMany();
  
  console.log(`✅ Deleted ${result.count} placeholder products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
