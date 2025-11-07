import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendBrandPromoRedemptionEmail } from '@/lib/email';
import { addCustomerTimelineEvent, updateCustomerStage } from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const { slug, pin, purchaseAmount, discountAmount } = await request.json();

    if (!slug || !pin) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Look up shortlink
    const shortlink = await prisma.shortlink.findUnique({
      where: { slug }
    });

    if (!shortlink) {
      return NextResponse.json({ error: 'Invalid promo link' }, { status: 404 });
    }

    if (shortlink.action !== 'promo-redeem') {
      return NextResponse.json({ error: 'Not a promo link' }, { status: 400 });
    }

    // 2. Validate not expired (72 hours)
    const now = new Date();
    const createdAt = new Date(shortlink.createdAt);
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursDiff > 72) {
      return NextResponse.json({ error: 'Promo link expired' }, { status: 400 });
    }

    // 3. Check if already used
    if (shortlink.redeemed || shortlink.usedAt) {
      return NextResponse.json({ error: 'Promo already redeemed' }, { status: 400 });
    }

    // 4. Get customer by memberId
    const customer = await prisma.customer.findFirst({
      where: { memberId: shortlink.memberId || '' }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // 5. Get store and validate PIN (check admin PIN or staff PINs)
    const store = await prisma.store.findUnique({
      where: { storeId: shortlink.storeId }
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Check if it's the store admin PIN
    const isAdminPin = store.staffPin === pin;
    
    // Check if it's a staff member PIN
    let staffMember = null;
    if (!isAdminPin) {
      staffMember = await prisma.staff.findFirst({
        where: {
          storeId: store.id,
          staffPin: pin,
          status: 'active'
        }
      });
    }
    
    // If neither admin nor staff PIN matches, reject
    if (!isAdminPin && !staffMember) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    // 6. Create PromoRedemption record
    await prisma.promoRedemption.create({
      data: {
        customerId: customer.id,
        storeId: store.id,
        orgId: store.orgId,
        promoOffer: store.promoOffer,
        promoSlug: slug,
        redeemedAt: new Date(),
        redeemedBy: staffMember ? `staff-${staffMember.staffId}` : 'admin',
        purchaseAmount: purchaseAmount ? parseFloat(purchaseAmount) : null,
        discountAmount: discountAmount ? parseFloat(discountAmount) : null,
        // Track which staff member redeemed (if applicable)
        ...(staffMember ? { redeemedByStaffId: staffMember.id } as any : {})
      }
    });

    // 7. Update customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        promoRedeemed: true,
        promoRedeemedAt: new Date()
      }
    });

    // 8. Mark shortlink used
    await prisma.shortlink.update({
      where: { slug },
      data: {
        usedAt: new Date(),
        redeemed: true
      }
    });

    // Send brand notification email (fire-and-forget)
    try {
      const org = await prisma.organization.findUnique({
        where: { orgId: store.orgId }
      });
      
      if (org?.supportEmail) {
        await sendBrandPromoRedemptionEmail({
          brandEmail: org.supportEmail,
          customer: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            memberId: customer.memberId,
          },
          store: {
            storeName: store.storeName,
          },
          redeemedAt: new Date(),
        });
      }
      
      // Update Shopify stage and add timeline event for in-store purchase
      if (org?.shopifyActive && (customer as any).shopifyCustomerId) {
        try {
          const shopifyCustomerId = (customer as any).shopifyCustomerId;
          
          // Get purchase intent to find what product they wanted
          const purchaseIntent = await prisma.purchaseIntent.findFirst({
            where: {
              customerId: customer.id,
              storeId: store.id,
            },
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              product: true
            }
          });
          
          // Update stage tag to converted-instore
          await updateCustomerStage(org, shopifyCustomerId, 'converted-instore');
          
          // Build timeline message with product details
          let message = `Purchased In-Store at ${store.storeName}`;
          if (purchaseIntent?.product) {
            message = `Purchased In-Store: ${purchaseIntent.product.name}`;
          }
          if (purchaseAmount) {
            message += ` ($${parseFloat(purchaseAmount).toFixed(2)}`;
            if (discountAmount) {
              message += ` - saved $${parseFloat(discountAmount).toFixed(2)}`;
            }
            message += ')';
          }
          message += ` - ${store.promoOffer}`;
          
          await addCustomerTimelineEvent(org, shopifyCustomerId, {
            message,
            occurredAt: new Date(),
          });
        } catch (shopifyErr) {
          console.error('❌ Shopify update failed:', shopifyErr);
        }
      }
    } catch (emailErr) {
      console.error('❌ Brand promo notification email failed:', emailErr);
      // Do not fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        memberId: customer.memberId
      },
      promo: store.promoOffer,
      store: store.storeName
    });
  } catch (err) {
    console.error('Error redeeming promo:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
