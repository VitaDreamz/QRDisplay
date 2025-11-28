import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import BrandDashboardClient from './BrandDashboardClient';

export default async function BrandDashboardPage({ params }: { params: { orgId: string } }) {
  const { userId, orgId: clerkOrgId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { orgId } = params;

  // Verify user has access to this brand
  if (clerkOrgId !== orgId) {
    redirect('/');
  }

  // Fetch brand organization
  const organization = await prisma.organization.findUnique({
    where: { orgId },
  });

  if (!organization || organization.type !== 'brand') {
    redirect('/');
  }

  // Fetch products for this brand
  const products = await prisma.product.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch store partnerships
  const storePartnerships = await prisma.storeBrandPartnership.findMany({
    where: { brandOrgId: orgId },
    include: {
      store: {
        include: {
          organization: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch billboard slides
  const billboardSlides = await prisma.brandSlide.findMany({
    where: { brandOrgId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch brand members (sales reps)
  const brandMembers = await prisma.user.findMany({
    where: { orgId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  // Calculate analytics
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const newStoresThisMonth = storePartnerships.filter(
    (sp) => sp.createdAt >= thirtyDaysAgo
  ).length;

  const activeProducts = products.filter((p) => p.status === 'active');
  const sampleProducts = activeProducts.filter((p) => p.productType === 'sample');
  const fullSizeProducts = activeProducts.filter((p) => p.productType === 'full-size');

  return (
    <BrandDashboardClient
      organization={organization}
      products={products}
      storePartnerships={storePartnerships}
      billboardSlides={billboardSlides}
      brandMembers={brandMembers}
      stats={{
        totalStores: storePartnerships.length,
        newStoresThisMonth,
        activeProducts: activeProducts.length,
        sampleProducts: sampleProducts.length,
        fullSizeProducts: fullSizeProducts.length,
        billboardSlides: billboardSlides.length,
      }}
    />
  );
}
