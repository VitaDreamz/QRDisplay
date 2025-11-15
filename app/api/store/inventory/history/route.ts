/**
 * Get inventory transaction history for a product
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const productSku = searchParams.get('productSku');
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type'); // Optional filter by transaction type

    if (!productSku || !storeId) {
      return NextResponse.json({ error: 'Missing productSku or storeId' }, { status: 400 });
    }

    // Verify user has access to this store
    const user = await prisma.user.findUnique({
      where: { userId }
    });

    if (!user || (user.role !== 'super-admin' && user.storeId !== storeId)) {
      return NextResponse.json({ error: 'Unauthorized for this store' }, { status: 403 });
    }

    // Build query
    const where: any = {
      storeId,
      productSku
    };

    if (type) {
      where.type = type;
    }

    // Get transactions
    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Get current inventory status
    const inventory = await prisma.storeInventory.findUnique({
      where: {
        storeId_productSku: {
          storeId,
          productSku
        }
      },
      include: {
        product: true
      }
    });

    return NextResponse.json({
      transactions,
      inventory,
      product: inventory?.product
    });

  } catch (error) {
    console.error('❌ Error fetching inventory history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
