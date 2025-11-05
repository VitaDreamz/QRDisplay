import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * One-time API endpoint to update all product images to use /images/products/ folder
 * Call this once after deployment: /api/admin/update-product-images?secret=YOUR_SECRET
 */
export async function POST(request: Request) {
  try {
    // Simple secret check - you can use any secret you want
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Updating all product image paths...\n');
    const updates = [];

    // Update 30ct box images
    await prisma.product.update({
      where: { sku: 'VD-SB-30-BX' },
      data: { imageUrl: '/images/products/30ct-SlumberBerry-BOXof8.jpg' }
    });
    updates.push('Slumber Berry 30ct box');

    await prisma.product.update({
      where: { sku: 'VD-BB-30-BX' },
      data: { imageUrl: '/images/products/30ct-BlissBerry-BOXof8.jpg' }
    });
    updates.push('Bliss Berry 30ct box');

    // Update 60ct box images
    await prisma.product.update({
      where: { sku: 'VD-SB-60-BX' },
      data: { imageUrl: '/images/products/60ct-SlumberBerry-BOXof6.jpg' }
    });
    updates.push('Slumber Berry 60ct box');

    await prisma.product.update({
      where: { sku: 'VD-BB-60-BX' },
      data: { imageUrl: '/images/products/60ct-BlissBerry-BOXof6.jpg' }
    });
    updates.push('Bliss Berry 60ct box');

    // Update 4ct box images
    await prisma.product.update({
      where: { sku: 'VD-SB-4-BX' },
      data: { imageUrl: '/images/products/4ct-SlumberBerry-Bag.png' }
    });
    updates.push('Slumber Berry 4ct bag');

    await prisma.product.update({
      where: { sku: 'VD-BB-4-BX' },
      data: { imageUrl: '/images/products/4ct-BlissBerry-Bag.png' }
    });
    updates.push('Bliss Berry 4ct bag');

    // Update Berry Chill 4ct box
    await prisma.product.update({
      where: { sku: 'VD-CC-4-BX' },
      data: { imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png' }
    });
    updates.push('Berry Chill 4ct bag');

    // Update Berry Chill 20ct box if it exists
    const berryChillBox = await prisma.product.findFirst({
      where: { sku: 'VD-CC-20-BX' }
    });
    
    if (berryChillBox) {
      await prisma.product.update({
        where: { sku: 'VD-CC-20-BX' },
        data: { imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png' }
      });
      updates.push('Berry Chill 20ct box');
    }

    // Update retail product images (30ct and 60ct)
    const retailProducts = [
      { sku: 'VD-SB-30', imageUrl: '/images/products/30ct-SlumberBerry-Bag.png', name: 'SB 30ct retail' },
      { sku: 'VD-SB-60', imageUrl: '/images/products/60ct-SlumberBerry-Bag.png', name: 'SB 60ct retail' },
      { sku: 'VD-BB-30', imageUrl: '/images/products/30ct-BlissBerry-Bag.png', name: 'BB 30ct retail' },
      { sku: 'VD-BB-60', imageUrl: '/images/products/60ct-BlissBerry-Bag.png', name: 'BB 60ct retail' },
      { sku: 'VD-CC-20', imageUrl: '/images/products/20ct-ChillOutChewz-Bag.png', name: 'CC 20ct retail' },
      { sku: 'VD-CC-60', imageUrl: '/images/products/60ct-ChillOutChewz-Bag.png', name: 'CC 60ct retail' },
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
        updates.push(product.name);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All product images updated successfully!',
      updated: updates 
    });

  } catch (error) {
    console.error('Error updating product images:', error);
    return NextResponse.json({ 
      error: 'Failed to update product images',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
