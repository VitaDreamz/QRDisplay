import prisma from '../lib/prisma';

async function fixWholesaleBoxImages() {
  console.log('🖼️  Fixing wholesale box product images...\n');

  // Update image URLs to use correct file extensions
  const updates = [
    { sku: 'VD-SB-30-BX', imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.png' },
    { sku: 'VD-BB-30-BX', imageUrl: '/images/products/30ct-BlissBerry-BOXof8.png' },
    { sku: 'VD-SB-60-BX', imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.png' },
    { sku: 'VD-BB-60-BX', imageUrl: '/images/products/60ct-BlissBerry-BOXof6.png' },
    { sku: 'VD-SB-4-BX', imageUrl: '/images/products/4ct-SlumberBerry-BOXof20.png' },
    { sku: 'VD-BB-4-BX', imageUrl: '/images/products/4ct-BlissBerry-BOXof20.png' },
    // ChillOut uses the bag images since box images don't exist
    { sku: 'VD-CC-20-BX', imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png' },
    { sku: 'VD-CC-4-BX', imageUrl: '/images/products/4ct-Chillout-Bag.png' },
    { sku: 'VD-CC-60-BX', imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png' },
  ];

  for (const update of updates) {
    const result = await prisma.product.updateMany({
      where: { sku: update.sku },
      data: { imageUrl: update.imageUrl },
    });
    
    if (result.count > 0) {
      console.log(`✅ ${update.sku}: ${update.imageUrl}`);
    } else {
      console.log(`⚠️  ${update.sku}: Not found in database`);
    }
  }

  console.log('\n✅ Done!');
}

fixWholesaleBoxImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
