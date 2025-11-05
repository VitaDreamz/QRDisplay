import prisma from '../lib/prisma';

async function main() {
  console.log('Updating product images...');
  
  const updates = [
    { sku: 'VD-SB-30', imageUrl: '/images/displays/30ct-SlumberBerry-Bag.png' },
    { sku: 'VD-SB-60', imageUrl: '/images/displays/60ct-SlumberBerry-Bag.png' },
    { sku: 'VD-LB-30', imageUrl: null }, // Luna Berry doesn't have image yet
    { sku: 'VD-LB-60', imageUrl: null },
    { sku: 'VD-BB-30', imageUrl: '/images/displays/30ct-BlissBerry-Bag.png' },
    { sku: 'VD-BB-60', imageUrl: '/images/displays/60ct-BlissBerry-Bag.png' },
    { sku: 'VD-CC-20', imageUrl: '/images/displays/20ct-ChillOutChewz-Bag.png' },
    { sku: 'VD-CC-60', imageUrl: '/images/displays/60ct-ChillOutChewz-Bag.png' },
  ];
  
  for (const { sku, imageUrl } of updates) {
    try {
      await prisma.product.update({
        where: { sku },
        data: { imageUrl }
      });
      console.log(`✓ Updated ${sku}: ${imageUrl || 'no image'}`);
    } catch (err) {
      console.log(`✗ Failed to update ${sku}`);
    }
  }
  
  console.log('\n✅ Product images updated!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
