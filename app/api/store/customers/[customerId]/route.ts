import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// PATCH /api/store/customers/[customerId] - Update customer sample/purchase request
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const storeIdCookie = cookieStore.get('store-id')?.value;

    if (!storeIdCookie) {
      return NextResponse.json({ error: 'No store session found' }, { status: 401 });
    }

    const { customerId } = await context.params;
    const body = await req.json();
    const { action, newSampleChoice, newProductSku } = body;

    // Get customer
    const customer = await prisma.customer.findFirst({
      where: {
        memberId: customerId,
        storeId: storeIdCookie,
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check if already redeemed
    if (customer.redeemed && action === 'cancelSample') {
      return NextResponse.json({ error: 'Sample already redeemed' }, { status: 400 });
    }

    if (action === 'cancelSample') {
      // Cancel sample request
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          currentStage: 'cancelled',
          stageChangedAt: new Date(),
        }
      });

      return NextResponse.json({ success: true, message: 'Sample request cancelled' });
    }

    if (action === 'updateSample') {
      // Update sample choice
      if (!newSampleChoice) {
        return NextResponse.json({ error: 'New sample choice required' }, { status: 400 });
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          sampleChoice: newSampleChoice,
        }
      });

      return NextResponse.json({ success: true, message: 'Sample choice updated' });
    }

    if (action === 'cancelPurchase') {
      // Cancel purchase intent
      const purchaseIntent = await prisma.purchaseIntent.findFirst({
        where: {
          customerId: customer.id,
          status: 'pending',
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (purchaseIntent) {
        await prisma.purchaseIntent.update({
          where: { id: purchaseIntent.id },
          data: {
            status: 'cancelled',
          }
        });
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          currentStage: 'cancelled',
          stageChangedAt: new Date(),
        }
      });

      return NextResponse.json({ success: true, message: 'Purchase request cancelled' });
    }

    if (action === 'updatePurchase') {
      // Update product in purchase intent
      if (!newProductSku) {
        return NextResponse.json({ error: 'New product SKU required' }, { status: 400 });
      }

      const purchaseIntent = await prisma.purchaseIntent.findFirst({
        where: {
          customerId: customer.id,
          status: 'pending',
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!purchaseIntent) {
        return NextResponse.json({ error: 'No pending purchase found' }, { status: 404 });
      }

      // Get new product details
      const product = await prisma.product.findUnique({
        where: { sku: newProductSku }
      });

      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Recalculate pricing with same discount percent
      const originalPrice = product.msrp || product.price;
      const discountPercent = purchaseIntent.discountPercent;
      const finalPrice = parseFloat(originalPrice.toString()) * (1 - discountPercent / 100);

      await prisma.purchaseIntent.update({
        where: { id: purchaseIntent.id },
        data: {
          productSku: newProductSku,
          originalPrice: originalPrice,
          finalPrice: finalPrice,
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Product updated',
        newProduct: {
          sku: product.sku,
          name: product.name,
          originalPrice: parseFloat(originalPrice.toString()),
          finalPrice: finalPrice,
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Update Customer Order API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
