import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const { storeId } = params;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // Fetch all credit transactions for this store, ordered by most recent first
    const transactions = await prisma.storeCreditTransaction.findMany({
      where: {
        storeId: storeId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit transactions' },
      { status: 500 }
    );
  }
}
