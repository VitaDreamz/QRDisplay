import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgId = 'ORG-VITADREAMZ';

  const products = [
    {
      sku: 'VD-SB-4-BX',
      name: '4ct - Slumber Berry - Sleep Gummies (Box of 20)',
      description: 'CBD + Melatonin & Herbals',
      category: 'Slumber Berry',
      imageUrl: '/images/products/slumber-berry-4ct.jpg',
      price: 45.00, // Box price: $2.25 * 20
      active: true,
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 2.25,
      retailPrice: 4.99,
    },
    {
      sku: 'VD-LB-4-BX',
      name: '4ct - Luna Berry - Sleep Gummies (Box of 20)',
      description: 'Magnesium + Melatonin & Herbals',
      category: 'Luna Berry',
      imageUrl: '/images/products/luna-berry-4ct.jpg',
      price: 40.00, // Box price: $2.00 * 20
      active: false, // Luna Berry is inactive
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 2.00,
      retailPrice: 3.99,
    },
    {
      sku: 'VD-BB-4-BX',
      name: '4ct - Bliss Berry - Relax & Sleep Gummies (Box of 20)',
      description: 'Magnesium + Herbals',
      category: 'Bliss Berry',
      imageUrl: '/images/products/bliss-berry-4ct.jpg',
      price: 40.00, // Box price: $2.00 * 20
      active: true,
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 2.00,
      retailPrice: 3.99,
    },
    {
      sku: 'VD-CC-4-BX',
      name: '4ct - Berry Chill - ChillOut Chewz (Box of 20)',
      description: 'D9 THC + Herbals',
      category: 'Berry Chill',
      imageUrl: '/images/products/berry-chill-4ct.jpg',
      price: 54.00, // Box price: $2.70 * 20
      active: true,
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 2.70,
      retailPrice: 5.99,
    },
  ];

  console.log('🌟 Adding 4ct wholesale box products...\n');

  for (const product of products) {
    const boxPrice = product.wholesalePrice! * product.unitsPerBox!;
    
    const result = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        ...product,
        orgId,
      },
      create: {
        ...product,
        orgId,
      },
    });

    const status = result.active ? '✅' : '⏸️ ';
    console.log(`${status} ${result.sku}: ${result.name}`);
    console.log(`   Box Price: $${boxPrice.toFixed(2)} (${product.unitsPerBox} units)`);
    console.log(`   Unit Price: $${product.wholesalePrice} → $${product.retailPrice}`);
    console.log(`   Margin: ${(((product.retailPrice! - product.wholesalePrice!) / product.retailPrice!) * 100).toFixed(1)}%\n`);
  }

  console.log('✨ 4ct boxes added successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
