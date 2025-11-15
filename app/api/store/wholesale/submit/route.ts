import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createShopifyDraftOrder } from '@/lib/shopify';
import { decryptSafe } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const storeId = cookieStore.get('store-id')?.value;
    const role = cookieStore.get('store-role')?.value;

    if (!storeId || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cart } = await request.json();
    // cart format: { "VD-SB-60-BX": 2, "VD-BB-4-BX": 5 }

    if (!cart || Object.keys(cart).length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Get store database ID and partnerships
    const store = await prisma.store.findUnique({
      where: { storeId },
      select: {
        id: true,
        storeId: true,
        storeName: true,
        ownerEmail: true,
        adminEmail: true,
        purchasingEmail: true,
        shopifyCustomerId: true,
        brandPartnerships: {
          where: { status: 'active' },
          include: {
            brand: {
              select: {
                id: true,
                orgId: true,
                name: true,
                shopifyStoreName: true,
                shopifyAccessToken: true,
              },
            },
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // Get products
    const skus = Object.keys(cart).filter(sku => cart[sku] > 0);
    const products = await prisma.product.findMany({
      where: { sku: { in: skus } },
    });

    if (products.length === 0) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 });
    }

    // Group products by Shopify domain
    const ordersByShopify: Record<string, {
      shopifyDomain: string;
      shopifyAccessToken: string;
      brands: Set<string>;
      items: Array<{
        product: typeof products[0];
        quantity: number;
        brandOrgId: string;
        storeCreditBalance: number;
      }>;
      totalCredit: number;
      subtotal: number;
    }> = {};

    for (const product of products) {
      const quantity = cart[product.sku];
      if (quantity <= 0) continue;

      // Find the brand partnership for this product
      const partnership = store.brandPartnerships.find(
        bp => bp.brand.orgId === product.orgId
      );

      if (!partnership) {
        console.warn(`No active partnership found for product ${product.sku} (brand ${product.orgId})`);
        continue;
      }

      console.log(`🔍 Brand ${partnership.brand.name}:`, {
        orgId: partnership.brand.orgId,
        shopifyStoreName: partnership.brand.shopifyStoreName,
        hasAccessToken: !!partnership.brand.shopifyAccessToken,
        accessTokenLength: partnership.brand.shopifyAccessToken?.length,
      });

      const shopifyDomain = partnership.brand.shopifyStoreName;
      const encryptedToken = partnership.brand.shopifyAccessToken;
      const shopifyAccessToken = encryptedToken ? decryptSafe(encryptedToken) : null;

      console.log(`🔑 Decrypted token for ${partnership.brand.name}:`, {
        hasEncrypted: !!encryptedToken,
        hasDecrypted: !!shopifyAccessToken,
        decryptedLength: shopifyAccessToken?.length,
      });

      if (!shopifyDomain || !shopifyAccessToken) {
        console.warn(`❌ Brand ${partnership.brand.name} doesn't have Shopify configured (domain: ${shopifyDomain}, hasToken: ${!!shopifyAccessToken})`);
        continue;
      }

      if (!ordersByShopify[shopifyDomain]) {
        ordersByShopify[shopifyDomain] = {
          shopifyDomain,
          shopifyAccessToken,
          brands: new Set(),
          items: [],
          totalCredit: 0,
          subtotal: 0,
        };
      }

      ordersByShopify[shopifyDomain].brands.add(partnership.brand.name);
      ordersByShopify[shopifyDomain].items.push({
        product,
        quantity,
        brandOrgId: product.orgId,
        storeCreditBalance: Number(partnership.storeCreditBalance),
      });
      ordersByShopify[shopifyDomain].totalCredit += Number(partnership.storeCreditBalance);
      ordersByShopify[shopifyDomain].subtotal += Number(product.price) * quantity;
    }

    // Create wholesale orders for each Shopify domain
    const createdOrders = [];
    const orderErrors: Array<{ domain: string; error: string }> = [];

    for (const [shopifyDomain, orderData] of Object.entries(ordersByShopify)) {
      try {
        console.log(`🔄 Processing order for ${shopifyDomain}...`);
        // Calculate order totals
        const subtotal = orderData.subtotal;
        const creditApplied = Math.min(orderData.totalCredit, subtotal);
        const total = subtotal - creditApplied;

        // Generate unique order ID
        const orderCount = await prisma.wholesaleOrder.count();
        const orderId = `WO-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(orderCount + 1).padStart(3, '0')}`;

        // Create wholesale order in database
        const wholesaleOrder = await prisma.wholesaleOrder.create({
          data: {
            orderId,
            storeId: store.id,
            shopifyDomain,
            subtotal,
            creditApplied,
            total,
            status: 'pending',
            items: {
              create: orderData.items.map(item => ({
                productSku: item.product.sku,
                brandOrgId: item.brandOrgId,
                quantity: item.quantity,
                unitPrice: item.product.price,
                total: Number(item.product.price) * item.quantity,
              })),
            },
          },
          include: {
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Get or create Shopify customer for this store in this brand
        let shopifyCustomerId = wholesaleOrder.store.shopifyCustomerId;
        
        // If no customer ID exists, try to sync/create one now
        if (!shopifyCustomerId) {
          try {
            const { syncStoreToShopifyWholesale } = await import('@/lib/shopify-wholesale-sync');
            const syncResult = await syncStoreToShopifyWholesale(
              wholesaleOrder.store.storeId,
              orderData.items[0].brandOrgId // Use first brand in order
            );
            
            if (!syncResult.skipped) {
              shopifyCustomerId = syncResult.shopifyCustomerId || null;
            }
          } catch (error) {
            console.error('Failed to sync store to Shopify (continuing with order):', error);
          }
        }

        // Create Draft Order in Shopify
        const primaryEmail = wholesaleOrder.store.purchasingEmail || wholesaleOrder.store.adminEmail || wholesaleOrder.store.ownerEmail || 'store@qrdisplay.com';
        const bccEmails: string[] = [];
        
        // Add owner and admin emails to BCC if they exist and are different from primary
        if (wholesaleOrder.store.ownerEmail && wholesaleOrder.store.ownerEmail !== primaryEmail) {
          bccEmails.push(wholesaleOrder.store.ownerEmail);
        }
        if (wholesaleOrder.store.adminEmail && wholesaleOrder.store.adminEmail !== primaryEmail) {
          bccEmails.push(wholesaleOrder.store.adminEmail);
        }

        const draftOrderData = {
          line_items: orderData.items.map(item => ({
            variant_id: item.product.shopifyVariantId,
            quantity: item.quantity,
            title: item.product.name,
            price: item.product.price.toString(),
          })),
          customer: shopifyCustomerId ? {
            id: parseInt(shopifyCustomerId.replace(/\D/g, '')), // Extract numeric ID from gid://shopify/Customer/123
          } : {
            // Fallback if no customer ID (shouldn't happen)
            email: primaryEmail,
            first_name: wholesaleOrder.store.storeName,
            last_name: 'Wholesale',
          },
          billing_address: {
            first_name: wholesaleOrder.store.storeName,
            last_name: 'Wholesale',
          },
          note: `QRDisplay Wholesale Order #${orderId}\nStore: ${wholesaleOrder.store.storeId} - ${wholesaleOrder.store.storeName}\nBrands: ${Array.from(orderData.brands).join(', ')}`,
          tags: `qrdisplay,wholesale,${wholesaleOrder.store.storeId}`,
          applied_discount: creditApplied > 0 ? {
            description: 'Store Credit',
            value_type: 'fixed_amount',
            value: creditApplied.toString(),
            amount: creditApplied.toString(),
          } : undefined,
        };

        // Only add email config if we have a customer (for sending invoice after creation)
        if (shopifyCustomerId) {
          draftOrderData.email = {
            to: primaryEmail,
            bcc: bccEmails.length > 0 ? bccEmails : undefined,
            subject: `Wholesale Order #${orderId} - ${wholesaleOrder.store.storeName}`,
            custom_message: `Your wholesale order has been received! This invoice includes ${orderData.items.length} item(s) from ${Array.from(orderData.brands).join(', ')}.\n\n${creditApplied > 0 ? `Store Credit Applied: $${creditApplied.toFixed(2)}\n` : ''}Total: $${total.toFixed(2)}\n\nThank you for your order!`,
          };
        }

        const shopifyDraftOrder = await createShopifyDraftOrder(
          shopifyDomain,
          orderData.shopifyAccessToken,
          draftOrderData
        );

        // Update wholesale order with Shopify info
        await prisma.wholesaleOrder.update({
          where: { id: wholesaleOrder.id },
          data: {
            shopifyDraftOrderId: shopifyDraftOrder.id.toString(),
            shopifyDraftOrderUrl: shopifyDraftOrder.invoice_url,
            status: 'submitted',
            submittedAt: new Date(),
          },
        });

        // Deduct store credit from partnerships
        for (const item of orderData.items) {
          if (creditApplied > 0) {
            const partnership = store.brandPartnerships.find(
              bp => bp.brand.orgId === item.brandOrgId
            );
            if (partnership) {
              const creditToDeduct = Math.min(
                partnership.storeCreditBalance,
                (creditApplied / orderData.items.length) // Distribute credit evenly
              );
              
              await prisma.storeBrandPartnership.update({
                where: { id: partnership.id },
                data: {
                  storeCreditBalance: {
                    decrement: creditToDeduct,
                  },
                },
              });

              // Log credit transaction
              await prisma.storeCreditTransaction.create({
                data: {
                  storeId: store.id,
                  type: 'wholesale_order',
                  amount: -creditToDeduct,
                  balanceAfter: partnership.storeCreditBalance - creditToDeduct,
                  description: `Applied to wholesale order ${orderId}`,
                  relatedOrderId: orderId,
                },
              });
            }
          }
        }

        createdOrders.push({
          orderId: wholesaleOrder.orderId,
          shopifyDomain,
          subtotal,
          creditApplied,
          total,
          draftOrderUrl: shopifyDraftOrder.invoice_url,
          brands: Array.from(orderData.brands),
        });
      } catch (error: any) {
        const errorMessage = error?.message || 'Unknown error';
        console.error(`❌ Error creating order for ${shopifyDomain}:`, error);
        console.error('Error details:', {
          message: errorMessage,
          stack: error?.stack,
          response: error?.response?.data,
        });
        orderErrors.push({ domain: shopifyDomain, error: errorMessage });
        // Continue with other orders even if one fails
      }
    }

    if (createdOrders.length === 0) {
      console.error('❌ No orders created. Errors:', orderErrors);
      return NextResponse.json(
        { 
          error: 'Failed to create any orders',
          details: orderErrors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orders: createdOrders,
      message: `Created ${createdOrders.length} wholesale order(s)`,
    });
  } catch (error: any) {
    console.error('[Wholesale Order Submit] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit wholesale order' },
      { status: 500 }
    );
  }
}
