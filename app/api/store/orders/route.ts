import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/store/orders - Get all orders (samples + purchases) for a store
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const storeIdCookie = cookieStore.get('store-id')?.value;

    if (!storeIdCookie) {
      return NextResponse.json({ error: 'No store session found' }, { status: 401 });
    }

    // Get store's internal ID
    const store = await prisma.store.findUnique({
      where: { storeId: storeIdCookie },
      select: { id: true, storeId: true }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Fetch sample redemptions (free samples given out)
    const sampleRedemptions = await prisma.customer.findMany({
      where: {
        storeId: store.storeId,
        redeemed: true,
      },
      select: {
        id: true,
        memberId: true,
        firstName: true,
        lastName: true,
        phone: true,
        sampleChoice: true,
        redeemedAt: true,
        redeemedByStaff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        redeemedAt: 'desc'
      }
    });

    // Fetch purchase intents (products purchased)
    const purchases = await prisma.purchaseIntent.findMany({
      where: {
        storeId: store.id,
      },
      include: {
        customer: {
          select: {
            memberId: true,
            firstName: true,
            lastName: true,
            phone: true,
          }
        },
        product: {
          select: {
            sku: true,
            name: true,
            imageUrl: true,
          }
        },
        fulfilledByStaff: {
          select: {
            staffId: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format orders for unified display
    const orders = [
      // Sample redemptions
      ...sampleRedemptions.map(sample => ({
        id: `sample-${sample.id}`,
        type: 'sample' as const,
        date: sample.redeemedAt,
        customerName: `${sample.firstName} ${sample.lastName}`,
        customerId: sample.memberId,
        customerPhone: sample.phone,
        product: sample.sampleChoice,
        amount: 0,
        status: 'fulfilled',
        staffName: sample.redeemedByStaff 
          ? `${sample.redeemedByStaff.firstName} ${sample.redeemedByStaff.lastName}`
          : 'Unknown',
        staffId: sample.redeemedByStaff?.staffId || null,
      })),
      // Purchase intents
      ...purchases.map(purchase => ({
        id: `purchase-${purchase.id}`,
        type: 'purchase' as const,
        date: purchase.status === 'fulfilled' ? purchase.fulfilledAt : purchase.createdAt,
        customerName: `${purchase.customer.firstName} ${purchase.customer.lastName}`,
        customerId: purchase.customer.memberId,
        customerPhone: purchase.customer.phone,
        product: purchase.product.name,
        productSku: purchase.product.sku,
        productImage: purchase.product.imageUrl,
        amount: parseFloat(purchase.finalPrice.toString()),
        originalAmount: parseFloat(purchase.originalPrice.toString()),
        discountPercent: purchase.discountPercent,
        status: purchase.status,
        staffName: purchase.fulfilledByStaff
          ? `${purchase.fulfilledByStaff.firstName} ${purchase.fulfilledByStaff.lastName}`
          : null,
        staffId: purchase.fulfilledByStaff?.staffId || null,
      }))
    ];

    // Sort by date descending
    orders.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[Store Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
