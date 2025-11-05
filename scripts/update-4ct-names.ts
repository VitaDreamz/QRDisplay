import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates = [
    {
      sku: 'VD-SB-4-BX',
      name: 'Slumber Berry - 4ct Box',
    },
    {
      sku: 'VD-LB-4-BX',
      name: 'Luna Berry - 4ct Box',
    },
    {
      sku: 'VD-BB-4-BX',
      name: 'Bliss Berry - 4ct Box',
    },
    {
      sku: 'VD-CC-4-BX',
      name: 'Berry Chill - 4ct Box',
    },
  ];

  console.log('📝 Updating 4ct product names...\n');

  for (const update of updates) {
    const result = await prisma.product.update({
      where: { sku: update.sku },
      data: { name: update.name },
    });
    console.log(`✅ ${result.sku}: ${result.name}`);
  }

  console.log('\n✨ Names updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
