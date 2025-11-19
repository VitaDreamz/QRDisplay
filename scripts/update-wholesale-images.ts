/**
 * Update wholesale product images
 */

import prisma from '@/lib/prisma';

async function updateWholesaleImages() {
  try {
    // Define the image mappings
    const imageMap: Record<string, string> = {
      'VD-SB-4-BX': '/images/products/4ct-SlumberBerry-BOXof20.png',
      'VD-SB-30-BX': '/images/products/30ct-SlumberBerry-BOXof8.png',
      'VD-SB-60-BX': '/images/products/60ct-SlumberBerry-BOXof6.png',
      'VD-BB-4-BX': '/images/products/4ct-BlissBerry-BOXof20.png',
      'VD-BB-30-BX': '/images/products/30ct-BlissBerry-BOXof8.png',
      'VD-BB-60-BX': '/images/products/60ct-BlissBerry-BOXof6.png',
      'VD-CC-4-BX': '/images/products/4ct-Chillout-Bag.png',
      'VD-CC-20-BX': '/images/products/20ct-ChillOutChewz-Bag.png',
      'VD-CC-60-BX': '/images/products/60ct-ChillOutChewz-Bag.png',
    };

    console.log('🖼️  Updating wholesale product images...\n');

    for (const [sku, imageUrl] of Object.entries(imageMap)) {
      const product = await prisma.product.findUnique({
        where: { sku },
      });

      if (product) {
        await prisma.product.update({
          where: { sku },
          data: { imageUrl },
        });
        console.log(`✅ ${sku}: ${imageUrl}`);
      } else {
        console.log(`⚠️  ${sku}: Product not found`);
      }
    }

    console.log('\n✅ All wholesale product images updated!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateWholesaleImages();
