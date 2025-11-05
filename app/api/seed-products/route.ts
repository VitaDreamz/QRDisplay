import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// This endpoint seeds products - protect it in production!
export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you should add a secret token in production
    const authHeader = request.headers.get('authorization');
    if (authHeader !== 'Bearer seed-secret-123') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or verify VitaDreamz organization exists
    const organization = await prisma.organization.findFirst({
      where: { name: 'VitaDreamz' }
    });

    if (!organization) {
      return NextResponse.json({ error: 'VitaDreamz organization not found' }, { status: 404 });
    }

    const orgId = organization.orgId;
    console.log('Seeding products for orgId:', orgId);

    const products = [
      {
        sku: 'VD-SB-30',
        name: '30ct - Slumber Berry - Sleep Gummies',
        description: 'CBD + Melatonin & Herbals',
        category: 'Sleep',
        price: 29.99,
        imageUrl: '/images/displays/30ct-SlumberBerry-Bag.png',
        featured: true
      },
      {
        sku: 'VD-SB-60',
        name: '60ct - Slumber Berry - Sleep Gummmies',
        description: 'CBD + Melatonin & Herbals',
        category: 'Sleep',
        price: 54.99,
        imageUrl: '/images/displays/60ct-SlumberBerry-Bag.png',
        featured: true
      },
      {
        sku: 'VD-LB-30',
        name: '30ct - Luna Berry - Sleep Gummies',
        description: 'Magnesium + Melatonin',
        category: 'Sleep',
        price: 24.99,
        imageUrl: null
      },
      {
        sku: 'VD-LB-60',
        name: '60ct - Luna Berry - Sleep Gummies',
        description: 'Magnesium + Melatonin',
        category: 'Sleep',
        price: 44.99,
        imageUrl: null
      },
      {
        sku: 'VD-BB-30',
        name: '30ct - Bliss Berry - Relax & Sleep Gummies',
        description: 'Magnesium',
        category: 'Relax',
        price: 24.99,
        imageUrl: '/images/displays/30ct-BlissBerry-Bag.png'
      },
      {
        sku: 'VD-BB-60',
        name: '60ct - Bliss Berry - Relax & Sleep Gummies',
        description: 'Magnesium',
        category: 'Relax',
        price: 44.99,
        imageUrl: '/images/displays/60ct-BlissBerry-Bag.png'
      },
      {
        sku: 'VD-CC-20',
        name: '20ct - Berry Chill - ChillOut Chewz',
        description: 'D9 THC Gummies',
        category: 'ChillOut',
        price: 24.95,
        imageUrl: '/images/displays/20ct-ChillOutChewz-Bag.png'
      },
      {
        sku: 'VD-CC-60',
        name: '60ct - Berry Chill - ChillOut Chewz',
        description: 'D9 THC Gummies',
        category: 'ChillOut',
        price: 59.99,
        imageUrl: '/images/displays/60ct-ChillOutChewz-Bag.png'
      }
    ];

    const created = [];
    const skipped = [];

    for (const productData of products) {
      const existing = await prisma.product.findUnique({
        where: { sku: productData.sku }
      });

      if (existing) {
        skipped.push(productData.sku);
        continue;
      }

      const product = await prisma.product.create({
        data: {
          ...productData,
          orgId,
          active: true,
          featured: productData.featured || false
        }
      });

      created.push(product.sku);
    }

    // Verify
    const allProducts = await prisma.product.findMany({
      where: { orgId }
    });

    return NextResponse.json({
      success: true,
      orgId,
      created: created.length,
      skipped: skipped.length,
      total: allProducts.length,
      products: allProducts.map(p => ({
        sku: p.sku,
        name: p.name,
        price: p.price
      }))
    });

  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      error: 'Failed to seed products',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
