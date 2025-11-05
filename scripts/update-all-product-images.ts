#!/usr/bin/env node
/**
 * Update all product images to use the /images/products/ folder
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating all product image paths...\n');

  // Update 30ct box images
  await prisma.product.update({
    where: { sku: 'VD-SB-30-BX' },
    data: { imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg' }
  });
  console.log('✓ Updated Slumber Berry 30ct box image');

  await prisma.product.update({
    where: { sku: 'VD-BB-30-BX' },
    data: { imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg' }
  });
  console.log('✓ Updated Bliss Berry 30ct box image');

  // Update 60ct box images
  await prisma.product.update({
    where: { sku: 'VD-SB-60-BX' },
    data: { imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg' }
  });
  console.log('✓ Updated Slumber Berry 60ct box image');

  await prisma.product.update({
    where: { sku: 'VD-BB-60-BX' },
    data: { imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg' }
  });
  console.log('✓ Updated Bliss Berry 60ct box image');

  // Update 4ct box images
  await prisma.product.update({
    where: { sku: 'VD-SB-4-BX' },
    data: { imageUrl: '/images/products/4ct-SlumberBerry-Bag.png' }
  });
  console.log('✓ Updated Slumber Berry 4ct bag image');

  await prisma.product.update({
    where: { sku: 'VD-BB-4-BX' },
    data: { imageUrl: '/images/products/4ct-BlissBerry-Bag.png' }
  });
  console.log('✓ Updated Bliss Berry 4ct bag image');

  // Update Berry Chill 4ct box
  await prisma.product.update({
    where: { sku: 'VD-CC-4-BX' },
    data: { imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png' }
  });
  console.log('✓ Updated Berry Chill 4ct bag image');

  // Update Berry Chill 20ct box
  const berryChillBox = await prisma.product.findFirst({
    where: { sku: 'VD-CC-20-BX' }
  });
  
  if (berryChillBox) {
    await prisma.product.update({
      where: { sku: 'VD-CC-20-BX' },
      data: { imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png' }
    });
    console.log('✓ Updated Berry Chill 20ct box image');
  }

  // Update retail product images (30ct and 60ct)
  const retailProducts = [
    { sku: 'VD-SB-30', imageUrl: '/images/products/30ct-SlumberBerry-Bag.png' },
    { sku: 'VD-SB-60', imageUrl: '/images/products/60ct-SlumberBerry-Bag.png' },
    { sku: 'VD-BB-30', imageUrl: '/images/products/30ct-BlissBerry-Bag.png' },
    { sku: 'VD-BB-60', imageUrl: '/images/products/60ct-BlissBerry-Bag.png' },
    { sku: 'VD-CC-20', imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png' },
    { sku: 'VD-CC-60', imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png' },
  ];

  for (const product of retailProducts) {
    const exists = await prisma.product.findUnique({
      where: { sku: product.sku }
    });
    
    if (exists) {
      await prisma.product.update({
        where: { sku: product.sku },
        data: { imageUrl: product.imageUrl }
      });
      console.log(`✓ Updated ${product.sku} retail image`);
    }
  }

  console.log('\n✅ All product images updated successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
