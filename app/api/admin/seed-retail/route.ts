import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/admin/seed-retail - Create retail products
export async function POST(request: NextRequest) {
  try {
    // Optional protection: require admin secret if configured
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine target organization
    const targetOrgId = searchParams.get('orgId') || undefined;
    let org = null as any;
    if (targetOrgId) {
      org = await prisma.organization.findFirst({ where: { orgId: targetOrgId } });
    } else {
      org = await prisma.organization.findFirst({ where: { name: 'VitaDreamz' } });
    }
    
    if (!org) {
      return NextResponse.json({ error: 'Target organization not found' }, { status: 404 });
    }
    
    const retailProducts = [
      {
        sku: 'VD-SB-30',
        name: 'Slumber Berry - 30ct',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies',
        category: 'Sleep',
        price: 29.99,
        imageUrl: '/images/products/30ct-SlumberBerry-Bag.png',
        active: true,
        featured: true,
        productType: 'retail'
      },
      {
        sku: 'VD-SB-60',
        name: 'Slumber Berry - 60ct',
        description: 'CBD + Melatonin & Herbals - Sleep Gummies',
        category: 'Sleep',
        price: 54.99,
        imageUrl: '/images/products/60ct-SlumberBerry-Bag.png',
        active: true,
        featured: true,
        productType: 'retail'
      },
      {
        sku: 'VD-BB-30',
        name: 'Bliss Berry - 30ct',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies',
        category: 'Relax',
        price: 24.99,
        imageUrl: '/images/products/30ct-BlissBerry-Bag.png',
        active: true,
        featured: false,
        productType: 'retail'
      },
      {
        sku: 'VD-BB-60',
        name: 'Bliss Berry - 60ct',
        description: 'Magnesium + Herbals - Relax & Sleep Gummies',
        category: 'Relax',
        price: 44.99,
        imageUrl: '/images/products/60ct-BlissBerry-Bag.png',
        active: true,
        featured: false,
        productType: 'retail'
      },
      {
        sku: 'VD-CC-20',
        name: 'Berry Chill - 20ct',
        description: 'D9 THC + Herbals - ChillOut Chewz',
        category: 'ChillOut',
        price: 24.95,
        imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png',
        active: true,
        featured: false,
        productType: 'retail'
      },
      {
        sku: 'VD-CC-60',
        name: 'Berry Chill - 60ct',
        description: 'D9 THC + Herbals - ChillOut Chewz',
        category: 'ChillOut',
        price: 59.99,
        imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png',
        active: true,
        featured: false,
        productType: 'retail'
      }
    ];
    
    const results: Array<{ sku: string; action: 'created' | 'updated' }> = [];
    for (const product of retailProducts) {
      const existing = await prisma.product.findUnique({
        where: { sku: product.sku }
      });
      
      if (existing) {
        // Update existing
        await prisma.product.update({
          where: { sku: product.sku },
          data: { 
            ...product,
            orgId: org.orgId
          }
        });
        results.push({ sku: product.sku, action: 'updated' });
      } else {
        // Create new
        await prisma.product.create({
          data: {
            ...product,
            orgId: org.orgId,
            msrp: null
          }
        });
        results.push({ sku: product.sku, action: 'created' });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Seeded ${results.length} retail products`,
      results
    });
    
  } catch (error) {
    console.error('[Seed Retail API] Error:', error);
    return NextResponse.json({ error: 'Failed to seed retail products', details: String(error) }, { status: 500 });
  }
}

// Convenience: allow GET for browser-triggered admin run (still requires ADMIN_SECRET)
export async function GET(request: NextRequest) {
  return POST(request);
}
