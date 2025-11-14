import prisma from '../lib/prisma';

async function main() {
  const samples = await prisma.product.findMany({
    where: { productType: 'sample' },
    select: {
      sku: true,
      name: true,
      imageUrl: true,
      orgId: true
    }
  });

  console.log('Sample Products with Image URLs:');
  console.log(JSON.stringify(samples, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
