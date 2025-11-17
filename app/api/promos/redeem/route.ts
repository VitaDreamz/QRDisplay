import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendBrandPromoRedemptionEmail } from '@/lib/email';
import { addCustomerTimelineEvent, updateCustomerStage } from '@/lib/shopify';
import { awardInStoreSalePoints } from '@/lib/staff-points';
import { generateSlug } from '@/lib/slugs';

export async function POST(request: NextRequest) {
  try {
    const { slug, pin, purchaseAmount, discountAmount, productSku, finalPrice, discountPercent } = await request.json();

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

    const isDirect = shortlink.action === 'promo-redeem-direct';
    
    if (shortlink.action !== 'promo-redeem' && !isDirect) {
      return NextResponse.json({ error: 'Not a promo link' }, { status: 400 });
    }
    
    // For direct purchases, require product info
    if (isDirect && (!productSku || !finalPrice || !discountPercent)) {
      return NextResponse.json({ error: 'Missing product information for direct purchase' }, { status: 400 });
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
      console.error(`❌ Customer not found for memberId: ${shortlink.memberId}`);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    console.log(`👤 Found customer ${customer.memberId} (stage: ${customer.currentStage}, isDirect: ${isDirect})`);

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

    // 6. Create or Update PromoRedemption record
    const finalPurchaseAmount = isDirect ? parseFloat(finalPrice.toString()) : (purchaseAmount ? parseFloat(purchaseAmount) : null);
    const finalDiscountAmount = isDirect 
      ? (parseFloat(finalPrice.toString()) / (1 - discountPercent / 100)) * (discountPercent / 100)
      : (discountAmount ? parseFloat(discountAmount) : null);
    
    // For direct purchases, the PromoRedemption already exists - just update it
    if (isDirect) {
      await prisma.promoRedemption.update({
        where: { promoSlug: slug },
        data: {
          redeemedAt: new Date(),
          redeemedBy: staffMember ? `staff-${staffMember.staffId}` : 'admin',
          purchaseAmount: finalPurchaseAmount,
          discountAmount: finalDiscountAmount,
          // Track which staff member redeemed (if applicable)
          ...(staffMember ? { redeemedByStaffId: staffMember.id } as any : {})
        }
      });
    } else {
      // For regular promos, create a new record
      await prisma.promoRedemption.create({
        data: {
          customerId: customer.id,
          storeId: store.id,
          orgId: customer.orgId, // Use customer's orgId (CUID), not store.orgId string
          promoOffer: store.promoOffer,
          promoSlug: slug,
          redeemedAt: new Date(),
          redeemedBy: staffMember ? `staff-${staffMember.staffId}` : 'admin',
          purchaseAmount: finalPurchaseAmount,
          discountAmount: finalDiscountAmount,
          // Track which staff member redeemed (if applicable)
          ...(staffMember ? { redeemedByStaffId: staffMember.id } as any : {})
        }
      });
    }

    // 7. Decrement inventory for ALL promo redemptions (both direct and regular)
    if (productSku) {
      try {
        // Decrement inventory
        const inventoryItem = await prisma.storeInventory.findUnique({
          where: {
            storeId_productSku: {
              storeId: store.id,
              productSku: productSku
            }
          }
        });

        if (inventoryItem && inventoryItem.quantityOnHand > 0) {
          await prisma.storeInventory.update({
            where: {
              storeId_productSku: {
                storeId: store.id,
                productSku: productSku
              }
            },
            data: {
              quantityOnHand: { decrement: 1 }
            }
          });

          // Create inventory transaction
          await prisma.inventoryTransaction.create({
            data: {
              storeId: store.id,
              productSku: productSku,
              quantity: -1,
              type: 'sale',
              balanceAfter: inventoryItem.quantityOnHand - 1,
              notes: `${isDirect ? 'Direct purchase' : 'Promo redemption'} by ${customer.firstName} ${customer.lastName} (${customer.memberId})`
            }
          });
          console.log(`📦 Inventory decremented for ${productSku}: ${inventoryItem.quantityOnHand} -> ${inventoryItem.quantityOnHand - 1}`);
        } else {
          console.warn(`⚠️  No inventory or out of stock for ${productSku}`);
        }
      } catch (invErr) {
        console.error('❌ Inventory update failed:', invErr);
        // Continue anyway
      }
    }

    // 7.5. Track staff sales and award points (for ALL sales with staff member)
    if (staffMember && finalPurchaseAmount && finalPurchaseAmount > 0) {
      try {
        await prisma.staff.update({
          where: { id: staffMember.id },
          data: {
            salesGenerated: { increment: 1 }
          }
        });
        
        console.log(`💰 Processing points for $${finalPurchaseAmount} sale by staff ${staffMember.staffId} (${isDirect ? 'direct purchase' : 'promo redemption'})`);
        
        // Get the brand org to use correct orgId for points
        const brandOrg = await prisma.organization.findUnique({
          where: { id: customer.orgId },
          select: { orgId: true, name: true }
        });
        
        if (!brandOrg) {
          console.error(`❌ Brand org not found for customer orgId: ${customer.orgId}`);
          throw new Error('Brand organization not found');
        }
        
        console.log(`🎯 Awarding points to staff ${staffMember.staffId} for ${brandOrg.name} sale`);
        
        await awardInStoreSalePoints({
          staffId: staffMember.id,
          storeId: store.id,
          orgId: brandOrg.orgId, // Use brand's orgId, not store's
          saleAmount: finalPurchaseAmount,
          customerId: customer.id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          purchaseIntentId: '', // Promo redemptions don't need purchase intent
        });
        console.log(`✅ In-store points awarded: ${Math.floor(finalPurchaseAmount * 10)} points (10x)`);
      } catch (pointsErr) {
        console.error('❌ Failed to award staff points:', pointsErr);
        // Continue anyway
      }
    }

    // 7.6. Award store credit to the brand partnership
    if (finalDiscountAmount && finalDiscountAmount > 0) {
      try {
        // Get the brand partnership to find the promoCommission rate
        const partnership = await prisma.storeBrandPartnership.findFirst({
          where: {
            storeId: store.id,
            brandId: customer.orgId, // customer.orgId is the brand's internal ID
            active: true,
          },
        });

        if (partnership) {
          const creditAmount = (finalDiscountAmount * partnership.promoCommission) / 100;
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
              storeId: store.id,
              brandPartnershipId: partnership.id,
              type: 'earned',
              reason: `${partnership.promoCommission}% Discount Match - Purchase Reimbursement`,
              amount: creditAmount,
              balance: newBalance,
            },
          });

          console.log(`💰 Store credit awarded: $${creditAmount.toFixed(2)} (${partnership.promoCommission}% of $${finalDiscountAmount.toFixed(2)} discount)`);
        } else {
          console.warn(`⚠️  No active brand partnership found for store ${store.storeId} and brand ${customer.orgId}`);
        }
      } catch (creditErr) {
        console.error('❌ Store credit calculation failed:', creditErr);
        // Continue anyway - don't fail the redemption
      }
    }

    // 8. Update customer
    // Generate returning customer promo slug if they don't have one yet
    let returningPromoSlug = customer.returningPromoSlug;
    if (!returningPromoSlug) {
      returningPromoSlug = generateSlug();
    }
    
    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        promoRedeemed: true,
        promoRedeemedAt: new Date(),
        currentStage: 'purchased',
        stageChangedAt: new Date(),
        promoRedeemedByStaffId: staffMember?.id,
        returningPromoSlug
      }
    });
    
    console.log(`✅ Customer ${updatedCustomer.memberId} updated to 'purchased' stage (was: ${customer.currentStage})`);
    console.log(`✅ Returning promo slug: ${returningPromoSlug}`);

    // 9. For direct purchases, mark the PurchaseIntent as fulfilled
    if (isDirect) {
      try {
        const purchaseIntent = await prisma.purchaseIntent.findFirst({
          where: {
            customerId: customer.id,
            verifySlug: slug,
            status: 'pending'
          }
        });
        
        if (purchaseIntent) {
          await prisma.purchaseIntent.update({
            where: { id: purchaseIntent.id },
            data: {
              status: 'fulfilled',
              fulfilledAt: new Date()
            }
          });
          console.log(`✅ PurchaseIntent marked as fulfilled for customer ${customer.memberId}`);
        }
      } catch (piErr) {
        console.error('❌ Failed to update PurchaseIntent:', piErr);
        // Continue anyway - don't fail the redemption
      }
    }

    // 10. Mark shortlink used
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
