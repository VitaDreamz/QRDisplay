import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import BrandDashboardClient from './BrandDashboardClient';

// Types for store inventory
export type StoreInventoryItem = {
  sku: string;
  name: string;
  productType: string;
  price: number;
  imageUrl: string | null;
  quantityOnHand: number;
  lowStockThreshold: number;
};

export type BrandStoreStats = {
  storeCredit: number;
  wholesaleOrders: number;
  wholesaleSpent: number;
  customers: number;
  samplesGiven: number;
  promosRedeemed: number;
  totalSales: number;
  inventory: StoreInventoryItem[];
  outOfStockCount: number;
  lowStockCount: number;
};

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
  const organization = await prisma.organizations.findUnique({
    where: { orgId },
  });

  if (!organization || organization.type !== 'brand') {
    redirect('/');
  }

  // Fetch products for this brand (needed for inventory matching)
  const products = await prisma.products.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  const brandProductSkus = products.map((p) => p.sku);

  // Fetch store partnerships with related data
  const storePartnerships = await prisma.store_brand_partnerships.findMany({
    where: { brandId: organization.id },
    include: {
      stores: {
        include: {
          organizations: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get all store IDs for aggregation queries
  const storeIds = storePartnerships.map((sp) => sp.stores.id);

  // Fetch brand-specific stats for each store in parallel
  const [
    wholesaleOrdersByStore,
    samplesByStore,
    promosByStore,
    inventoryByStore,
    brandCustomersByStore,
  ] = await Promise.all([
    // Wholesale orders from each store to this brand
    storeIds.length > 0 ? prisma.wholesale_orders.groupBy({
      by: ['storeId'],
      where: {
        brandId: organization.id,
        storeId: { in: storeIds },
        status: { not: 'cancelled' },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    }) : Promise.resolve([]),
    
    // Samples given at each store for this brand's products
    storeIds.length > 0 ? prisma.sample_history.groupBy({
      by: ['storeId'],
      where: {
        storeId: { in: storeIds },
        brandId: organization.id,
      },
      _count: { id: true },
    }) : Promise.resolve([]),
    
    // Promo redemptions at each store for this brand
    storeIds.length > 0 ? prisma.promo_redemptions.groupBy({
      by: ['storeId'],
      where: {
        storeId: { in: storeIds },
        orgId: orgId,
        redeemedAt: { not: null },
      },
      _count: { id: true },
      _sum: { purchaseAmount: true },
    }) : Promise.resolve([]),
    
    // Inventory at each store for this brand's products
    storeIds.length > 0 && brandProductSkus.length > 0 ? prisma.store_inventory.findMany({
      where: {
        storeId: { in: storeIds },
        productSku: { in: brandProductSkus },
      },
      include: {
        products: true,
      },
    }) : Promise.resolve([]),
    
    // Count unique customers who have sampled this brand's products at each store
    storeIds.length > 0 ? prisma.sample_history.findMany({
      where: {
        storeId: { in: storeIds },
        brandId: organization.id,
        customerId: { not: null },
      },
      select: {
        storeId: true,
        customerId: true,
      },
      distinct: ['storeId', 'customerId'],
    }) : Promise.resolve([]),
  ]);

  // Transform aggregated data into maps for easy lookup
  type WholesaleData = { count: number; total: number };
  type PromoData = { count: number; sales: number };
  
  const wholesaleMap = new Map<string, WholesaleData>(
    wholesaleOrdersByStore.map((w) => [
      w.storeId, 
      { count: w._count.id, total: Number(w._sum.totalAmount || 0) }
    ])
  );
  
  const samplesMap = new Map<string, number>(
    samplesByStore.map((s) => [s.storeId, s._count.id])
  );
  
  const promosMap = new Map<string, PromoData>(
    promosByStore.map((p) => [
      p.storeId, 
      { count: p._count.id, sales: Number(p._sum.purchaseAmount || 0) }
    ])
  );
  
  // Group inventory by store
  type InventoryRecord = typeof inventoryByStore[number];
  const inventoryMap = new Map<string, InventoryRecord[]>();
  inventoryByStore.forEach((inv) => {
    const existing = inventoryMap.get(inv.storeId) || [];
    existing.push(inv);
    inventoryMap.set(inv.storeId, existing);
  });
  
  // Count unique customers per store
  const customerCountMap = new Map<string, number>();
  brandCustomersByStore.forEach((c) => {
    customerCountMap.set(c.storeId, (customerCountMap.get(c.storeId) || 0) + 1);
  });

  // Enrich store partnerships with brand-specific stats
  const enrichedPartnerships = storePartnerships.map((sp) => {
    const storeInventory = inventoryMap.get(sp.stores.id) || [];
    const outOfStockCount = storeInventory.filter((inv) => inv.quantityOnHand === 0).length;
    const lowStockCount = storeInventory.filter((inv) => 
      inv.quantityOnHand > 0 && inv.quantityOnHand <= (inv.lowStockThreshold || 5)
    ).length;
    
    const wholesale = wholesaleMap.get(sp.stores.id) || { count: 0, total: 0 };
    const promos = promosMap.get(sp.stores.id) || { count: 0, sales: 0 };
    
    return {
      id: sp.id,
      storeId: sp.storeId,
      brandId: sp.brandId,
      status: sp.status,
      createdAt: sp.createdAt,
      store: {
        id: sp.stores.id,
        storeId: sp.stores.storeId,
        storeName: sp.stores.storeName,
        streetAddress: sp.stores.streetAddress,
        city: sp.stores.city,
        state: sp.stores.state,
        zipCode: sp.stores.zipCode,
        organization: {
          name: sp.stores.organizations.name,
          logoUrl: sp.stores.organizations.logoUrl,
        },
      },
      storeCreditBalance: Number(sp.storeCreditBalance || 0),
      onlineCommission: Number(sp.onlineCommission || 20),
      subscriptionCommission: Number(sp.subscriptionCommission || 5),
      promoCommission: Number(sp.promoCommission || 50),
      brandStats: {
        storeCredit: Number(sp.storeCreditBalance || 0),
        wholesaleOrders: wholesale.count,
        wholesaleSpent: wholesale.total,
        customers: customerCountMap.get(sp.stores.id) || 0,
        samplesGiven: samplesMap.get(sp.stores.id) || 0,
        promosRedeemed: promos.count,
        totalSales: promos.sales,
        inventory: storeInventory.map((inv) => ({
          sku: inv.productSku,
          name: inv.products.name,
          productType: inv.products.productType,
          price: Number(inv.products.price),
          imageUrl: inv.products.imageUrl,
          quantityOnHand: inv.quantityOnHand,
          lowStockThreshold: inv.lowStockThreshold || 5,
        })),
        outOfStockCount,
        lowStockCount,
      },
    };
  });

  // Fetch brand members (sales reps)
  const brandMembers = await prisma.users.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
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

  const activeProducts = products.filter((p) => p.active);
  const sampleProducts = activeProducts.filter((p) => p.productType === 'sample');
  const fullSizeProducts = activeProducts.filter((p) => p.productType === 'retail');

  // Get default commission rates from first partnership (they're the same across all stores)
  const defaultCommissions = enrichedPartnerships[0] || {
    promoCommission: 50,
    onlineCommission: 20,
    subscriptionCommission: 5,
  };

  return (
    <BrandDashboardClient
      organization={organization}
      products={products}
      storePartnerships={enrichedPartnerships}
      billboardSlides={[]} // No billboard slides table exists yet
      brandMembers={brandMembers}
      commissionRates={{
        promo: defaultCommissions.promoCommission,
        online: defaultCommissions.onlineCommission,
        subscription: defaultCommissions.subscriptionCommission,
      }}
      stats={{
        totalStores: storePartnerships.length,
        newStoresThisMonth,
        activeProducts: activeProducts.length,
        sampleProducts: sampleProducts.length,
        fullSizeProducts: fullSizeProducts.length,
        billboardSlides: 0,
      }}
    />
  );
}
