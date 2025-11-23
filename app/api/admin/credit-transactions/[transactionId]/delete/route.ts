import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const { transactionId } = await params;

    // Get the transaction to delete
    const transaction = await prisma.storeCreditTransaction.findUnique({
      where: { id: transactionId },
      include: {
        brandPartnership: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const partnershipId = transaction.brandPartnershipId;
    const storeId = transaction.brandPartnership?.store.storeId;

    if (!partnershipId || !storeId) {
      return NextResponse.json({ error: 'Invalid transaction data' }, { status: 400 });
    }

    // Delete the transaction
    await prisma.storeCreditTransaction.delete({
      where: { id: transactionId },
    });

    // Recalculate the balance from all remaining transactions
    const allTransactions = await prisma.storeCreditTransaction.findMany({
      where: { brandPartnershipId: partnershipId },
      orderBy: { createdAt: 'asc' },
    });

    let runningBalance = 0;
    for (const tx of allTransactions) {
      runningBalance += Number(tx.amount);
      await prisma.storeCreditTransaction.update({
        where: { id: tx.id },
        data: { balance: runningBalance },
      });
    }

    // Update the partnership's current balance
    await prisma.storeBrandPartnership.update({
      where: { id: partnershipId },
      data: { storeCreditBalance: runningBalance },
    });

    // Redirect back to the credit page
    return NextResponse.redirect(new URL(`/admin/stores/${storeId}/credit`, request.url));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
