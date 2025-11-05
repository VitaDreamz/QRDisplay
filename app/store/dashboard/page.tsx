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
    where: { storeId }
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
    take: 100
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
      orgId: true
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
      followupDays: store.followupDays,
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
      purchasingEmail: store.purchasingEmail
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
      stageChangedAt: c.stageChangedAt
    })),
    displays: displays,
    organization: organization,
    role: role,
    staffMember: staffMember ? {
      staffId: staffMember.staffId,
      firstName: staffMember.firstName,
      lastName: staffMember.lastName
    } : null
  };

  return <StoreDashboardClient initialData={data} role={role} />;
}
