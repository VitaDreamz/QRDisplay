import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addCustomerTimelineEvent, updateCustomerStage, addStoreCredit } from '@/lib/shopify';
import { generateSlug } from '@/lib/slugs';
import { awardInStoreSalePoints } from '@/lib/staff-points';

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
      // Generate returning customer promo slug if they don't have one yet
      let returningPromoSlug = null;
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: intent.customerId },
        select: { returningPromoSlug: true }
      });
      
      if (!existingCustomer?.returningPromoSlug) {
        returningPromoSlug = generateSlug();
      }
      
      const customer = await prisma.customer.update({
        where: { id: intent.customerId },
        data: {
          currentStage: 'purchased',
          stageChangedAt: new Date(),
          ...(returningPromoSlug && { returningPromoSlug })
        }
      });
      
      // Update Shopify with in-store purchase
      const org = await prisma.organization.findUnique({
        where: { id: customer.orgId } // customer.orgId is CUID, matches Organization.id
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

    // Award staff points for the sale - 10x points per dollar
    if (staff) {
      try {
        const customer = await prisma.customer.findUnique({ 
          where: { id: intent.customerId }, 
          select: { orgId: true, firstName: true, lastName: true } 
        });
        
        if (customer) {
          // Get the brand org to use correct orgId for points
          const brandOrg = await prisma.organization.findUnique({
            where: { id: customer.orgId },
            select: { orgId: true, name: true }
          });
          
          if (brandOrg) {
            // Update sales count
            await prisma.staff.update({
              where: { id: staff.id },
              data: {
                salesGenerated: { increment: 1 }
              }
            });
            
            await awardInStoreSalePoints({
              staffId: staff.id,
              storeId: intent.storeId,
              orgId: brandOrg.orgId,
              saleAmount: Number(intent.finalPrice),
              customerId: intent.customerId,
              customerName: `${customer.firstName} ${customer.lastName}`,
              purchaseIntentId: intent.id,
            });
            
            console.log(`🎯 Awarded ${Math.floor(Number(intent.finalPrice) * 10)} points to staff ${staff.id} for direct purchase`);
          }
        }
      } catch (pointsErr) {
        console.error('❌ Failed to award staff points:', pointsErr);
        // Continue anyway
      }
    }

    // Decrement inventory
    try {
      const inventoryItem = await prisma.storeInventory.findUnique({
        where: {
          storeId_productSku: {
            storeId: intent.storeId,
            productSku: intent.productSku,
          },
        },
      });

      if (inventoryItem && inventoryItem.quantityOnHand > 0) {
        await prisma.storeInventory.update({
          where: {
            storeId_productSku: {
              storeId: intent.storeId,
              productSku: intent.productSku,
            },
          },
          data: {
            quantityOnHand: {
              decrement: 1,
            },
          },
        });

        // Create inventory transaction
        await prisma.inventoryTransaction.create({
          data: {
            storeId: intent.storeId,
            productSku: intent.productSku,
            type: 'sale',
            quantity: -1,
            balanceAfter: inventoryItem.quantityOnHand - 1,
          },
        });

        console.log(`📦 Inventory decremented for ${intent.productSku}: ${inventoryItem.quantityOnHand} -> ${inventoryItem.quantityOnHand - 1}`);
      } else {
        console.warn(`⚠️  No inventory or out of stock for ${intent.productSku}`);
      }
    } catch (invErr) {
      console.error('❌ Inventory update failed:', invErr);
      // Continue anyway - don't fail the redemption
    }

    // Award store credit to the brand partnership
    if (intent.discountPercent > 0) {
      try {
        const customer = await prisma.customer.findUnique({
          where: { id: intent.customerId },
          select: { orgId: true }
        });
        
        if (!customer) {
          throw new Error('Customer not found');
        }

        // Get the brand partnership to find the promoCommission rate
        const partnership = await prisma.storeBrandPartnership.findFirst({
          where: {
            storeId: intent.storeId,
            brandId: customer.orgId,
            active: true,
          },
        });

        if (partnership) {
          const discountAmount = Number(intent.originalPrice) - Number(intent.finalPrice);
          const creditAmount = (discountAmount * partnership.promoCommission) / 100;
          const newBalance = Number(partnership.storeCreditBalance) + creditAmount;
          
          // Update the partnership's store credit balance
          await prisma.storeBrandPartnership.update({
            where: { id: partnership.id },
            data: {
              storeCreditBalance: {
                increment: creditAmount,
              },
            },
          });

          // Create transaction record for history
          await prisma.storeCreditTransaction.create({
            data: {
              storeId: intent.storeId,
              brandPartnershipId: partnership.id,
              type: 'earned',
              reason: `${partnership.promoCommission}% Discount Match - Direct Purchase Reimbursement`,
              amount: creditAmount,
              balance: newBalance,
            },
          });

          console.log(`💰 Store credit awarded: $${creditAmount.toFixed(2)} (${partnership.promoCommission}% of $${discountAmount.toFixed(2)} discount)`);
        } else {
          console.warn(`⚠️  No active brand partnership found for store ${intent.storeId} and brand ${customer.orgId}`);
        }
      } catch (creditErr) {
        console.error('❌ Store credit calculation failed:', creditErr);
        // Continue anyway - don't fail the redemption
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
