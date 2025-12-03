'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Monitor,
  Package,
  Store,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Gift,
  Tag,
  Boxes,
} from 'lucide-react';

// Types
type StoreInventoryItem = {
  sku: string;
  name: string;
  productType: string;
  price: number;
  imageUrl: string | null;
  quantityOnHand: number;
  lowStockThreshold: number;
};

type BrandStoreStats = {
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

type StorePartnership = {
  id: string;
  storeId: string;
  brandId: string;
  status: string;
  createdAt: Date;
  store: {
    id: string;
    storeId: string;
    storeName: string;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    organization: {
      name: string;
      logoUrl: string | null;
    };
  };
  storeCreditBalance: number;
  onlineCommission: number;
  subscriptionCommission: number;
  promoCommission: number;
  brandStats: BrandStoreStats;
};

type BrandDashboardProps = {
  organization: any;
  products: any[];
  storePartnerships: StorePartnership[];
  billboardSlides: any[];
  brandMembers: any[];
  commissionRates?: {
    promo: number;
    online: number;
    subscription: number;
  };
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
  commissionRates,
  stats,
}: BrandDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'billboard' | 'products' | 'stores' | 'sales-reps' | 'analytics'
  >('overview');
  
  // Track expanded stores and inventory drawers
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [expandedInventory, setExpandedInventory] = useState<Set<string>>(new Set());

  const toggleStore = (id: string) => {
    setExpandedStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleInventory = (id: string) => {
    setExpandedInventory((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Simple header without SidebarLayout (avoiding missing component)
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'billboard', label: 'Billboard', icon: Monitor },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'stores', label: 'Stores', icon: Store },
    { id: 'sales-reps', label: 'Sales Reps', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {organization.logoUrl && (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="font-bold text-lg text-gray-900">{organization.name}</h1>
                <p className="text-sm text-gray-500">Brand Dashboard</p>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex gap-1 overflow-x-auto pb-2 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Brand Overview</h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Stores</span>
                </div>
                <p className="text-2xl font-bold">{stats.totalStores}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Products</span>
                </div>
                <p className="text-2xl font-bold">{stats.activeProducts}</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Billboard</span>
                </div>
                <p className="text-2xl font-bold">{stats.billboardSlides}/5</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Sales Reps</span>
                </div>
                <p className="text-2xl font-bold">{brandMembers.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Billboard Tab */}
        {activeTab === 'billboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Billboard Management</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">Billboard management coming soon...</p>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Product Catalog</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {products.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No products yet.</p>
              ) : (
                <div className="divide-y">
                  {products.map((product) => (
                    <div key={product.id} className="p-4 flex items-center gap-4">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sku} • {product.productType}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stores Tab - Enhanced with stats and inventory */}
        {activeTab === 'stores' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Store Partnerships</h2>
              <p className="text-sm text-gray-500">Manage your retail store partnerships</p>
            </div>

            {/* Commission Rates Header */}
            {commissionRates && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-purple-900 mb-3">Commission Rates (All Stores)</h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Promo:</span>
                    <span className="text-sm font-bold text-orange-600">{commissionRates.promo}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Online:</span>
                    <span className="text-sm font-bold text-blue-600">{commissionRates.online}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Subscription:</span>
                    <span className="text-sm font-bold text-green-600">{commissionRates.subscription}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Store Partnerships */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {storePartnerships.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No store partnerships yet.</p>
              ) : (
                <div className="divide-y">
                  {storePartnerships.map((partnership) => {
                    const isExpanded = expandedStores.has(partnership.id);
                    const isInventoryExpanded = expandedInventory.has(partnership.id);
                    const stats = partnership.brandStats;
                    
                    return (
                      <div key={partnership.id}>
                        {/* Collapsed Store Card */}
                        <button
                          onClick={() => toggleStore(partnership.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {partnership.store.organization.logoUrl ? (
                              <img
                                src={partnership.store.organization.logoUrl}
                                alt={partnership.store.organization.name}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <Store className="w-6 h-6 text-purple-600" />
                              </div>
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900">
                                  {partnership.store.organization.name}
                                </p>
                                {/* Stock Status Badges */}
                                {stats.outOfStockCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    {stats.outOfStockCount} Out
                                  </span>
                                )}
                                {stats.lowStockCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    {stats.lowStockCount} Low
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {partnership.store.city}, {partnership.store.state}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              partnership.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {partnership.status}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Store Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                            {/* Address */}
                            <div className="py-3 text-sm text-gray-600">
                              {partnership.store.streetAddress && (
                                <p>{partnership.store.streetAddress}</p>
                              )}
                              <p>
                                {partnership.store.city}, {partnership.store.state} {partnership.store.zipCode}
                              </p>
                            </div>

                            {/* Row 1: Store Credit, Wholesale Orders, Wholesale Spent */}
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  <span className="text-xs text-gray-500">Store Credit</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  ${stats.storeCredit.toFixed(2)}
                                </p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs text-gray-500">Wholesale Orders</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  {stats.wholesaleOrders}
                                </p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <DollarSign className="w-4 h-4 text-indigo-600" />
                                  <span className="text-xs text-gray-500">Wholesale Spent</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  ${stats.wholesaleSpent.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Row 2: Customers, Samples, Promos, Sales */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Users className="w-4 h-4 text-purple-600" />
                                  <span className="text-xs text-gray-500">Customers</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  {stats.customers}
                                </p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Gift className="w-4 h-4 text-pink-600" />
                                  <span className="text-xs text-gray-500">Samples Given</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  {stats.samplesGiven}
                                </p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <Tag className="w-4 h-4 text-orange-600" />
                                  <span className="text-xs text-gray-500">Promos Redeemed</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  {stats.promosRedeemed}
                                </p>
                              </div>
                              
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingUp className="w-4 h-4 text-green-600" />
                                  <span className="text-xs text-gray-500">Total Sales</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">
                                  ${stats.totalSales.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Row 3: Inventory Drawer */}
                            {stats.inventory.length > 0 && (
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                  onClick={() => toggleInventory(partnership.id)}
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Boxes className="w-5 h-5 text-purple-600" />
                                    <span className="font-medium text-gray-900">
                                      Inventory ({stats.inventory.length} products)
                                    </span>
                                  </div>
                                  {isInventoryExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>

                                {isInventoryExpanded && (
                                  <div className="border-t border-gray-200">
                                    <table className="w-full">
                                      <thead className="bg-gray-100 border-b">
                                        <tr>
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product</th>
                                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Type</th>
                                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Price</th>
                                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Stock</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {stats.inventory.map((item) => (
                                          <tr key={item.sku} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                              <div className="flex items-center gap-3">
                                                {item.imageUrl && (
                                                  <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-10 h-10 rounded object-cover"
                                                  />
                                                )}
                                                <div>
                                                  <div className="font-medium text-gray-900">{item.name}</div>
                                                  <div className="text-xs text-gray-500">{item.sku}</div>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                item.productType === 'sample'
                                                  ? 'bg-purple-100 text-purple-700'
                                                  : item.productType === 'wholesale'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-green-100 text-green-700'
                                              }`}>
                                                {item.productType}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                                              ${item.price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              <span className={`text-xl font-bold ${
                                                item.quantityOnHand === 0
                                                  ? 'text-red-600'
                                                  : item.quantityOnHand <= item.lowStockThreshold
                                                  ? 'text-yellow-600'
                                                  : 'text-green-600'
                                              }`}>
                                                {item.quantityOnHand}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}

                            {stats.inventory.length === 0 && (
                              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                                <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No inventory at this store yet</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sales Reps Tab */}
        {activeTab === 'sales-reps' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Sales Representatives</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {brandMembers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No sales reps yet.</p>
              ) : (
                <div className="divide-y">
                  {brandMembers.map((member: any) => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
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
            <h2 className="text-xl font-bold text-gray-900">Performance Analytics</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">Analytics coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
