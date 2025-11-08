import prisma from '../lib/prisma';

async function main() {
  console.log('🖼️  Updating ALL wholesale box product images...\n');

  const imageUpdates = [
    // Slumber Berry
    {
      sku: 'VD-SB-4-BX',
      imageUrl: '/images/products/4ct-SlumberBerry-BOXof20.jpg',
    },
    {
      sku: 'VD-SB-30-BX',
      imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg',
    },
    {
      sku: 'VD-SB-60-BX',
      imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg',
    },
    // Bliss Berry
    {
      sku: 'VD-BB-4-BX',
      imageUrl: '/images/products/4ct-BlissBerry-BOXof20.jpg',
    },
    {
      sku: 'VD-BB-30-BX',
      imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg',
    },
    {
      sku: 'VD-BB-60-BX',
      imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg',
    },
    // Berry Chill
    {
      sku: 'VD-CC-4-BX',
      imageUrl: '/images/products/4ct-BerryChill-BOXof20.jpg',
    },
    {
      sku: 'VD-CC-20-BX',
      imageUrl: '/images/products/20ct-BerryChill-BOXof8.jpg',
    },
    {
      sku: 'VD-CC-60-BX',
      imageUrl: '/images/products/60ct-BerryChill-BOXof6.jpg',
    },
  ];

  let updated = 0;
  let notFound = 0;

  for (const update of imageUpdates) {
    const product = await prisma.product.findUnique({
      where: { sku: update.sku },
    });

    if (product) {
      await prisma.product.update({
        where: { sku: update.sku },
        data: { imageUrl: update.imageUrl },
      });
      console.log(`✅ ${update.sku} → ${update.imageUrl}`);
      updated++;
    } else {
      console.log(`⚠️  ${update.sku} - NOT FOUND IN DATABASE`);
      notFound++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Not Found: ${notFound}`);
  
  if (updated > 0) {
    console.log('\n🎉 Wholesale box images updated successfully!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error updating box images:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
