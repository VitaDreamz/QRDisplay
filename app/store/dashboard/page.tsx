import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import StoreDashboardClient from './StoreDashboardClient';

export default async function StoreDashboardPage() {
  // Check for magic link session
  const cookieStore = await cookies();
  const storeId = cookieStore.get('store-id')?.value;
  const sessionToken = cookieStore.get('store-session')?.value;

  if (!storeId || !sessionToken) {
    redirect('/store/login');
  }

  // Verify the session is still valid
  const magicLink = await prisma.magicLink.findUnique({
    where: { token: sessionToken }
  });

  if (!magicLink || !magicLink.used || magicLink.storeId !== storeId) {
    redirect('/store/login?error=invalid');
  }

  // Fetch store data
  const store = await prisma.store.findUnique({
    where: { storeId }
  });

  if (!store) {
    redirect('/store/login?error=notfound');
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
      name: true
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
      contactName: store.contactName,
      contactEmail: store.contactEmail,
      contactPhone: store.contactPhone,
      staffPin: store.staffPin,
      streetAddress: store.streetAddress,
      city: store.city,
      state: store.state,
      zipCode: store.zipCode
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
      requestedAt: c.requestedAt
    })),
    displays: displays,
    organization: organization
  };

  return <StoreDashboardClient initialData={data} userId={storeId} />;
}
