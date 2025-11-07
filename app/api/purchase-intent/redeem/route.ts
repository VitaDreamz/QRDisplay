import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addCustomerTimelineEvent, updateCustomerStage } from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const { verifySlug, staffPin } = await request.json();

    if (!verifySlug || !staffPin) {
      return NextResponse.json({ error: 'verifySlug and staffPin are required' }, { status: 400 });
    }

    const intent = await prisma.purchaseIntent.findUnique({ where: { verifySlug } });

    if (!intent) {
      return NextResponse.json({ error: 'Purchase intent not found' }, { status: 404 });
    }

    if (intent.status === 'fulfilled') {
      return NextResponse.json({ ok: true, message: 'Already fulfilled' });
    }

    // Validate staff PIN OR store admin PIN
    const staff = await prisma.staff.findFirst({
      where: {
        storeId: intent.storeId,
        staffPin
      }
    });

    let isStoreAdmin = false;

    // If no staff found, check if it's the store admin's PIN
    if (!staff) {
      const store = await prisma.store.findUnique({
        where: { id: intent.storeId },
        select: { staffPin: true, storeName: true }
      });

      if (!store || store.staffPin !== staffPin) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
      }

      // Store admin PIN is valid
      isStoreAdmin = true;
    }

    const updated = await prisma.purchaseIntent.update({
      where: { id: intent.id },
      data: {
        status: 'fulfilled',
        fulfilledAt: new Date(),
        // Only set staff ID if it's actual staff (not store admin)
        ...(staff ? { fulfilledByStaffId: staff.id as any } : {})
      } as any
    });

    // Update customer status to "purchased"
    try {
      const customer = await prisma.customer.update({
        where: { id: intent.customerId },
        data: {
          currentStage: 'purchased',
          stageChangedAt: new Date()
        }
      });
      
      // Update Shopify with in-store purchase
      const org = await prisma.organization.findUnique({
        where: { orgId: customer.orgId }
      });
      
      const store = await prisma.store.findUnique({
        where: { id: intent.storeId }
      });
      
      const product = await prisma.product.findUnique({
        where: { sku: intent.productSku }
      });
      
      if (org?.shopifyActive && (customer as any).shopifyCustomerId) {
        try {
          const shopifyCustomerId = (customer as any).shopifyCustomerId;
          
          // Update stage tag to converted-instore
          await updateCustomerStage(org, shopifyCustomerId, 'converted-instore');
          
          // Build timeline message with product details
          let message = `Purchased In-Store: ${product?.name || intent.productSku}`;
          message += ` ($${intent.finalPrice.toFixed(2)})`;
          if (intent.discountPercent > 0) {
            const savings = Number(intent.originalPrice) - Number(intent.finalPrice);
            message += ` - saved $${savings.toFixed(2)} (${intent.discountPercent}% off)`;
          }
          message += ` at ${store?.storeName}`;
          
          await addCustomerTimelineEvent(org, shopifyCustomerId, {
            message,
            occurredAt: new Date(),
          });
        } catch (shopifyErr) {
          console.error('❌ Shopify update failed:', shopifyErr);
        }
      }
    } catch (e) {
      console.warn('Failed to update customer status to purchased:', e);
    }

    // Increment staff sales counter (for leaderboard) - only if it's a staff member
    if (staff) {
      try {
        await prisma.staff.update({
          where: { id: staff.id },
          data: { salesGenerated: { increment: 1 } }
        });
      } catch (e) {
        console.warn('Failed to increment staff salesGenerated:', e);
      }
    }

    return NextResponse.json({ 
      ok: true, 
      intent: updated, 
      staff: staff ? { id: staff.id, name: `${staff.firstName} ${staff.lastName}` } : { isStoreAdmin: true }
    });
  } catch (error) {
    console.error('[Purchase Intent Redeem API] POST error:', error);
    return NextResponse.json({ error: 'Failed to redeem purchase intent' }, { status: 500 });
  }
}
