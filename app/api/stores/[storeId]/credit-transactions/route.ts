import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    // First get the store to get its numeric ID
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: { id: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Fetch all credit transactions for this store, ordered by most recent first
    const transactions = await prisma.storeCreditTransaction.findMany({
      where: {
        storeId: store.id
      },
      include: {
        brandPartnership: {
          include: {
            brand: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Convert Decimal types to numbers for JSON serialization
    const serializedTransactions = transactions.map(txn => ({
      ...txn,
      amount: Number(txn.amount),
      balance: Number(txn.balance)
    }));

    return NextResponse.json({ transactions: serializedTransactions });
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit transactions' },
      { status: 500 }
    );
  }
}
