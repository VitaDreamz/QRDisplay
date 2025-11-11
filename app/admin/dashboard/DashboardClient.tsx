'use client';

import { useState } from 'react';
import { InventoryTab } from './InventoryTab';

type Activity = {
  type: 'sample' | 'store' | 'redemption' | 'promo' | 'returning-promo';
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
  const [activeTab, setActiveTab] = useState<'displays' | 'stores' | 'customers' | 'inventory' | 'settings'>('displays');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayFilters, setDisplayFilters] = useState({ status: 'all', brand: 'all' });
  const [storeFilters, setStoreFilters] = useState({ status: 'all', brand: 'all' });
  const [customerFilters, setCustomerFilters] = useState({ status: 'all', store: 'all', date: 'all' });
  const [editingDisplay, setEditingDisplay] = useState<any | null>(null);
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [displayForm, setDisplayForm] = useState<{ status: string; assignedOrgId: string | '' }>({ status: 'inventory', assignedOrgId: '' });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // Store management states
  const [editingStore, setEditingStore] = useState<any | null>(null);
  const [savingStore, setSavingStore] = useState(false);
  const [deletingStore, setDeletingStore] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resetDisplayOnDelete, setResetDisplayOnDelete] = useState(false);
  const [storeForm, setStoreForm] = useState<any>({});
  const [availableDisplays, setAvailableDisplays] = useState<any[]>([]);
  
    // Sorting states
    const [storeSortField, setStoreSortField] = useState<'storeId' | 'storeName' | 'city' | 'state' | 'displayId' | 'samples' | 'sales'>('storeId');
    const [storeSortDirection, setStoreSortDirection] = useState<'asc' | 'desc'>('asc');

  // Displays sorting state
  const [displaySortField, setDisplaySortField] = useState<'displayId' | 'status' | 'brand' | 'store' | 'activatedAt'>('displayId');
  const [displaySortDirection, setDisplaySortDirection] = useState<'asc' | 'desc'>('asc');

  // Database reset states
  const [showResetDatabaseConfirm, setShowResetDatabaseConfirm] = useState(false);
  const [resettingDatabase, setResettingDatabase] = useState(false);

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

  const resetDisplayActivation = async () => {
    if (!editingDisplay) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/displays/${editingDisplay.displayId}/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to reset display');
      }
      alert(`${editingDisplay.displayId} reset successfully`);
      setShowResetConfirm(false);
      setEditingDisplay(null);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  // Store management functions
  const openEditStore = async (store: any) => {
    setEditingStore(store);
    setStoreForm({
      storeName: store.storeName || '',
      adminName: store.adminName || '',
      adminEmail: store.adminEmail || '',
      adminPhone: store.adminPhone || '',
      streetAddress: store.streetAddress || '',
      city: store.city || '',
      state: store.state || '',
      zipCode: store.zipCode || '',
      staffPin: store.staffPin || '',
      promoOffer: store.promoOffer || '20%-off 1st Purchase',
      followupDays: store.followupDays || [4, 12],
      status: store.status || 'active',
      displayId: store.displays?.[0]?.displayId || '',
      subscriptionTier: store.subscriptionTier || 'free',
      // IMPORTANT: Preserve availableSamples so they don't reset
      availableSamples: store.availableSamples || []
    });
    
    // Fetch available displays from same organization
    if (store.orgId) {
      try {
        const res = await fetch(`/api/admin/displays?organizationId=${store.orgId}`);
        const data = await res.json();
        setAvailableDisplays(data.displays || []);
      } catch (err) {
        console.error('Failed to load displays:', err);
        setAvailableDisplays([]);
      }
    }
  };

  const saveStoreEdit = async () => {
    if (!editingStore) return;
    setSavingStore(true);
    try {
      const res = await fetch(`/api/admin/stores/${editingStore.storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeForm)
      });
      if (!res.ok) throw new Error('Failed to update store');
      alert('Store updated successfully');
      setEditingStore(null);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Update failed');
    } finally {
      setSavingStore(false);
    }
  };

  const deleteStore = async () => {
    if (!deletingStore) return;
    try {
      const res = await fetch(
        `/api/admin/stores/${deletingStore.storeId}?resetDisplay=${resetDisplayOnDelete}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to delete store');
      alert('Store deleted successfully');
      setShowDeleteConfirm(false);
      setDeletingStore(null);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Delete failed');
    }
  };

  const resetDatabase = async () => {
    setResettingDatabase(true);
    try {
      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to reset database');
      }
      alert(`Database reset successfully!\n\nDeleted:\n- ${result.stats.customersDeleted} customers\n- ${result.stats.staffDeleted} staff members\n- ${result.stats.storesDeleted} stores\n\nAll displays reset to 'sold' status.`);
      setShowResetDatabaseConfirm(false);
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Reset failed');
    } finally {
      setResettingDatabase(false);
    }
  };

  // Filter displays
  const filteredDisplays = data.displays.filter(d => {
    if (displayFilters.status !== 'all' && d.status !== displayFilters.status) return false;
    if (displayFilters.brand !== 'all' && d.organization?.orgId !== displayFilters.brand) return false;
    if (searchQuery && !d.displayId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    let aVal: any;
    let bVal: any;
    switch (displaySortField) {
      case 'displayId':
        aVal = a.displayId;
        bVal = b.displayId;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'brand':
        aVal = a.organization?.name?.toLowerCase() || '';
        bVal = b.organization?.name?.toLowerCase() || '';
        break;
      case 'store':
        aVal = a.store?.storeName?.toLowerCase() || '';
        bVal = b.store?.storeName?.toLowerCase() || '';
        break;
      case 'activatedAt':
        aVal = a.activatedAt ? new Date(a.activatedAt).getTime() : 0;
        bVal = b.activatedAt ? new Date(b.activatedAt).getTime() : 0;
        break;
      default:
        return 0;
    }
    if (aVal < bVal) return displaySortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return displaySortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleDisplaySort = (field: typeof displaySortField) => {
    if (displaySortField === field) {
      setDisplaySortDirection(displaySortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setDisplaySortField(field);
      setDisplaySortDirection('asc');
    }
  };

  // Filter stores
  const filteredStores = data.stores.filter(s => {
    if (storeFilters.status !== 'all' && s.status !== storeFilters.status) return false;
    if (storeFilters.brand !== 'all' && s.orgId !== storeFilters.brand) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = s.storeName.toLowerCase().includes(query);
      const matchesId = s.storeId.toLowerCase().includes(query);
      const matchesAdmin = s.adminName?.toLowerCase().includes(query);
      const matchesEmail = s.adminEmail?.toLowerCase().includes(query);
      const matchesPhone = s.adminPhone?.includes(query);
      const matchesCity = s.city?.toLowerCase().includes(query);
      if (!matchesName && !matchesId && !matchesAdmin && !matchesEmail && !matchesPhone && !matchesCity) return false;
    }
    return true;
    }).sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (storeSortField) {
        case 'storeId':
          aVal = a.storeId;
          bVal = b.storeId;
          break;
        case 'storeName':
          aVal = a.storeName.toLowerCase();
          bVal = b.storeName.toLowerCase();
          break;
        case 'city':
          aVal = a.city?.toLowerCase() || '';
          bVal = b.city?.toLowerCase() || '';
          break;
        case 'state':
          aVal = a.state?.toLowerCase() || '';
          bVal = b.state?.toLowerCase() || '';
          break;
        case 'displayId':
          aVal = a.displays?.[0]?.displayId || '';
          bVal = b.displays?.[0]?.displayId || '';
          break;
        case 'samples':
          aVal = a._count?.customers || 0;
          bVal = b._count?.customers || 0;
          break;
        case 'sales':
          aVal = data.customers.filter(c => c.storeId === a.storeId && c.promoRedeemed).length;
          bVal = data.customers.filter(c => c.storeId === b.storeId && c.promoRedeemed).length;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return storeSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return storeSortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Handle column header click for sorting
    const handleStoreSort = (field: typeof storeSortField) => {
      if (storeSortField === field) {
        // Toggle direction if same field
        setStoreSortDirection(storeSortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        // New field, default to ascending
        setStoreSortField(field);
        setStoreSortDirection('asc');
      }
    };

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Command center for QRDisplay</p>
          </div>
          <button
            onClick={() => setShowResetDatabaseConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            🗑️ Reset Database
          </button>
        </div>
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Settings
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
            <div className="md:hidden space-y-3 max-h-[600px] overflow-y-auto">
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
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th
                        onClick={() => handleDisplaySort('displayId')}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Display ID {displaySortField === 'displayId' && (<span>{displaySortDirection === 'asc' ? '↑' : '↓'}</span>)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleDisplaySort('status')}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Status {displaySortField === 'status' && (<span>{displaySortDirection === 'asc' ? '↑' : '↓'}</span>)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleDisplaySort('brand')}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Brand {displaySortField === 'brand' && (<span>{displaySortDirection === 'asc' ? '↑' : '↓'}</span>)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleDisplaySort('store')}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Store {displaySortField === 'store' && (<span>{displaySortDirection === 'asc' ? '↑' : '↓'}</span>)}
                        </div>
                      </th>
                      <th
                        onClick={() => handleDisplaySort('activatedAt')}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center gap-1">
                          Activated {displaySortField === 'activatedAt' && (<span>{displaySortDirection === 'asc' ? '↑' : '↓'}</span>)}
                        </div>
                      </th>
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
            {/* Quick Add Section */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-4 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Quick Add New Store</h3>
                  <p className="text-sm text-purple-100">Add a new store to a brand with inventory</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.organizations.map((org) => (
                    <a
                      key={org.orgId}
                      href={`/admin/brands/${org.orgId}/stores/quick-add`}
                      className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-md hover:bg-purple-50 transition-colors"
                    >
                      <span className="mr-2">+</span>
                      {org.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>

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
                const totalCustomers = store._count?.customers || 0;
                const redeemedCount = store.customers?.filter((c: any) => c.redeemed).length || 0;
                const salesCount = data.customers.filter(c => c.storeId === store.storeId && c.promoRedeemed).length;
                const displayId = store.displays?.[0]?.displayId;
                
                return (
                  <div key={store.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="font-semibold text-base mb-1">{store.storeName}</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs">{store.storeId}</span>
                        <span>•</span>
                        <span>{store.organization?.name}</span>
                      </div>
                      {store.adminName && (
                        <div className="text-xs">
                          {store.adminName}
                          {store.adminPhone && ` • ${store.adminPhone}`}
                          {store.adminEmail && (
                            <div>{store.adminEmail}</div>
                          )}
                        </div>
                      )}
                      {(store.city || store.state) && (
                        <div className="text-xs">{store.city}{store.city && store.state && ', '}{store.state}</div>
                      )}
                      <div className="font-medium text-gray-900">
                        {totalCustomers} ({redeemedCount} redeemed) • {salesCount} sales
                      </div>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={`/api/admin/store-access/${store.storeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Dashboard
                        </a>
                        <button
                          onClick={() => openEditStore(store)}
                          className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeletingStore(store);
                            setShowDeleteConfirm(true);
                          }}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
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
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('storeId')}
                        >
                          <div className="flex items-center gap-1">
                            Store ID
                            {storeSortField === 'storeId' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('storeName')}
                        >
                          <div className="flex items-center gap-1">
                            Store Name
                            {storeSortField === 'storeName' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Contact</th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('city')}
                        >
                          <div className="flex items-center gap-1">
                            City
                            {storeSortField === 'city' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('state')}
                        >
                          <div className="flex items-center gap-1">
                            State
                            {storeSortField === 'state' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('samples')}
                        >
                          <div className="flex items-center gap-1">
                            Samples
                            {storeSortField === 'samples' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('sales')}
                        >
                          <div className="flex items-center gap-1">
                            Sales
                            {storeSortField === 'sales' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleStoreSort('displayId')}
                        >
                          <div className="flex items-center gap-1">
                            Display ID
                            {storeSortField === 'displayId' && (
                              <span>{storeSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Brand</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredStores.map((store) => {
                      const totalCustomers = store._count?.customers || 0;
                      const redeemedCount = store.customers?.filter((c: any) => c.redeemed).length || 0;
                      const salesCount = data.customers.filter(c => c.storeId === store.storeId && c.promoRedeemed).length;
                      const displayId = store.displays?.[0]?.displayId;
                      
                      return (
                        <tr key={store.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{store.storeId}</td>
                          <td className="px-4 py-3 text-sm font-medium">{store.storeName}</td>
                          <td className="px-4 py-3 text-xs">
                            {store.adminName && (
                              <div className="space-y-0.5">
                                <div>{store.adminName}</div>
                                {store.adminPhone && <div>{store.adminPhone}</div>}
                                {store.adminEmail && <div className="text-gray-500">{store.adminEmail}</div>}
                              </div>
                            )}
                            {!store.adminName && '—'}
                          </td>
                            <td className="px-4 py-3 text-sm">{store.city || '—'}</td>
                            <td className="px-4 py-3 text-sm">{store.state || '—'}</td>
                          <td className="px-4 py-3 text-sm">
                            {totalCustomers} <span className="text-gray-500">({redeemedCount} redeemed)</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">
                            {salesCount}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {displayId || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">{store.organization?.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <a
                                href={`/api/admin/store-access/${store.storeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
                              >
                                Dashboard
                              </a>
                              <button
                                onClick={() => openEditStore(store)}
                                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingStore(store);
                                  setShowDeleteConfirm(true);
                                }}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
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
          <InventoryTab displays={data.displays} organizations={data.organizations} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Admin Settings</h2>
            
            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-6">
              <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Danger Zone</h3>
              <p className="text-sm text-gray-600 mb-4">
                Destructive actions that cannot be undone. Use with extreme caution.
              </p>
              
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-red-900 mb-1">Reset Production Database</h4>
                    <p className="text-sm text-red-700 mb-2">
                      This will permanently delete:
                    </p>
                    <ul className="text-sm text-red-700 space-y-1 mb-3 ml-4">
                      <li>• All customers and their sample requests</li>
                      <li>• All staff members</li>
                      <li>• All stores and their data</li>
                      <li>• Reset all displays to "sold" status</li>
                    </ul>
                    <p className="text-sm font-semibold text-red-900">
                      ✅ This will keep: Organizations (VitaDreamz, QR Display) and Display QR codes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetDatabaseConfirm(true)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Reset Database
                </button>
              </div>
            </div>
          </div>
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
                  {activity.type === 'returning-promo' && '🔄'}
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
                        {activity.data.promoOffer} (First Purchase)
                      </>
                    )}
                    {activity.type === 'returning-promo' && (
                      <>
                        <span className="font-semibold">{activity.data.customerName}</span> redeemed{' '}
                        {activity.data.promoOffer} (Returning Customer)
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
        <div className="grid grid-cols-5">
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
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">⚙️</span>
            <span className="text-xs font-medium">Settings</span>
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
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              {editingDisplay.storeId && editingDisplay.store && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Current Store:</span> {editingDisplay.store.storeName}
                </div>
              )}
            </div>
            
            {/* Reset Activation Button */}
            {editingDisplay.storeId && (
              <div className="mt-6 mb-4">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-medium"
                >
                  Reset Activation
                </button>
              </div>
            )}

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

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && editingDisplay && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResetConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-3">Reset Activation?</h3>
            <p className="text-gray-700 mb-4">
              Reset activation for <strong>{editingDisplay.displayId}</strong>? 
              This will clear <strong>{editingDisplay.store?.storeName}</strong> but keep 
              the display assigned to <strong>{editingDisplay.organization?.name || 'the organization'}</strong>. 
              The QR code can be reactivated at a different location.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={resetDisplayActivation}
                disabled={resetting}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
              >
                {resetting ? 'Resetting...' : 'Reset Activation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Edit Modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingStore(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 my-8 p-6">
            <h3 className="text-lg font-semibold mb-4">Edit {editingStore.storeId}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Store Name</label>
                <input
                  type="text"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Administrator Name</label>
                <input
                  type="text"
                  value={storeForm.adminName}
                  onChange={(e) => setStoreForm({ ...storeForm, adminName: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Admin Email</label>
                <input
                  type="email"
                  value={storeForm.adminEmail}
                  onChange={(e) => setStoreForm({ ...storeForm, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Admin Phone</label>
                <input
                  type="tel"
                  value={storeForm.adminPhone}
                  onChange={(e) => setStoreForm({ ...storeForm, adminPhone: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Street Address</label>
                <input
                  type="text"
                  value={storeForm.streetAddress}
                  onChange={(e) => setStoreForm({ ...storeForm, streetAddress: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={storeForm.city}
                  onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={storeForm.state}
                  onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  placeholder="CA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP Code</label>
                <input
                  type="text"
                  value={storeForm.zipCode}
                  onChange={(e) => setStoreForm({ ...storeForm, zipCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Staff PIN</label>
                <input
                  type="text"
                  value={storeForm.staffPin}
                  onChange={(e) => setStoreForm({ ...storeForm, staffPin: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Display ID</label>
                <select
                  value={storeForm.displayId || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, displayId: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">-- No Display --</option>
                  {availableDisplays.map(display => (
                    <option key={display.displayId} value={display.displayId}>
                      {display.displayId}
                      {display.storeId && display.storeId !== editingStore?.storeId ? 
                        ` (Currently at ${display.store?.storeName})` : 
                        ''
                      }
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-500 mt-1 block">
                  Assign or change the QR display for this store
                </span>
              </div>
              {editingStore?.displays?.[0]?.displayId && (
                <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    📱 Currently using: <strong>{editingStore.displays[0].displayId}</strong>
                  </p>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Promo Offer</label>
                <input
                  type="text"
                  value={storeForm.promoOffer}
                  onChange={(e) => setStoreForm({ ...storeForm, promoOffer: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subscription Tier</label>
                <select
                  value={storeForm.subscriptionTier}
                  onChange={(e) => setStoreForm({ ...storeForm, subscriptionTier: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="test">Test - $0/mo (50% Match) - Early Adopters</option>
                  <option value="free">Free - $0/mo (10% Match)</option>
                  <option value="basic">Basic - $150/mo (25% Match)</option>
                  <option value="dreamer">Dreamer - $249/mo (50% Match)</option>
                  <option value="mega">Mega - $499/mo (100% Match)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={storeForm.status}
                  onChange={(e) => setStoreForm({ ...storeForm, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditingStore(null)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveStoreEdit}
                disabled={savingStore}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400"
              >
                {savingStore ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Store Delete Confirmation Dialog */}
      {showDeleteConfirm && deletingStore && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">Delete Store?</h3>
            <p className="text-gray-700 mb-4">
              Delete <strong>{deletingStore.storeName}</strong> ({deletingStore.storeId})? 
              This will permanently delete:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-4 space-y-1">
              <li>{deletingStore._count?.customers || 0} customer records</li>
              <li>All sample request data</li>
              <li>All redemption history</li>
              <li>All associated shortlinks</li>
            </ul>
            <p className="text-red-600 font-semibold text-sm mb-4">⚠️ This action cannot be undone!</p>
            {deletingStore.displays?.length > 0 && (
              <label className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={resetDisplayOnDelete}
                  onChange={(e) => setResetDisplayOnDelete(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  Also reset display <strong>{deletingStore.displays[0].displayId}</strong> 
                  (clears store, sets to 'sold')
                </span>
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setResetDisplayOnDelete(false);
                }}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={deleteStore}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete Store
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Database Confirmation Dialog */}
      {showResetDatabaseConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResetDatabaseConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">⚠️ Reset Production Database?</h3>
            <p className="text-gray-700 mb-4 font-semibold">
              This will PERMANENTLY delete ALL production data:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-4 space-y-1 bg-red-50 p-3 rounded border border-red-200">
              <li>All customers and sample requests</li>
              <li>All staff members</li>
              <li>All stores</li>
              <li>All displays will be reset to "sold" status</li>
            </ul>
            <p className="text-green-700 font-semibold text-sm mb-2">✅ Will be preserved:</p>
            <ul className="list-disc list-inside text-sm text-gray-700 mb-4 space-y-1 bg-green-50 p-3 rounded border border-green-200">
              <li>Organizations (VitaDreamz, QR Display)</li>
              <li>All display QR codes (QRD-001 to QRD-093)</li>
            </ul>
            <p className="text-red-600 font-bold text-sm mb-4">⚠️ THIS ACTION CANNOT BE UNDONE!</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetDatabaseConfirm(false)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={resetDatabase}
                disabled={resettingDatabase}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 font-semibold"
              >
                {resettingDatabase ? 'Resetting...' : 'Yes, Reset Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
