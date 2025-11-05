import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * One-time API endpoint to seed wholesale products
 * Call this once after deployment: /api/admin/seed-wholesale-products?secret=YOUR_SECRET
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🌱 Seeding all VitaDreamz products...\n');

    // Get VitaDreamz organization
    const org = await prisma.organization.findFirst({
      where: { name: 'VitaDreamz' }
    });

    if (!org) {
      return NextResponse.json({ error: 'VitaDreamz organization not found' }, { status: 404 });
    }

    // RETAIL PRODUCTS (for customer purchases via QR displays)
    const retailProducts = [
      {
        sku: 'VD-SB-30',
        name: 'Slumber Berry - 30ct',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies',
        category: 'Sleep',
        price: 29.99,
        msrp: 29.99,
        imageUrl: '/images/products/30ct-SlumberBerry-Bag.png',
        active: true,
        featured: true,
        orgId: org.orgId
      },
      {
        sku: 'VD-SB-60',
        name: 'Slumber Berry - 60ct',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies',
        category: 'Sleep',
        price: 54.99,
        msrp: 54.99,
        imageUrl: '/images/products/60ct-SlumberBerry-Bag.png',
        active: true,
        featured: true,
        orgId: org.orgId
      },
      {
        sku: 'VD-BB-30',
        name: 'Bliss Berry - 30ct',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies',
        category: 'Relax',
        price: 24.99,
        msrp: 24.99,
        imageUrl: '/images/products/30ct-BlissBerry-Bag.png',
        active: true,
        featured: false,
        orgId: org.orgId
      },
      {
        sku: 'VD-BB-60',
        name: 'Bliss Berry - 60ct',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies',
        category: 'Relax',
        price: 44.99,
        msrp: 44.99,
        imageUrl: '/images/products/60ct-BlissBerry-Bag.png',
        active: true,
        featured: false,
        orgId: org.orgId
      },
      {
        sku: 'VD-CC-20',
        name: 'Berry Chill - 20ct',
        description: 'D9 THC + Herbals - ChillOut Chewz',
        category: 'ChillOut',
        price: 24.95,
        msrp: 24.95,
        imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
        active: true,
        featured: false,
        orgId: org.orgId
      }
    ];

    // WHOLESALE PRODUCTS (for store owners to order inventory)
    const wholesaleProducts = [
      // 30ct Boxes (8 units per box)
      {
        sku: 'VD-SB-30-BX',
        name: 'Slumber Berry - 30ct Box',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 8)',
        category: 'Sleep',
        price: 29.99,
        msrp: 29.99,
        imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 8,
        wholesalePrice: 160.00,
        retailPrice: 239.92,
        orgId: org.orgId
      },
      {
        sku: 'VD-BB-30-BX',
        name: 'Bliss Berry - 30ct Box',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 8)',
        category: 'Relax',
        price: 24.99,
        msrp: 24.99,
        imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 8,
        wholesalePrice: 128.00,
        retailPrice: 199.92,
        orgId: org.orgId
      },
      // 60ct Boxes (6 units per box)
      {
        sku: 'VD-SB-60-BX',
        name: 'Slumber Berry - 60ct Box',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 6)',
        category: 'Sleep',
        price: 54.99,
        msrp: 54.99,
        imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 6,
        wholesalePrice: 210.00,
        retailPrice: 329.94,
        orgId: org.orgId
      },
      {
        sku: 'VD-BB-60-BX',
        name: 'Bliss Berry - 60ct Box',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 6)',
        category: 'Relax',
        price: 44.99,
        msrp: 44.99,
        imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 6,
        wholesalePrice: 168.00,
        retailPrice: 269.94,
        orgId: org.orgId
      },
      // Berry Chill 20ct Box
      {
        sku: 'VD-CC-20-BX',
        name: 'Berry Chill - 20ct Box',
        description: 'D9 THC + Herbals - ChillOut Chewz (Box of 10)',
        category: 'ChillOut',
        price: 24.95,
        msrp: 24.95,
        imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 10,
        wholesalePrice: 150.00,
        retailPrice: 249.50,
        orgId: org.orgId
      },
      // 4ct Boxes (20 units per box)
      {
        sku: 'VD-SB-4-BX',
        name: 'Slumber Berry - 4ct Box',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies (Box of 20)',
        category: 'Sleep',
        price: 4.99,
        msrp: 4.99,
        imageUrl: '/images/products/4ct-SlumberBerry-Bag.png',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 20,
        wholesalePrice: 45.00,
        retailPrice: 99.80,
        orgId: org.orgId
      },
      {
        sku: 'VD-BB-4-BX',
        name: 'Bliss Berry - 4ct Box',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies (Box of 20)',
        category: 'Relax',
        price: 3.99,
        msrp: 3.99,
        imageUrl: '/images/products/4ct-BlissBerry-Bag.png',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 20,
        wholesalePrice: 40.00,
        retailPrice: 79.80,
        orgId: org.orgId
      },
      {
        sku: 'VD-CC-4-BX',
        name: 'Berry Chill - 4ct Box',
        description: 'D9 THC + Herbals - ChillOut Chewz (Box of 20)',
        category: 'ChillOut',
        price: 5.99,
        msrp: 5.99,
        imageUrl: '/images/products/20ct-ChillOut Chewz-Bag.png',
        active: true,
        featured: false,
        productType: 'wholesale-box',
        unitsPerBox: 20,
        wholesalePrice: 54.00,
        retailPrice: 119.80,
        orgId: org.orgId
      }
    ];

    const created = [];
    const skipped = [];

    for (const product of wholesaleProducts) {
      // Check if already exists
      const existing = await prisma.product.findUnique({
        where: { sku: product.sku }
      });

      if (existing) {
        skipped.push(product.sku);
        continue;
      }

      await prisma.product.create({
        data: product
      });
      created.push(product.sku);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Wholesale products seeded successfully!',
      created,
      skipped,
      total: created.length
    });

  } catch (error) {
    console.error('Error seeding wholesale products:', error);
    return NextResponse.json({ 
      error: 'Failed to seed wholesale products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
