import prisma from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

async function main() {
  console.log('🔄 Seeding wholesale box products for VitaDreamz...');

  const orgId = 'ORG-VITADREAMZ';

  // Wholesale box products from CSV
  const wholesaleBoxes = [
    {
      sku: 'VD-SB-30-BX',
      name: 'Slumber Berry - 30ct Box',
      description: 'CBD + Melatonin & Herbals',
      category: 'Slumber Berry',
      price: new Decimal('108.00'), // Box price
      unitsPerBox: 8,
      wholesalePrice: new Decimal('13.50'), // Price per unit
      retailPrice: new Decimal('29.99'), // Retail per unit
      imageUrl: '/images/products/slumber-berry-30ct.jpg',
      active: true,
    },
    {
      sku: 'VD-SB-60-BX',
      name: 'Slumber Berry - 60ct Box',
      description: 'CBD + Melatonin & Herbals',
      category: 'Slumber Berry',
      price: new Decimal('125.00'), // Box price
      unitsPerBox: 6,
      wholesalePrice: new Decimal('25.00'), // Price per unit
      retailPrice: new Decimal('54.99'), // Retail per unit
      imageUrl: '/images/products/slumber-berry-60ct.jpg',
      active: true,
    },
    {
      sku: 'VD-LB-30-BX',
      name: 'Luna Berry - 30ct Box',
      description: 'Magnesium + Melatonin & Herbals',
      category: 'Luna Berry',
      price: new Decimal('80.00'), // Box price
      unitsPerBox: 8,
      wholesalePrice: new Decimal('10.00'), // Price per unit
      retailPrice: new Decimal('24.99'), // Retail per unit
      imageUrl: '/images/products/luna-berry-30ct.jpg',
      active: false, // Luna Berry not active yet
    },
    {
      sku: 'VD-LB-60-BX',
      name: 'Luna Berry - 60ct Box',
      description: 'Magnesium + Melatonin & Herbals',
      category: 'Luna Berry',
      price: new Decimal('120.00'), // Box price
      unitsPerBox: 6,
      wholesalePrice: new Decimal('20.00'), // Price per unit
      retailPrice: new Decimal('44.99'), // Retail per unit
      imageUrl: '/images/products/luna-berry-60ct.jpg',
      active: false, // Luna Berry not active yet
    },
    {
      sku: 'VD-BB-30-BX',
      name: 'Bliss Berry - 30ct Box',
      description: 'Magnesium + Herbals',
      category: 'Bliss Berry',
      price: new Decimal('80.00'), // Box price
      unitsPerBox: 8,
      wholesalePrice: new Decimal('10.00'), // Price per unit
      retailPrice: new Decimal('24.99'), // Retail per unit
      imageUrl: '/images/products/bliss-berry-30ct.jpg',
      active: true,
    },
    {
      sku: 'VD-BB-60-BX',
      name: 'Bliss Berry - 60ct Box',
      description: 'Magnesium + Herbals',
      category: 'Bliss Berry',
      price: new Decimal('120.00'), // Box price
      unitsPerBox: 6,
      wholesalePrice: new Decimal('20.00'), // Price per unit
      retailPrice: new Decimal('44.99'), // Retail per unit
      imageUrl: '/images/products/bliss-berry-60ct.jpg',
      active: true,
    },
    {
      sku: 'VD-CC-20-BX',
      name: 'Berry Chill - 20ct Box',
      description: 'D9 THC + Herbals',
      category: 'Berry Chill',
      price: new Decimal('90.00'), // Box price
      unitsPerBox: 8,
      wholesalePrice: new Decimal('11.25'), // Price per unit
      retailPrice: new Decimal('24.95'), // Retail per unit
      imageUrl: '/images/products/berry-chill-20ct.jpg',
      active: true,
    },
    {
      sku: 'VD-CC-60-BX',
      name: 'Berry Chill - 60ct Box',
      description: 'D9 THC + Herbals',
      category: 'Berry Chill',
      price: new Decimal('165.00'), // Box price
      unitsPerBox: 6,
      wholesalePrice: new Decimal('27.50'), // Price per unit
      retailPrice: new Decimal('59.99'), // Retail per unit
      imageUrl: '/images/products/berry-chill-60ct.jpg',
      active: true,
    },
  ];

  for (const product of wholesaleBoxes) {
    const existing = await prisma.product.findUnique({
      where: { sku: product.sku },
    });

    if (existing) {
      await prisma.product.update({
        where: { sku: product.sku },
        data: {
          ...product,
          productType: 'wholesale-box',
          orgId,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ Updated: ${product.name}`);
    } else {
      await prisma.product.create({
        data: {
          ...product,
          productType: 'wholesale-box',
          orgId,
        },
      });
      console.log(`✅ Created: ${product.name}`);
    }
  }

  console.log('\n✅ Wholesale box products seeded successfully!');
  
  // Show summary
  const wholesaleCount = await prisma.product.count({
    where: { orgId, productType: 'wholesale-box', active: true },
  });
  
  const retailCount = await prisma.product.count({
    where: { orgId, productType: 'retail', active: true },
  });
  
  console.log(`\n📦 VitaDreamz Product Summary:`);
  console.log(`   Wholesale boxes (active): ${wholesaleCount}`);
  console.log(`   Retail products (active): ${retailCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding wholesale products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
