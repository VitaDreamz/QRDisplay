import prisma from '@/lib/prisma';
import { DashboardClient } from './DashboardClient';

export default async function AdminDashboardPage() {
  try {
    // Parallel data fetching for performance with mobile-optimized limits
    const [displays, stores, customers, organizations, promoRedemptions] = await Promise.all([
      prisma.display.findMany({
        include: { 
          organization: true, 
          store: true 
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Reduced for mobile performance
      }),
      prisma.store.findMany({
        include: { 
          organization: true,
          _count: { 
            select: { 
              customers: true, 
              displays: true 
            } 
          }
        },
        orderBy: { activatedAt: 'desc' },
        take: 50 // Reduced for mobile performance
      }),
      prisma.customer.findMany({
        include: { 
          store: true, 
          organization: true 
        },
        orderBy: { requestedAt: 'desc' },
        take: 50 // Reduced from 100 to 50 for mobile
      }),
      prisma.organization.findMany({
        select: { 
          orgId: true, 
          name: true,
          type: true
        },
        where: {
          type: 'client' // Only show client brands, not platform
        },
        orderBy: { name: 'asc' }
      }),
      prisma.promoRedemption.findMany({
        include: {
          customer: true,
          store: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Reduced for mobile performance
      })
    ]);

    // Calculate stats
    const stats = {
    activeDisplays: displays.filter(d => d.status === 'active').length,
    activeStores: stores.filter(s => s.status === 'active').length,
    totalSamples: customers.length,
    redeemed: customers.filter(c => c.redeemed).length,
    redemptionRate: customers.length > 0 
      ? Math.round((customers.filter(c => c.redeemed).length / customers.length) * 100)
      : 0,
    promoRedeemed: promoRedemptions.filter(p => p.redeemedAt !== null).length,
    promoConversionRate: customers.filter(c => c.redeemed).length > 0
      ? Math.round((promoRedemptions.filter(p => p.redeemedAt !== null).length / customers.filter(c => c.redeemed).length) * 100)
      : 0
    };

    // Build activity feed (last 10 events)
    const activities: Array<{
      type: 'sample' | 'store' | 'redemption' | 'promo';
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
    activities.push({
      type: 'promo',
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

    return (
      <DashboardClient
        data={{
          displays,
          stores,
          customers,
          organizations,
          promoRedemptions,
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
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}
