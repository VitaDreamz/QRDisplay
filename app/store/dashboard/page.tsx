import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import StoreDashboardClient from './StoreDashboardClient';

export default async function StoreDashboardPage() {
  // Check for PIN-based session
  const cookieStore = await cookies();
  const storeId = cookieStore.get('store-id')?.value;
  const role = cookieStore.get('store-role')?.value as 'owner' | 'staff' | undefined;
  const staffId = cookieStore.get('staff-id')?.value;

  if (!storeId || !role) {
    // Find the store to redirect to the right login page
    redirect('/store/login');
  }

  // Fetch store data
  const store = await prisma.store.findUnique({
    where: { storeId },
    select: {
      id: true,
      storeId: true,
      orgId: true,
      storeName: true,
      streetAddress: true,
      city: true,
      state: true,
      zipCode: true,
      ownerName: true,
      ownerPhone: true,
      ownerEmail: true,
      adminName: true,
      adminEmail: true,
      adminPhone: true,
      purchasingManager: true,
      purchasingPhone: true,
      purchasingEmail: true,
      subscriptionTier: true,
      staffPin: true,
      storeCredit: true,
      availableSamples: true,
      availableProducts: true,
      promoOffer: true,
      returningCustomerPromo: true,
      followupDays: true,
      postPurchaseFollowupDays: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  if (!store) {
    redirect(`/store/login/${storeId}?error=notfound`);
  }

  // If staff login, verify staff member exists and is active
  let staffMember = null;
  if (role === 'staff' && staffId) {
    staffMember = await prisma.staff.findFirst({
      where: {
        staffId: staffId,
        storeId: store.id
      }
    });

    if (!staffMember || staffMember.status !== 'active') {
      // Clear invalid staff session
      cookieStore.delete('store-id');
      cookieStore.delete('store-role');
      cookieStore.delete('staff-id');
      redirect(`/store/login/${storeId}?error=invalid`);
    }
  }
  
  const customers = await prisma.customer.findMany({
    where: { storeId },
    orderBy: { requestedAt: 'desc' },
    take: 100,
    include: {
      purchaseIntents: {
        include: {
          product: true
        },
        orderBy: { createdAt: 'desc' }
      },
      // Multi-brand: Include sample history to show which brands they sampled
      sampleHistory: {
        include: {
          brand: {
            select: {
              orgId: true,
              name: true,
              logoUrl: true,
            }
          }
        },
        orderBy: { sampledAt: 'desc' }
      }
    }
  });
  
  const displays = await prisma.display.findMany({
    where: { storeId },
    select: {
      displayId: true,
      status: true
    }
  });
  
  const organization = await prisma.organization.findUnique({
    where: { orgId: store?.orgId || '' },
    select: {
      name: true,
      orgId: true,
      shopifyStoreName: true,
      shopifyAccessToken: true,
    }
  });

  // Multi-brand: Fetch brand partnerships
  const brandPartnerships = await prisma.storeBrandPartnership.findMany({
    where: {
      storeId: store.id,
      active: true
    },
    include: {
      brand: {
        select: {
          orgId: true,
          name: true,
          logoUrl: true,
        }
      }
    }
  });

  // Multi-brand: Fetch inventory (which includes products from all brands)
  // Filter to only show retail and sample products (exclude wholesale boxes for dashboard view)
  const inventory = await prisma.storeInventory.findMany({
    where: { 
      storeId: store.id,
      product: {
        productType: {
          not: 'wholesale-box' // Only show retail and sample products
        }
      }
    },
    include: {
      product: {
        select: {
          sku: true,
          name: true,
          orgId: true,
          price: true,
          imageUrl: true,
          productType: true,
          description: true,
        }
      }
    }
  });

  // Multi-brand: Fetch wholesale products (for wholesale modal)
  const wholesaleInventory = await prisma.storeInventory.findMany({
    where: { 
      storeId: store.id,
      product: {
        productType: 'wholesale-box' // Only wholesale boxes
      }
    },
    include: {
      product: {
        select: {
          sku: true,
          name: true,
          orgId: true,
          price: true,
          imageUrl: true,
          productType: true,
          description: true,
        }
      }
    }
  });

  // Fetch pending/ready purchase intents with customer and product details
  const purchaseIntents = await prisma.purchaseIntent.findMany({
    where: {
      storeId: store.id,
      status: { in: ['pending', 'ready', 'fulfilled'] }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      product: true
    }
  });

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
          <p className="text-gray-600">Unable to load store data.</p>
        </div>
      </div>
    );
  }

  const data = {
    store: {
      id: store.id,
      storeId: store.storeId,
      storeName: store.storeName,
      promoOffer: store.promoOffer,
      returningCustomerPromo: store.returningCustomerPromo || '10%-off In-Store Purchase',
      followupDays: store.followupDays,
      postPurchaseFollowupDays: store.postPurchaseFollowupDays || [45, 90],
      adminName: store.adminName,
      adminEmail: store.adminEmail,
      adminPhone: store.adminPhone,
      staffPin: store.staffPin,
      streetAddress: store.streetAddress,
      city: store.city,
      state: store.state,
      zipCode: store.zipCode,
      ownerName: store.ownerName,
      ownerPhone: store.ownerPhone,
      ownerEmail: store.ownerEmail,
      purchasingManager: store.purchasingManager,
      purchasingPhone: store.purchasingPhone,
      purchasingEmail: store.purchasingEmail,
      availableSamples: store.availableSamples as string[],
      availableProducts: store.availableProducts as string[],
      storeCredit: Number(store.storeCredit || 0)
    },
    // Multi-brand: Brand partnerships with their products
    brandPartnerships: brandPartnerships.map((bp) => ({
      id: bp.id,
      status: bp.status,
      onlineCommission: Number(bp.onlineCommission || 20),
      subscriptionCommission: Number(bp.subscriptionCommission || 5),
      promoCommission: Number(bp.promoCommission || 50),
      storeCreditBalance: Number(bp.storeCreditBalance || 0),
      active: bp.active,
      availableSamples: bp.availableSamples,
      availableProducts: bp.availableProducts,
      brand: {
        orgId: bp.brand.orgId,
        name: bp.brand.name,
        logoUrl: bp.brand.logoUrl,
      }
    })),
    // Multi-brand: Store inventory (products from all brands)
    inventory: inventory.map((inv) => ({
      id: inv.id,
      productSku: inv.productSku,
      quantityOnHand: inv.quantityOnHand,
      quantityAvailable: inv.quantityAvailable,
      product: inv.product ? {
        sku: inv.product.sku,
        name: inv.product.name,
        orgId: inv.product.orgId,
        price: Number(inv.product.price),
        imageUrl: inv.product.imageUrl,
        productType: inv.product.productType,
        description: inv.product.description,
      } : null
    })),
    // Multi-brand: Wholesale inventory (for wholesale modal)
    wholesaleInventory: wholesaleInventory.map((inv) => ({
      id: inv.id,
      productSku: inv.productSku,
      quantityOnHand: inv.quantityOnHand,
      quantityAvailable: inv.quantityAvailable,
      product: inv.product ? {
        sku: inv.product.sku,
        name: inv.product.name,
        orgId: inv.product.orgId,
        price: Number(inv.product.price),
        imageUrl: inv.product.imageUrl,
        productType: inv.product.productType,
        description: inv.product.description,
      } : null
    })),
    customers: customers.map((c: any) => ({
      id: c.id,
      memberId: c.memberId,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      sampleChoice: c.sampleChoice,
      redeemed: c.redeemed,
      promoRedeemed: c.promoRedeemed,
      requestedAt: c.requestedAt,
      redeemedAt: c.redeemedAt,
      promoRedeemedAt: c.promoRedeemedAt,
      currentStage: c.currentStage,
      stageChangedAt: c.stageChangedAt,
      // Multi-brand: Include sample history with brand info
      sampleHistory: c.sampleHistory.map((sh: any) => ({
        id: sh.id,
        productSku: sh.productSku,
        productName: sh.productName,
        sampledAt: sh.sampledAt,
        brand: sh.brand ? {
          orgId: sh.brand.orgId,
          name: sh.brand.name,
          logoUrl: sh.brand.logoUrl,
        } : null,
      })),
      totalPurchases: c.purchaseIntents
        .filter((pi: any) => pi.status === 'fulfilled')
        .reduce((sum: number, pi: any) => sum + Number(pi.finalPrice), 0),
      purchaseIntents: c.purchaseIntents.map((pi: any) => ({
        id: pi.id,
        status: pi.status,
        verifySlug: pi.verifySlug,
        createdAt: pi.createdAt,
        originalPrice: Number(pi.originalPrice),
        discountPercent: pi.discountPercent,
        finalPrice: Number(pi.finalPrice),
        fulfilledAt: pi.fulfilledAt,
        product: pi.product ? {
          sku: pi.product.sku,
          name: pi.product.name,
          price: Number(pi.product.price),
          imageUrl: pi.product.imageUrl
        } : null
      }))
    })),
    displays: displays,
    organization: organization,
    purchaseIntents: purchaseIntents.map((i: any) => ({
      id: i.id,
      status: i.status,
      verifySlug: i.verifySlug,
      createdAt: i.createdAt,
      originalPrice: Number(i.originalPrice),
      discountPercent: i.discountPercent,
      finalPrice: Number(i.finalPrice),
      fulfilledAt: i.fulfilledAt,
      product: {
        sku: i.product.sku,
        name: i.product.name,
        imageUrl: i.product.imageUrl
      },
      customer: {
        memberId: i.customer.memberId,
        firstName: i.customer.firstName,
        lastName: i.customer.lastName,
        phone: i.customer.phone
      }
    })),
    role: role,
    staffMember: staffMember ? {
      staffId: staffMember.staffId,
      firstName: staffMember.firstName,
      lastName: staffMember.lastName
    } : null
  };

  return <StoreDashboardClient initialData={data} role={role} />;
}
