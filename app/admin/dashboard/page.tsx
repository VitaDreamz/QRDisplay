import prisma from '@/lib/prisma';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  try {
    // Parallel data fetching for performance
    const [displays, stores, customers, organizations, promoRedemptions, purchaseIntents] = await Promise.all([
      prisma.display.findMany({
        include: { 
          organization: true, 
          store: true 
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.store.findMany({
        include: {
          organization: true,
          displays: true,
          _count: { 
            select: { 
              customers: true, 
              displays: true 
            } 
          },
          customers: {
            select: {
              id: true,
              redeemed: true
            }
          }
        },
        orderBy: { activatedAt: 'desc' }
      }),
      prisma.customer.findMany({
        include: { 
          store: true, 
          organization: true 
        },
        orderBy: { requestedAt: 'desc' }
      }),
      prisma.organization.findMany({
        select: { 
          id: true,  // CUID for foreign key references
          orgId: true, 
          name: true,
          type: true,
          logoUrl: true,
          supportEmail: true,
          supportPhone: true,
          websiteUrl: true,
          customerServiceEmail: true,
          customerServicePhone: true,
          commissionRate: true,
          brandTier: true,
          brandStatus: true,
          maxStoresPerMonth: true,
          maxSampleProducts: true,
          maxFullSizeProducts: true,
          storesAddedThisMonth: true,
          currentActiveStores: true,
          transactionFeePercent: true,
          monthlyPlatformFee: true,
          approvalStatus: true,
          createdAt: true
        },
        where: {
          type: 'client' // Only show client brands, not platform
        },
        orderBy: { name: 'asc' }
      }),
      prisma.promoRedemption.findMany({
        select: {
          id: true,
          redeemedAt: true,
          purchaseAmount: true,
          discountAmount: true,
          promoOffer: true,
          promoSlug: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberId: true,
              returningPromoSlug: true
            }
          },
          store: {
            select: {
              id: true,
              storeName: true,
              storeId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchaseIntent.findMany({
        select: {
          id: true,
          finalPrice: true,
          status: true,
          createdAt: true,
          fulfilledAt: true
        }
      })
    ]);

    // Calculate stats from PurchaseIntents (actual sales tracking)
    // Direct purchases (fulfilled PurchaseIntents)
    const directSales = purchaseIntents
      .filter(pi => pi.status === 'fulfilled')
      .reduce((sum, pi) => sum + Number(pi.finalPrice), 0);
    
    // Promo redemptions (completed sales)
    const promoSales = promoRedemptions
      .filter(pr => pr.redeemedAt !== null && pr.purchaseAmount)
      .reduce((sum, pr) => sum + Number(pr.purchaseAmount), 0);
    
    // Total completed sales across all channels
    const totalSales = directSales + promoSales;
    
    // Pending sales (purchase intents not yet fulfilled)
    const pendingSales = purchaseIntents
      .filter(pi => pi.status === 'pending')
      .reduce((sum, pi) => sum + Number(pi.finalPrice), 0);

    // Calculate return purchases (customers with multiple purchase intents that were actually purchased)
    const customerPurchaseCounts = new Map<string, number>();
    customers.forEach(customer => {
      if (customer.currentStage === 'purchased' || customer.currentStage === 'repeat') {
        const count = customerPurchaseCounts.get(customer.memberId) || 0;
        customerPurchaseCounts.set(customer.memberId, count + 1);
      }
    });
    const returnPurchases = Array.from(customerPurchaseCounts.values()).filter(count => count > 1).reduce((sum, count) => sum + (count - 1), 0);

    const stats = {
      activeDisplays: displays.filter(d => d.status === 'active').length,
      activeStores: stores.filter(s => s.status === 'active').length,
      totalCustomers: customers.length,
      totalSamples: customers.length,
      redeemed: customers.filter(c => c.redeemed).length,
      redemptionRate: customers.length > 0 
        ? Math.round((customers.filter(c => c.redeemed).length / customers.length) * 100)
        : 0,
      promoRedeemed: promoRedemptions.filter(p => p.redeemedAt !== null).length,
      returnPurchases,
      promoConversionRate: customers.filter(c => c.redeemed).length > 0
        ? Math.round((promoRedemptions.filter(p => p.redeemedAt !== null).length / customers.filter(c => c.redeemed).length) * 100)
        : 0,
      totalSales,
      pendingSales
    };

    // Build activity feed (last 10 events)
    const activities: Array<{
      type: 'sample' | 'store' | 'redemption' | 'promo' | 'returning-promo';
      timestamp: Date;
      data: any;
    }> = [];

    // Add sample requests
    customers.slice(0, 10).forEach(c => {
    activities.push({
      type: 'sample',
      timestamp: c.requestedAt,
      data: {
        customerName: `${c.firstName} ${c.lastName.charAt(0)}.`,
        sample: c.sampleChoice,
        storeName: c.store?.storeName
      }
      });
    });

    // Add store activations
    stores.filter(s => s.activatedAt).slice(0, 10).forEach(s => {
    activities.push({
      type: 'store',
      timestamp: s.activatedAt!,
      data: {
        storeName: s.storeName,
        displayId: displays.find(d => d.storeId === s.storeId)?.displayId
      }
      });
    });

    // Add sample redemptions
    customers.filter(c => c.redeemed && c.redeemedAt).slice(0, 10).forEach(c => {
    activities.push({
      type: 'redemption',
      timestamp: c.redeemedAt!,
      data: {
        customerName: `${c.firstName} ${c.lastName.charAt(0)}.`,
        storeName: c.store?.storeName
      }
      });
    });

    // Add promo redemptions
    promoRedemptions.filter(p => p.redeemedAt).slice(0, 10).forEach(p => {
    // Determine if this is a first purchase or returning customer promo
    const isReturningPromo = p.customer.returningPromoSlug && p.promoSlug === p.customer.returningPromoSlug;
    
    activities.push({
      type: isReturningPromo ? 'returning-promo' : 'promo',
      timestamp: p.redeemedAt!,
      data: {
        customerName: `${p.customer.firstName} ${p.customer.lastName.charAt(0)}.`,
        storeName: p.store.storeName,
        promoOffer: p.promoOffer
      }
      });
    });

    // Sort by timestamp descending and take last 10
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivities = activities.slice(0, 10);

    // Serialize Decimal fields to numbers for Client Component
    const serializedStores = stores.map(store => ({
      ...store,
      storeCredit: store.storeCredit ? Number(store.storeCredit) : 0,
      commissionRate: store.commissionRate ? Number(store.commissionRate) : 0,
      promoReimbursementRate: store.promoReimbursementRate ? Number(store.promoReimbursementRate) : 0,
    }));

    const serializedPromoRedemptions = promoRedemptions.map(promo => ({
      ...promo,
      purchaseAmount: promo.purchaseAmount ? Number(promo.purchaseAmount) : 0,
      discountAmount: promo.discountAmount ? Number(promo.discountAmount) : 0,
    }));

    return (
      <DashboardClient
        data={{
          displays,
          stores: serializedStores,
          customers,
          organizations,
          promoRedemptions: serializedPromoRedemptions,
          stats,
          activities: recentActivities
        }}
      />
    );
  } catch (error) {
    console.error('Dashboard load error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h1>
          <p className="text-gray-600 mb-6">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <a
            href="/admin/dashboard"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Refresh Page
          </a>
        </div>
      </div>
    );
  }
}
