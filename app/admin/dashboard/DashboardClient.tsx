'use client';

import { useState } from 'react';
import { InventoryTab } from './InventoryTab';

type Activity = {
  type: 'sample' | 'store' | 'redemption' | 'promo';
  timestamp: Date;
  data: any;
};

type DashboardData = {
  displays: any[];
  stores: any[];
  customers: any[];
  organizations: any[];
  promoRedemptions: any[];
  stats: {
    activeDisplays: number;
    activeStores: number;
    totalSamples: number;
    redeemed: number;
    redemptionRate: number;
    promoRedeemed: number;
    promoConversionRate: number;
  };
  activities: Activity[];
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const [activeTab, setActiveTab] = useState<'displays' | 'stores' | 'customers' | 'inventory'>('displays');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayFilters, setDisplayFilters] = useState({ status: 'all', brand: 'all' });
  const [storeFilters, setStoreFilters] = useState({ status: 'all', brand: 'all' });
  const [customerFilters, setCustomerFilters] = useState({ status: 'all', store: 'all', date: 'all' });
  const [editingDisplay, setEditingDisplay] = useState<any | null>(null);
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [displayForm, setDisplayForm] = useState<{ status: string; assignedOrgId: string | '' }>({ status: 'inventory', assignedOrgId: '' });

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openDisplayEdit = (d: any) => {
    setEditingDisplay(d);
    setDisplayForm({ status: d.status, assignedOrgId: d.assignedOrgId || '' });
  };

  const saveDisplayEdit = async () => {
    if (!editingDisplay) return;
    setSavingDisplay(true);
    try {
      const res = await fetch(`/api/admin/displays/${editingDisplay.displayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: displayForm.status,
          assignedOrgId: displayForm.assignedOrgId || null,
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update display');
      }
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Update failed');
    } finally {
      setSavingDisplay(false);
    }
  };

  // Filter displays
  const filteredDisplays = data.displays.filter(d => {
    if (displayFilters.status !== 'all' && d.status !== displayFilters.status) return false;
    if (displayFilters.brand !== 'all' && d.organization?.orgId !== displayFilters.brand) return false;
    if (searchQuery && !d.displayId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter stores
  const filteredStores = data.stores.filter(s => {
    if (storeFilters.status !== 'all' && s.status !== storeFilters.status) return false;
    if (storeFilters.brand !== 'all' && s.orgId !== storeFilters.brand) return false;
    if (searchQuery && !s.storeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Filter customers
  const filteredCustomers = data.customers.filter(c => {
    if (customerFilters.status === 'redeemed' && !c.redeemed) return false;
    if (customerFilters.status === 'pending' && c.redeemed) return false;
    if (customerFilters.store !== 'all' && c.storeId !== customerFilters.store) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = `${c.firstName} ${c.lastName}`.toLowerCase().includes(query);
      const matchesPhone = c.phone.includes(query);
      const matchesMemberId = c.memberId.toLowerCase().includes(query);
      if (!matchesName && !matchesPhone && !matchesMemberId) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Command center for QRDisplay</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Card 1: Active Displays */}
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="text-3xl">📦</div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-[#6f42c1]">{data.stats.activeDisplays}</div>
              <div className="text-sm text-gray-600 mt-1">Active Displays</div>
            </div>
          </div>

          {/* Card 2: Active Stores */}
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="text-3xl">🏪</div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-[#3b82f6]">{data.stats.activeStores}</div>
              <div className="text-sm text-gray-600 mt-1">Active Stores</div>
            </div>
          </div>

          {/* Card 3: Sample Requests */}
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="text-3xl">👥</div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-[#10b981]">{data.stats.totalSamples}</div>
              <div className="text-sm text-gray-600 mt-1">Sample Requests</div>
            </div>
          </div>

          {/* Card 4: Redeemed */}
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="text-3xl">✅</div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-[#059669]">{data.stats.redeemed}</div>
              <div className="text-sm text-gray-600 mt-1">Redeemed</div>
              <div className="text-xs text-gray-500 mt-1">{data.stats.redemptionRate}% conversion</div>
            </div>
          </div>

          {/* Card 5: Promo Redemptions */}
          <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="text-3xl">💰</div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-bold text-[#8b5cf6]">{data.stats.promoRedeemed}</div>
              <div className="text-sm text-gray-600 mt-1">First Purchases</div>
              <div className="text-xs text-gray-500 mt-1">{data.stats.promoConversionRate}% conversion</div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="px-4 md:px-6 pb-6">
        <input
          type="search"
          placeholder="Search displays, stores, customers, member IDs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
        />
      </div>

      {/* Desktop Tabs (hidden on mobile) */}
      <div className="hidden md:block px-4 md:px-6">
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('displays')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'displays'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📦 Displays
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'stores'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏪 Stores
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'customers'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Customers
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'inventory'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏭 Inventory
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-6 py-6">
        {/* Displays Tab */}
        {activeTab === 'displays' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4 space-y-3 md:flex md:space-y-0 md:space-x-4">
              <select
                value={displayFilters.status}
                onChange={(e) => setDisplayFilters({ ...displayFilters, status: e.target.value })}
                className="w-full md:w-auto h-11 px-4 border-2 border-gray-300 rounded-lg text-base focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="inventory">Inventory</option>
                <option value="sold">Sold</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={displayFilters.brand}
                onChange={(e) => setDisplayFilters({ ...displayFilters, brand: e.target.value })}
                className="w-full md:w-auto h-11 px-4 border-2 border-gray-300 rounded-lg text-base focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="all">All Brands</option>
                {data.organizations.map(org => (
                  <option key={org.orgId} value={org.orgId}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredDisplays.map((display) => (
                <div key={display.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-semibold text-base">{display.displayId}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      display.status === 'active' ? 'bg-green-100 text-green-800' :
                      display.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                      display.status === 'inactive' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {display.status === 'active' ? '✅ Active' : display.status.charAt(0).toUpperCase() + display.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div><strong>Brand:</strong> {display.organization?.name || 'Unassigned'}</div>
                    <div><strong>Store:</strong> {display.store?.storeName || 'No store assigned'}</div>
                    {display.activatedAt && (
                      <div className="text-xs">Activated: {new Date(display.activatedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                  <button
                    onClick={() => openDisplayEdit(display)}
                    className="mt-2 px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100 w-full"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Display ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Brand</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Store</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Activated</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDisplays.map((display) => (
                      <tr key={display.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{display.displayId}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            display.status === 'active' ? 'bg-green-100 text-green-800' :
                            display.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                            display.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {display.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{display.organization?.name || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-sm">{display.store?.storeName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {display.activatedAt ? new Date(display.activatedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDisplayEdit(display)}
                            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Stores Tab */}
        {activeTab === 'stores' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4 space-y-3 md:flex md:space-y-0 md:space-x-4">
              <select
                value={storeFilters.status}
                onChange={(e) => setStoreFilters({ ...storeFilters, status: e.target.value })}
                className="w-full md:w-auto h-11 px-4 border-2 border-gray-300 rounded-lg text-base focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={storeFilters.brand}
                onChange={(e) => setStoreFilters({ ...storeFilters, brand: e.target.value })}
                className="w-full md:w-auto h-11 px-4 border-2 border-gray-300 rounded-lg text-base focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="all">All Brands</option>
                {data.organizations.map(org => (
                  <option key={org.orgId} value={org.orgId}>{org.name}</option>
                ))}
              </select>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredStores.map((store) => {
                const sampleCount = store._count?.customers || 0;
                const redeemedCount = data.customers.filter(c => c.storeId === store.storeId && c.redeemed).length;
                return (
                  <div key={store.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-semibold text-base mb-1">{store.storeName}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs">{store.storeId}</span>
                        <span>•</span>
                        <span>{store.organization?.name}</span>
                      </div>
                      {store.contactName && store.contactPhone && (
                        <div>{store.contactName} • {store.contactPhone}</div>
                      )}
                      <div className="font-medium text-gray-900">
                        {sampleCount} samples ({redeemedCount} redeemed)
                      </div>
                      {store.activatedAt && (
                        <div className="text-xs">Activated {formatRelativeTime(store.activatedAt)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Store ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Store Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Brand</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Samples</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Activated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStores.map((store) => {
                      const sampleCount = store._count?.customers || 0;
                      const redeemedCount = data.customers.filter(c => c.storeId === store.storeId && c.redeemed).length;
                      return (
                        <tr key={store.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{store.storeId}</td>
                          <td className="px-4 py-3 text-sm font-medium">{store.storeName}</td>
                          <td className="px-4 py-3 text-sm">{store.organization?.name}</td>
                          <td className="px-4 py-3 text-sm">
                            {store.contactName && store.contactPhone 
                              ? `${store.contactName} • ${store.contactPhone}`
                              : '—'
                            }
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {sampleCount} <span className="text-gray-500">({redeemedCount} redeemed)</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {store.activatedAt ? formatRelativeTime(store.activatedAt) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4 space-y-3 md:flex md:space-y-0 md:space-x-4">
              <select
                value={customerFilters.status}
                onChange={(e) => setCustomerFilters({ ...customerFilters, status: e.target.value })}
                className="w-full md:w-auto h-11 px-4 border-2 border-gray-300 rounded-lg text-base focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="redeemed">Redeemed</option>
              </select>
              <select
                value={customerFilters.store}
                onChange={(e) => setCustomerFilters({ ...customerFilters, store: e.target.value })}
                className="w-full md:w-auto h-11 px-4 border-2 border-gray-300 rounded-lg text-base focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              >
                <option value="all">All Stores</option>
                {data.stores.map(store => (
                  <option key={store.storeId} value={store.storeId}>{store.storeName}</option>
                ))}
              </select>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-semibold text-sm">{customer.memberId}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      customer.redeemed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {customer.redeemed ? '✅ Redeemed' : '🟡 Pending'}
                    </span>
                  </div>
                  <div className="text-base font-semibold mb-1">{customer.firstName} {customer.lastName}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{customer.phone}</div>
                    <div className="font-medium text-gray-900">{customer.sampleChoice}</div>
                    <div>{customer.store?.storeName}</div>
                    <div className="text-xs">{formatRelativeTime(customer.requestedAt)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Member ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sample</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Store</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Requested</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{customer.memberId}</td>
                        <td className="px-4 py-3 text-sm">{customer.firstName} {customer.lastName}</td>
                        <td className="px-4 py-3 text-sm">{customer.phone}</td>
                        <td className="px-4 py-3 text-sm">{customer.sampleChoice}</td>
                        <td className="px-4 py-3 text-sm">{customer.store?.storeName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.redeemed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {customer.redeemed ? 'Redeemed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatRelativeTime(customer.requestedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <InventoryTab displays={filteredDisplays} organizations={data.organizations} />
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="px-4 md:px-6 pb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {data.activities.map((activity, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">
                  {activity.type === 'sample' && '👤'}
                  {activity.type === 'store' && '🏪'}
                  {activity.type === 'redemption' && '✅'}
                  {activity.type === 'promo' && '💰'}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">
                    {formatRelativeTime(activity.timestamp)}
                  </div>
                  <div className="text-sm text-gray-900">
                    {activity.type === 'sample' && (
                      <>
                        <span className="font-semibold">{activity.data.customerName}</span> requested{' '}
                        {activity.data.sample}
                      </>
                    )}
                    {activity.type === 'store' && (
                      <>
                        <span className="font-semibold">{activity.data.storeName}</span> activated
                        {activity.data.displayId && ` • ${activity.data.displayId}`}
                      </>
                    )}
                    {activity.type === 'redemption' && (
                      <>
                        Sample redeemed by <span className="font-semibold">{activity.data.customerName}</span>
                      </>
                    )}
                    {activity.type === 'promo' && (
                      <>
                        <span className="font-semibold">{activity.data.customerName}</span> redeemed{' '}
                        {activity.data.promoOffer}
                      </>
                    )}
                  </div>
                  {activity.data.storeName && activity.type !== 'store' && (
                    <div className="text-xs text-gray-500 mt-1">📍 {activity.data.storeName}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="grid grid-cols-4">
          <button
            onClick={() => setActiveTab('displays')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'displays' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">📦</span>
            <span className="text-xs font-medium">Displays</span>
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'stores' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">🏪</span>
            <span className="text-xs font-medium">Stores</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'customers' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs font-medium">Samples</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'inventory' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">🏭</span>
            <span className="text-xs font-medium">Inventory</span>
          </button>
        </div>
      </div>

      {/* Display Edit Modal */}
      {editingDisplay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingDisplay(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Edit {editingDisplay.displayId}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={displayForm.status}
                  onChange={(e) => setDisplayForm({ ...displayForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="inventory">inventory</option>
                  <option value="sold">sold</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brand (assignedOrgId)</label>
                <select
                  value={displayForm.assignedOrgId}
                  onChange={(e) => setDisplayForm({ ...displayForm, assignedOrgId: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Unassigned</option>
                  {data.organizations.map(org => (
                    <option key={org.orgId} value={org.orgId}>{org.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingDisplay(null)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveDisplayEdit}
                disabled={savingDisplay}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400"
              >
                {savingDisplay ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
