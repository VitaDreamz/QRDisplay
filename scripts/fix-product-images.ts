/**
 * Fix product image URLs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const imageUpdates = [
  // Slumber Berry
  { sku: 'VD-SB-4', imageUrl: '/images/products/4ct-SlumberBerry-Bag.png' },
  { sku: 'VD-SB-30', imageUrl: '/images/products/30ct-SlumberBerry-Bag.png' },
  { sku: 'VD-SB-60', imageUrl: '/images/products/60ct-SlumberBerry-Bag.png' },
  
  // Bliss Berry
  { sku: 'VD-BB-4', imageUrl: '/images/products/4ct-BlissBerry-Bag.png' },
  { sku: 'VD-BB-30', imageUrl: '/images/products/30ct-BlissBerry-Bag.png' },
  { sku: 'VD-BB-60', imageUrl: '/images/products/60ct-BlissBerry-Bag.png' },
  
  // ChillOut Chewz
  { sku: 'VD-CC-4', imageUrl: '/images/products/4ct-Chillout-Bag.png' },
  { sku: 'VD-CC-20', imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png' },
  { sku: 'VD-CC-60', imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png' },
];

async function main() {
  console.log('📸 Updating product images...\n');
  
  let updated = 0;
  
  for (const { sku, imageUrl } of imageUpdates) {
    try {
      await prisma.product.update({
        where: { sku },
        data: { imageUrl }
      });
      console.log(`✅ ${sku}: ${imageUrl}`);
      updated++;
    } catch (error) {
      console.error(`❌ Error updating ${sku}:`, error);
    }
  }
  
  console.log(`\n✨ Updated ${updated} product images`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
