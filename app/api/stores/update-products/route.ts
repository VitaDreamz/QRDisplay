import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/stores/update-products - Update store's available products
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, availableProducts } = body;
    
    if (!storeId || !Array.isArray(availableProducts)) {
      return NextResponse.json(
        { error: 'storeId and availableProducts array are required' },
        { status: 400 }
      );
    }
    
    const store = await prisma.store.update({
      where: { storeId },
      data: { availableProducts }
    });
    
    return NextResponse.json({ store });
  } catch (error) {
    console.error('[Update Products API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update products' },
      { status: 500 }
    );
  }
}
