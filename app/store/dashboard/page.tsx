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
