/**
 * Fix wholesale box images to use .jpg instead of .png
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🖼️  Fixing wholesale box images to use .jpg...');

  const updates = [
    { sku: 'VD-SB-30-BX', imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg' },
    { sku: 'VD-BB-30-BX', imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg' },
    { sku: 'VD-SB-60-BX', imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg' },
    { sku: 'VD-BB-60-BX', imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg' },
  ];

  for (const { sku, imageUrl } of updates) {
    const result = await prisma.product.updateMany({
      where: { sku },
      data: { imageUrl }
    });
    console.log(`✅ Updated ${sku}: ${imageUrl} (${result.count} products updated)`);
  }

  console.log('✨ Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
