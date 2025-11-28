'use client';

import React, { useState } from 'react';
import { SidebarLayout, SidebarItem } from '@/components/layout/sidebar-layout';
import { BreadcrumbItem } from '@/components/ui/breadcrumb';
import {
  LayoutDashboard,
  Monitor,
  Package,
  Store,
  Users,
  TrendingUp,
} from 'lucide-react';

type BrandDashboardProps = {
  organization: any;
  products: any[];
  storePartnerships: any[];
  billboardSlides: any[];
  brandMembers: any[];
  stats: {
    totalStores: number;
    newStoresThisMonth: number;
    activeProducts: number;
    sampleProducts: number;
    fullSizeProducts: number;
    billboardSlides: number;
  };
};

export default function BrandDashboardClient({
  organization,
  products,
  storePartnerships,
  billboardSlides,
  brandMembers,
  stats,
}: BrandDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'billboard' | 'products' | 'stores' | 'sales-reps' | 'analytics'
  >('overview');

  // Sidebar configuration
  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { 
      id: 'billboard', 
      label: 'Billboard', 
      icon: Monitor,
      badge: billboardSlides.length || undefined,
    },
    { 
      id: 'products', 
      label: 'Products', 
      icon: Package,
      badge: stats.activeProducts || undefined,
    },
    { 
      id: 'stores', 
      label: 'Stores', 
      icon: Store,
      badge: stats.totalStores || undefined,
    },
    { 
      id: 'sales-reps', 
      label: 'Sales Reps', 
      icon: Users,
      badge: brandMembers.length || undefined,
    },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  // Breadcrumb configuration
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const brandName = organization.name;
    const tabLabels: Record<typeof activeTab, string> = {
      overview: 'Overview',
      billboard: 'Billboard',
      products: 'Products',
      stores: 'Stores',
      'sales-reps': 'Sales Reps',
      analytics: 'Analytics',
    };

    return [
      { label: 'Brand Dashboard', href: `/brand/${organization.orgId}/dashboard` },
      { label: brandName },
      { label: tabLabels[activeTab] },
    ];
  };

  const header = (
    <div className="flex items-center gap-3">
      {organization.logoUrl && (
        <img
          src={organization.logoUrl}
          alt={organization.name}
          className="w-8 h-8 rounded-full object-cover"
        />
      )}
      <span className="font-semibold">{organization.name}</span>
    </div>
  );

  return (
    <SidebarLayout
      items={sidebarItems}
      activeItem={activeTab}
      onItemClick={(id) => setActiveTab(id as typeof activeTab)}
      breadcrumbs={getBreadcrumbs()}
      header={header}
    >
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Brand Overview
            </h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Stores */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-600">Total Stores</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStores}</p>
                {stats.newStoresThisMonth > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    +{stats.newStoresThisMonth} this month
                  </p>
                )}
              </div>

              {/* Active Products */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-600">Active Products</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.activeProducts}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.sampleProducts} samples, {stats.fullSizeProducts} full-size
                </p>
              </div>

              {/* Billboard Slides */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-600">Billboard Slides</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.billboardSlides}/5</p>
                <p className="text-xs text-gray-500 mt-1">Pro Tier</p>
              </div>

              {/* Monthly Spend */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-medium text-gray-600">Monthly Spend</h3>
                </div>
                <p className="text-2xl font-bold text-gray-900">$0</p>
                <p className="text-xs text-gray-500 mt-1">Billboard ads</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Store Partnerships</h2>
              {storePartnerships.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No store partnerships yet. Start building your distribution network!
                </p>
              ) : (
                <div className="space-y-3">
                  {storePartnerships.slice(0, 5).map((partnership) => (
                    <div
                      key={partnership.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {partnership.store.organization.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {partnership.store.city}, {partnership.store.state}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          partnership.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : partnership.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {partnership.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billboard Tab */}
        {activeTab === 'billboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Billboard Management
              </h1>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium">
                Create Slide
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">
                Billboard slide management coming soon...
              </p>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Product Catalog
              </h1>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium">
                Add Product
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {products.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No products yet. Add your first product to get started!
                </p>
              ) : (
                <div className="divide-y">
                  {products.map((product) => (
                    <div key={product.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.sku}</p>
                          <p className="text-sm text-gray-500">{product.productType}</p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stores Tab */}
        {activeTab === 'stores' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Store Partnerships
            </h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {storePartnerships.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No store partnerships yet.
                </p>
              ) : (
                <div className="divide-y">
                  {storePartnerships.map((partnership) => (
                    <div key={partnership.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">
                          {partnership.store.organization.name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            partnership.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : partnership.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {partnership.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {partnership.store.streetAddress}
                      </p>
                      <p className="text-sm text-gray-500">
                        {partnership.store.city}, {partnership.store.state} {partnership.store.zipCode}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Credit Balance: ${partnership.storeCreditBalance.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sales Reps Tab */}
        {activeTab === 'sales-reps' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Sales Representatives
              </h1>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium">
                Invite Sales Rep
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {brandMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No sales reps yet. Invite your team to get started!
                </p>
              ) : (
                <div className="divide-y">
                  {brandMembers.map((member) => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        {member.phone && (
                          <p className="text-sm text-gray-500">{member.phone}</p>
                        )}
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Performance Analytics
            </h1>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">
                Analytics dashboard coming soon...
              </p>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
