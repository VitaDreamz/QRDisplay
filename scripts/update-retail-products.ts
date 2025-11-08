/**
 * Update retail products from product list CSV
 * Adds missing products and updates existing ones
 */

import prisma from '../lib/prisma';

const ORGID = 'ORG-VITADREAMZ';

// Products from the CSV - corrected SKU for Luna Berry 4ct
const retailProducts = [
  {
    sku: 'VD-SB-4',
    name: '4ct - Slumber Berry - Sleep Gummies',
    price: 4.99,
    description: 'CBD + Melatonin & Herbals',
    imageUrl: '/images/products/4ct-SlumberBerry-Bag.png',
    category: 'Sleep',
  },
  {
    sku: 'VD-SB-30',
    name: '30ct - Slumber Berry - Sleep Gummies',
    price: 29.99,
    description: 'CBD + Melatonin & Herbals',
    imageUrl: '/images/products/30ct-SlumberBerry-Bag.png',
    category: 'Sleep',
  },
  {
    sku: 'VD-SB-60',
    name: '60ct - Slumber Berry - Sleep Gummmies',
    price: 54.99,
    description: 'CBD + Melatonin & Herbals',
    imageUrl: '/images/products/60ct-SlumberBerry-Bag.png',
    category: 'Sleep',
  },
  {
    sku: 'VD-LB-4',
    name: '4ct - Luna Berry - Sleep Gummies',
    price: 4.99,
    description: 'Magnesium + Melatonin & Herbals',
    imageUrl: null, // No image in CSV
    category: 'Sleep',
  },
  {
    sku: 'VD-LB-30',
    name: '30ct - Luna Berry - Sleep Gummies',
    price: 24.99,
    description: 'Magnesium + Melatonin & Herbals',
    imageUrl: null,
    category: 'Sleep',
  },
  {
    sku: 'VD-LB-60',
    name: '60ct - Luna Berry - Sleep Gummies',
    price: 44.99,
    description: 'Magnesium + Melatonin & Herbals',
    imageUrl: null,
    category: 'Sleep',
  },
  {
    sku: 'VD-BB-4',
    name: '4ct - Bliss Berry - Relax & Sleep Gummies',
    price: 4.99,
    description: 'Magnesium + Herbals',
    imageUrl: '/images/products/4ct-BlissBerry-Bag.png',
    category: 'Sleep',
  },
  {
    sku: 'VD-BB-30',
    name: '30ct - Bliss Berry - Relax & Sleep Gummies',
    price: 24.99,
    description: 'Magnesium + Herbals',
    imageUrl: '/images/products/30ct-BlissBerry-Bag.png',
    category: 'Sleep',
  },
  {
    sku: 'VD-BB-60',
    name: '60ct - Bliss Berry - Relax & Sleep Gummies',
    price: 44.99,
    description: 'Magnesium + Herbals',
    imageUrl: '/images/products/60ct-BlissBerry-Bag.png',
    category: 'Sleep',
  },
  {
    sku: 'VD-CC-4',
    name: '4ct - Berry Chill - ChillOut Chewz',
    price: 5.99,
    description: 'D9 THC + Herbals',
    imageUrl: '/images/products/4ct-Chillout-Bag.png',
    category: 'Relax',
  },
  {
    sku: 'VD-CC-20',
    name: '20ct - Berry Chill - ChillOut Chewz',
    price: 24.95,
    description: 'D9 THC + Herbals',
    imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
    category: 'Relax',
  },
  {
    sku: 'VD-CC-60',
    name: '60ct - Berry Chill - ChillOut Chewz',
    price: 59.99,
    description: 'D9 THC + Herbals',
    imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png',
    category: 'Relax',
  },
];

async function main() {
  console.log('🔄 Updating retail products for VitaDreamz...\n');

  for (const product of retailProducts) {
    try {
      const existing = await prisma.product.findUnique({
        where: { sku: product.sku },
      });

      if (existing) {
        // Update existing product
        const updated = await prisma.product.update({
          where: { sku: product.sku },
          data: {
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            imageUrl: product.imageUrl,
            productType: 'retail',
            active: true,
          },
        });
        console.log(`✅ Updated: ${product.sku} - ${product.name}`);
      } else {
        // Create new product
        const created = await prisma.product.create({
          data: {
            sku: product.sku,
            orgId: ORGID,
            name: product.name,
            price: product.price,
            description: product.description,
            category: product.category,
            imageUrl: product.imageUrl,
            productType: 'retail',
            active: true,
          },
        });
        console.log(`✨ Created: ${product.sku} - ${product.name}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${product.sku}:`, error);
    }
  }

  console.log('\n✅ Done! Checking final state...\n');

  // List all retail products
  const allRetail = await prisma.product.findMany({
    where: { orgId: ORGID, productType: 'retail' },
    orderBy: { sku: 'asc' },
    select: { sku: true, name: true, price: true, active: true },
  });

  console.log(`Total retail products: ${allRetail.length}\n`);
  allRetail.forEach((p) => {
    console.log(`${p.sku} - ${p.name} - $${p.price} - Active: ${p.active}`);
  });
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
