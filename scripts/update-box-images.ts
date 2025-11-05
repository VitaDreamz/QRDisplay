import prisma from '../lib/prisma';

async function main() {
  console.log('🖼️  Updating wholesale box product images...');

  const imageUpdates = [
    {
      sku: 'VD-SB-30-BX',
      imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg',
    },
    {
      sku: 'VD-SB-60-BX',
      imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg',
    },
    {
      sku: 'VD-BB-30-BX',
      imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg',
    },
    {
      sku: 'VD-BB-60-BX',
      imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg',
    },
  ];

  for (const update of imageUpdates) {
    const product = await prisma.product.findUnique({
      where: { sku: update.sku },
    });

    if (product) {
      await prisma.product.update({
        where: { sku: update.sku },
        data: { imageUrl: update.imageUrl },
      });
      console.log(`✅ Updated ${update.sku} with image: ${update.imageUrl}`);
    } else {
      console.log(`⚠️  Product ${update.sku} not found`);
    }
  }

  console.log('\n✅ Box images updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error updating box images:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
