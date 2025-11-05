import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProductionProducts() {
  console.log('🌱 Seeding production database...\n');
  
  // Find VitaDreamz organization
  const org = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  if (!org) {
    console.error('❌ Organization not found!');
    process.exit(1);
  }
  
  console.log('✓ Found VitaDreamz organization\n');
  
  // Retail products
  const retailProducts = [
    {
      sku: 'VD-SB-30',
      name: 'Slumber Berry - 30ct',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 29.99,
      imageUrl: '/images/products/30ct-SlumberBerry-Bag.png',
      active: true,
      featured: true
    },
    {
      sku: 'VD-SB-60',
      name: 'Slumber Berry - 60ct',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 54.99,
      imageUrl: '/images/products/60ct-SlumberBerry-Bag.png',
      active: true,
      featured: true
    },
    {
      sku: 'VD-BB-30',
      name: 'Bliss Berry - 30ct',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies',
      category: 'Relax',
      price: 24.99,
      imageUrl: '/images/products/30ct-BlissBerry-Bag.png',
      active: true,
      featured: false
    },
    {
      sku: 'VD-BB-60',
      name: 'Bliss Berry - 60ct',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies',
      category: 'Relax',
      price: 44.99,
      imageUrl: '/images/products/60ct-BlissBerry-Bag.png',
      active: true,
      featured: false
    },
    {
      sku: 'VD-CC-20',
      name: 'Berry Chill - 20ct',
      description: 'D9 THC + Herbals - ChillOut Chewz',
      category: 'ChillOut',
      price: 24.95,
      imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
      active: true,
      featured: false
    },
    {
      sku: 'VD-CC-60',
      name: 'Berry Chill - 60ct',
      description: 'D9 THC + Herbals - ChillOut Chewz',
      category: 'ChillOut',
      price: 69.95,
      imageUrl: '/images/products/60ct-ChillOut Chewz-Bag.png',
      active: true,
      featured: false
    }
  ];
  
  console.log('📦 Seeding/updating retail products...');
  for (const product of retailProducts) {
    const existing = await prisma.product.findUnique({
      where: { sku: product.sku }
    });
    
    if (existing) {
      await prisma.product.update({
        where: { sku: product.sku },
        data: { imageUrl: product.imageUrl }
      });
      console.log(`  ✓ Updated ${product.sku} - ${product.name}`);
    } else {
      await prisma.product.create({
        data: {
          ...product,
          orgId: org.orgId,
          msrp: null
        }
      });
      console.log(`  ✓ Created ${product.sku} - ${product.name}`);
    }
  }
  
  // Wholesale products
  const wholesaleProducts = [
    {
      sku: 'VD-SB-30-BX',
      name: 'Slumber Berry - 30ct Box',
      description: 'Box of 8 units',
      category: 'Sleep',
      price: 29.99,
      msrp: 29.99,
      imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg',
      productType: 'wholesale-box',
      unitsPerBox: 8,
      wholesalePrice: 160,
      retailPrice: 239.92
    },
    {
      sku: 'VD-BB-30-BX',
      name: 'Bliss Berry - 30ct Box',
      description: 'Box of 8 units',
      category: 'Relax',
      price: 24.99,
      msrp: 24.99,
      imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg',
      productType: 'wholesale-box',
      unitsPerBox: 8,
      wholesalePrice: 128,
      retailPrice: 199.92
    },
    {
      sku: 'VD-SB-60-BX',
      name: 'Slumber Berry - 60ct Box',
      description: 'Box of 6 units',
      category: 'Sleep',
      price: 54.99,
      msrp: 54.99,
      imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg',
      productType: 'wholesale-box',
      unitsPerBox: 6,
      wholesalePrice: 210,
      retailPrice: 329.94
    },
    {
      sku: 'VD-BB-60-BX',
      name: 'Bliss Berry - 60ct Box',
      description: 'Box of 6 units',
      category: 'Relax',
      price: 44.99,
      msrp: 44.99,
      imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg',
      productType: 'wholesale-box',
      unitsPerBox: 6,
      wholesalePrice: 168,
      retailPrice: 269.94
    },
    {
      sku: 'VD-CC-20-BX',
      name: 'Berry Chill - 20ct Box',
      description: 'Box of 10 units',
      category: 'ChillOut',
      price: 24.95,
      msrp: 24.95,
      imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
      productType: 'wholesale-box',
      unitsPerBox: 10,
      wholesalePrice: 150,
      retailPrice: 249.50
    },
    {
      sku: 'VD-CC-60-BX',
      name: 'Berry Chill - 60ct Box',
      description: 'Box of 6 units',
      category: 'ChillOut',
      price: 69.95,
      msrp: 69.95,
      imageUrl: '/images/products/60ct-ChillOut Chewz-Bag.png',
      productType: 'wholesale-box',
      unitsPerBox: 6,
      wholesalePrice: 280,
      retailPrice: 419.70
    },
    {
      sku: 'VD-SB-4-BX',
      name: 'Slumber Berry - 4ct Box',
      description: 'Box of 20 units',
      category: 'Sleep',
      price: 4.99,
      msrp: 4.99,
      imageUrl: '/images/products/4ct-SlumberBerry-Bag.png',
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 45,
      retailPrice: 99.80
    },
    {
      sku: 'VD-BB-4-BX',
      name: 'Bliss Berry - 4ct Box',
      description: 'Box of 20 units',
      category: 'Relax',
      price: 3.99,
      msrp: 3.99,
      imageUrl: '/images/products/4ct-BlissBerry-Bag.png',
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 40,
      retailPrice: 79.80
    },
    {
      sku: 'VD-CC-4-BX',
      name: 'Berry Chill - 4ct Box',
      description: 'Box of 20 units',
      category: 'ChillOut',
      price: 5.99,
      msrp: 5.99,
      imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
      productType: 'wholesale-box',
      unitsPerBox: 20,
      wholesalePrice: 54,
      retailPrice: 119.80
    }
  ];
  
  console.log('\n📦 Seeding wholesale products...');
  for (const product of wholesaleProducts) {
    const existing = await prisma.product.findUnique({
      where: { sku: product.sku }
    });
    
    if (existing) {
      console.log(`  ⊘ ${product.sku} already exists - ${product.name}`);
    } else {
      await prisma.product.create({
        data: {
          ...product,
          orgId: org.orgId,
          active: true,
          featured: false
        }
      });
      console.log(`  ✓ Created ${product.sku} - ${product.name}`);
    }
  }
  
  console.log('\n✅ Production database seeded successfully!');
}

seedProductionProducts()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
