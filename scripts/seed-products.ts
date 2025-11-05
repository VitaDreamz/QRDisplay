#!/usr/bin/env node
/**
 * Create VitaDreamz products from official product list
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fetch the actual VitaDreamz organization
  const organization = await prisma.organization.findFirst({
    where: { name: 'VitaDreamz' }
  });
  
  if (!organization) {
    console.error('❌ VitaDreamz organization not found!');
    process.exit(1);
  }
  
  const orgId = organization.orgId;
  console.log(`✓ Found VitaDreamz organization: ${orgId}\n`);
  
  const products = [
    {
      sku: 'VD-SB-30',
      name: 'Slumber Berry - 30ct',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 29.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-slumber-berry-30ct.jpg',
      active: true,
      featured: true
    },
    {
      sku: 'VD-SB-60',
      name: 'Slumber Berry - 60ct',
      description: 'CBD + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 54.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-slumber-berry-60ct.jpg',
      active: true,
      featured: true
    },
    {
      sku: 'VD-LB-30',
      name: 'Luna Berry - 30ct',
      description: 'Magnesium + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 24.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-luna-berry-30ct.jpg',
      active: false,
      featured: false
    },
    {
      sku: 'VD-LB-60',
      name: 'Luna Berry - 60ct',
      description: 'Magnesium + Melatonin & Herbals - Sleep Gummies',
      category: 'Sleep',
      price: 44.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-luna-berry-60ct.jpg',
      active: false,
      featured: false
    },
    {
      sku: 'VD-BB-30',
      name: 'Bliss Berry - 30ct',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies',
      category: 'Relax',
      price: 24.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-bliss-berry-30ct.jpg',
      active: true,
      featured: false
    },
    {
      sku: 'VD-BB-60',
      name: 'Bliss Berry - 60ct',
      description: 'Magnesium + Herbals - Relax & Sleep Gummies',
      category: 'Relax',
      price: 44.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-bliss-berry-60ct.jpg',
      active: true,
      featured: false
    },
    {
      sku: 'VD-CC-20',
      name: 'Berry Chill - 20ct',
      description: 'D9 THC + Herbals - ChillOut Chewz',
      category: 'ChillOut',
      price: 24.95,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-berry-chill-20ct.jpg',
      active: true,
      featured: false
    },
    {
      sku: 'VD-CC-60',
      name: 'Berry Chill - 60ct',
      description: 'D9 THC + Herbals - ChillOut Chewz',
      category: 'ChillOut',
      price: 59.99,
      msrp: null,
      imageUrl: '/images/products/vitadreamz-berry-chill-60ct.jpg',
      active: true,
      featured: false
    }
  ];
  
  console.log('Creating products for VitaDreamz...');
  
  for (const productData of products) {
    // Check if already exists
    const existing = await prisma.product.findUnique({
      where: { sku: productData.sku }
    });
    
    if (existing) {
      console.log(`✓ Product ${productData.sku} already exists, skipping`);
      continue;
    }
    
    const product = await prisma.product.create({
      data: {
        ...productData,
        orgId
      }
    });
    
    console.log(`✓ Created product: ${product.sku} - ${product.name}`);
  }
  
  console.log('\nProducts created successfully!');
  
  // Show summary
  const allProducts = await prisma.product.findMany({
    where: { orgId },
    select: {
      sku: true,
      name: true,
      price: true,
      active: true,
      featured: true
    }
  });
  
  console.log(`\nTotal products for VitaDreamz: ${allProducts.length}`);
  allProducts.forEach(p => {
    const badges = [];
    if (p.featured) badges.push('⭐');
    if (p.active) badges.push('✅');
    console.log(`  ${p.sku}: ${p.name} - $${p.price} ${badges.join(' ')}`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
