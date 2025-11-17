/**
 * Add wholesale box products to production database
 * Based on VitaDreamz Product list - Wholesale (5).csv
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const wholesaleProducts = [
  // Slumber Berry (ORG-VSCA1)
  {
    sku: 'VD-SB-4-BX',
    orgId: 'ORG-VSCA1',
    name: '4ct - Slumber Berry - Sleep Gummies (Box of 20)',
    description: 'CBD + Melatonin & Herbals',
    productType: 'wholesale-box',
    price: 45.00,
    retailPrice: 4.99,
    wholesalePrice: 2.25,
    unitsPerBox: 20,
    shopifyVariantId: '43894434234544',
    imageUrl: '/images/products/4ct-SlumberBerry-BOXof20.png',
    active: true
  },
  {
    sku: 'VD-SB-30-BX',
    orgId: 'ORG-VSCA1',
    name: '30ct - Slumber Berry - Sleep Gummies (Box of 8)',
    description: 'CBD + Melatonin & Herbals',
    productType: 'wholesale-box',
    price: 108.00,
    retailPrice: 29.99,
    wholesalePrice: 13.50,
    unitsPerBox: 8,
    shopifyVariantId: '43894424928432',
    imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.png',
    active: true
  },
  {
    sku: 'VD-SB-60-BX',
    orgId: 'ORG-VSCA1',
    name: '60ct - Slumber Berry - Sleep Gummmies (Box of 6)',
    description: 'CBD + Melatonin & Herbals',
    productType: 'wholesale-box',
    price: 125.00,
    retailPrice: 54.99,
    wholesalePrice: 25.00,
    unitsPerBox: 6,
    shopifyVariantId: '43894432989360',
    imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.png',
    active: true
  },
  // Bliss Berry (ORG-VBDOW)
  {
    sku: 'VD-BB-4-BX',
    orgId: 'ORG-VBDOW',
    name: '4ct - Bliss Berry - Relax & Sleep Gummies (Box of 20)',
    description: 'Magnesium + Herbals',
    productType: 'wholesale-box',
    price: 40.00,
    retailPrice: 3.99,
    wholesalePrice: 2.00,
    unitsPerBox: 20,
    shopifyVariantId: '44514733621424',
    imageUrl: '/images/products/4ct-BlissBerry-BOXof20.png',
    active: true
  },
  {
    sku: 'VD-BB-30-BX',
    orgId: 'ORG-VBDOW',
    name: '30ct - Bliss Berry - Relax & Sleep Gummies (Box of 8)',
    description: 'Magnesium + Herbals',
    productType: 'wholesale-box',
    price: 80.00,
    retailPrice: 24.99,
    wholesalePrice: 10.00,
    unitsPerBox: 8,
    shopifyVariantId: '44514734637232',
    imageUrl: '/images/products/30ct-BlissBerry-BOXof8.png',
    active: true
  },
  {
    sku: 'VD-BB-60-BX',
    orgId: 'ORG-VBDOW',
    name: '60ct - Bliss Berry - Relax & Sleep Gummies (Box of 6)',
    description: 'Magnesium + Herbals',
    productType: 'wholesale-box',
    price: 120.00,
    retailPrice: 44.99,
    wholesalePrice: 20.00,
    unitsPerBox: 6,
    shopifyVariantId: '44514738438320',
    imageUrl: '/images/products/60ct-BlissBerry-BOXof6.png',
    active: true
  },
  // Chill Cherry (ORG-VCVR4) - Note: No box images found for ChillOut Chewz, using bag images
  {
    sku: 'VD-CC-4-BX',
    orgId: 'ORG-VCVR4',
    name: '4ct - Berry Chill - ChillOut Chewz (Box of 20)',
    description: 'D9 THC + Herbals',
    productType: 'wholesale-box',
    price: 54.00,
    retailPrice: 5.99,
    wholesalePrice: 2.70,
    unitsPerBox: 20,
    shopifyVariantId: '43911534182576',
    imageUrl: '/images/products/4ct-Chillout-Bag.png',
    active: true
  },
  {
    sku: 'VD-CC-20-BX',
    orgId: 'ORG-VCVR4',
    name: '20ct - Berry Chill - ChillOut Chewz (Box of 8)',
    description: 'D9 THC + Herbals',
    productType: 'wholesale-box',
    price: 90.00,
    retailPrice: 24.95,
    wholesalePrice: 11.25,
    unitsPerBox: 8,
    shopifyVariantId: '43911533953200',
    imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png',
    active: true
  },
  {
    sku: 'VD-CC-60-BX',
    orgId: 'ORG-VCVR4',
    name: '60ct - Berry Chill - ChillOut Chewz (Box of 6)',
    description: 'D9 THC + Herbals',
    productType: 'wholesale-box',
    price: 165.00,
    retailPrice: 59.99,
    wholesalePrice: 27.50,
    unitsPerBox: 6,
    shopifyVariantId: '44744268251312',
    imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png',
    active: true
  },
];

async function main() {
  console.log('\n📦 Adding wholesale box products to production database...\n');
  
  let created = 0;
  let skipped = 0;

  for (const product of wholesaleProducts) {
    try {
      // Check if product already exists
      const existing = await prisma.product.findUnique({
        where: { sku: product.sku }
      });

      if (existing) {
        console.log(`⚠️  ${product.sku} already exists, skipping`);
        skipped++;
        continue;
      }

      // Create the product
      await prisma.product.create({
        data: product
      });

      console.log(`✅ Created ${product.sku}: ${product.name}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${product.sku}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${wholesaleProducts.length}`);

  // Verify
  console.log('\n🔍 Verifying wholesale products by brand:\n');
  
  for (const orgId of ['ORG-VSCA1', 'ORG-VBDOW', 'ORG-VCVR4']) {
    const count = await prisma.product.count({
      where: { 
        orgId,
        productType: 'wholesale-box'
      }
    });
    const orgName = orgId === 'ORG-VSCA1' ? 'Slumber' : orgId === 'ORG-VBDOW' ? 'Bliss' : 'Chill';
    console.log(`  ${orgName}: ${count} wholesale box products`);
  }

  console.log('\n✨ Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
