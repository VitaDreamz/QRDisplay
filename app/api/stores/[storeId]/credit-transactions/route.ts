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
            brand: {
              select: {
                name: true,
                orgId: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Now we need to add customer and staff info to each transaction
    // Parse the reason field to extract customer/staff IDs
    const enrichedTransactions = await Promise.all(
      transactions.map(async (txn) => {
        let customerName = null;
        let staffName = null;
        
        // Try to find PromoRedemption that created this transaction
        // Look for recent redemptions around the transaction time
        const promoRedemption = await prisma.promoRedemption.findFirst({
          where: {
            storeId: store.id,
            redeemedAt: {
              gte: new Date(txn.createdAt.getTime() - 5000), // Within 5 seconds
              lte: new Date(txn.createdAt.getTime() + 5000)
            }
          },
          include: {
            customer: {
              select: {
                memberId: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            redeemedAt: 'desc'
          }
        });
        
        if (promoRedemption) {
          if (promoRedemption.customer) {
            customerName = `${promoRedemption.customer.firstName} ${promoRedemption.customer.lastName} (${promoRedemption.customer.memberId})`;
          }
          // Look up staff separately
          if (promoRedemption.redeemedByStaffId) {
            const staff = await prisma.staff.findUnique({
              where: { id: promoRedemption.redeemedByStaffId },
              select: {
                staffId: true,
                firstName: true,
                lastName: true
              }
            });
            if (staff) {
              staffName = `${staff.firstName} ${staff.lastName} (${staff.staffId})`;
            }
          }
        }
        
        return {
          ...txn,
          amount: Number(txn.amount),
          balance: Number(txn.balance),
          customerName,
          staffName,
          brandName: txn.brandPartnership?.brand?.name || 'Unknown Brand'
        };
      })
    );

    return NextResponse.json({ transactions: enrichedTransactions });
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit transactions' },
      { status: 500 }
    );
  }
}
