import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    {
      sku: 'VD-SB-4-BX',
      imageUrl: '/images/products/slumber-berry-4ct.jpg',
    },
    {
      sku: 'VD-BB-4-BX',
      imageUrl: '/images/products/bliss-berry-4ct.jpg',
    },
  ];

  console.log('📸 Updating 4ct box images...\n');

  for (const update of updates) {
    const result = await prisma.product.update({
      where: { sku: update.sku },
      data: { imageUrl: update.imageUrl },
    });
    console.log(`✅ Updated ${result.sku} with image: ${result.imageUrl}`);
  }

  console.log('\n✨ Images updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
