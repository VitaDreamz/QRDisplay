import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET single store with full details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;

    const store = await prisma.store.findUnique({
      where: { storeId },
      include: {
        organization: true,
        displays: true,
        customers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            sampleChoice: true,
            redeemed: true,
            requestedAt: true,
            redeemedAt: true,
          },
          orderBy: { requestedAt: 'desc' }
        },
        _count: {
          select: {
            customers: true
          }
        }
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

// PATCH update store
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const body = await request.json();

    const {
      storeName,
      adminName,
      adminEmail,
      adminPhone,
      streetAddress,
      city,
      state,
      zipCode,
      staffPin,
      promoOffer,
      followupDays,
      status
    } = body;

    const store = await prisma.store.update({
      where: { storeId },
      data: {
        ...(storeName !== undefined && { storeName }),
        ...(adminName !== undefined && { adminName }),
        ...(adminEmail !== undefined && { adminEmail }),
        ...(adminPhone !== undefined && { adminPhone }),
        ...(streetAddress !== undefined && { streetAddress }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(staffPin !== undefined && { staffPin }),
        ...(promoOffer !== undefined && { promoOffer }),
        ...(followupDays !== undefined && { followupDays }),
        ...(status !== undefined && { status })
      },
      include: {
        organization: true,
        displays: true
      }
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

// DELETE store
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await context.params;
    const url = new URL(request.url);
    const resetDisplay = url.searchParams.get('resetDisplay') === 'true';

    // Get store with displays info
    const store = await prisma.store.findUnique({
      where: { storeId },
      include: { displays: true }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete all customer data for this store
      await tx.customer.deleteMany({
        where: { storeId: store.storeId }
      });

      // Delete shortlinks for this store
      await tx.shortlink.deleteMany({
        where: { storeId: store.storeId }
      });

      // Reset displays if requested
      if (resetDisplay && store.displays.length > 0) {
        await tx.display.updateMany({
          where: { 
            displayId: { 
              in: store.displays.map(d => d.displayId) 
            } 
          },
          data: {
            storeId: null,
            status: 'sold',
            activatedAt: null
          }
        });
      }

      // Delete the store
      await tx.store.delete({
        where: { storeId: store.storeId }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: 'Store and associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    );
  }
}
