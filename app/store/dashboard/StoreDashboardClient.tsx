'use client';

import { useState, useEffect } from 'react';

type Store = {
  storeId: string;
  storeName: string;
  promoOffer: string;
  followupDays: number[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  staffPin: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

type Customer = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string;
  sampleChoice: string;
  redeemed: boolean;
  promoRedeemed: boolean;
  requestedAt: Date;
};

type DashboardData = {
  store: Store;
  customers: Customer[];
  displays: any[];
  organization: any;
};

export default function StoreDashboardClient({ initialData, userId }: { initialData: DashboardData; userId: string }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'settings'>('overview');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'pending' | 'redeemed' | 'promo-used'>('all');
  
  // Modals
  const [editingPromo, setEditingPromo] = useState(false);
  const [editingFollowups, setEditingFollowups] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  
  // Forms
  const [promoForm, setPromoForm] = useState(data.store.promoOffer);
  const [followupForm, setFollowupForm] = useState<number[]>(data.store.followupDays);
  const [contactForm, setContactForm] = useState({
    contactName: data.store.contactName || '',
    contactEmail: data.store.contactEmail || '',
    contactPhone: data.store.contactPhone || ''
  });
  const [pinForm, setPinForm] = useState({ current: '', new: '' });
  const [blastForm, setBlastForm] = useState({
    audience: 'all',
    message: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [blasting, setBlasting] = useState(false);

  // Calculate stats
  const stats = {
    samplesRequested: data.customers.length,
    samplesRedeemed: data.customers.filter(c => c.redeemed).length,
    promosUsed: data.customers.filter(c => c.promoRedeemed).length,
    conversionRate: data.customers.filter(c => c.redeemed).length > 0
      ? Math.round(
          (data.customers.filter(c => c.promoRedeemed).length / 
           data.customers.filter(c => c.redeemed).length) * 100
        )
      : 0
  };

  // Filter customers
  const filteredCustomers = data.customers.filter(c => {
    if (customerFilter === 'pending') return !c.redeemed;
    if (customerFilter === 'redeemed') return c.redeemed && !c.promoRedeemed;
    if (customerFilter === 'promo-used') return c.promoRedeemed;
    return true;
  });

  // Count for blast audience
  const getAudienceCount = (audience: string) => {
    if (audience === 'all') return data.customers.length;
    if (audience === 'redeemed') return stats.samplesRedeemed;
    if (audience === 'not-promo') return stats.samplesRedeemed - stats.promosUsed;
    return 0;
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, promoOffer: promoForm })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, promoOffer: promoForm } });
        setEditingPromo(false);
        alert('Promo offer updated!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const saveFollowups = async (e: React.FormEvent) => {
    e.preventDefault();
    if (followupForm.length === 0) {
      alert('Select at least one follow-up day');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, followupDays: followupForm })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, followupDays: followupForm } });
        setEditingFollowups(false);
        alert('Follow-up schedule updated!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...contactForm })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, ...contactForm } });
        setEditingContact(false);
        alert('Contact info updated!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.current !== data.store.staffPin) {
      alert('Current PIN is incorrect');
      return;
    }
    if (!/^\d{4}$/.test(pinForm.new)) {
      alert('New PIN must be exactly 4 digits');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, staffPin: pinForm.new })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, staffPin: pinForm.new } });
        setChangingPin(false);
        setPinForm({ current: '', new: '' });
        alert('PIN updated!');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const sendBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = getAudienceCount(blastForm.audience);
    const cost = (count * 0.0075).toFixed(2);
    
    if (!confirm(`Send to ${count} customers? Estimated cost: $${cost}`)) {
      return;
    }
    
    setBlasting(true);
    try {
      const res = await fetch('/api/store/blast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...blastForm })
      });
      const result = await res.json();
      if (result.success) {
        alert(`Sent to ${result.sent} customers!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        setBlastForm({ audience: 'all', message: '' });
        setSendingBlast(false);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to send');
    } finally {
      setBlasting(false);
    }
  };

  const toggleFollowupDay = (day: number) => {
    if (followupForm.includes(day)) {
      setFollowupForm(followupForm.filter(d => d !== day));
    } else {
      setFollowupForm([...followupForm, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{data.store.storeName}</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Store Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-3xl font-bold text-purple-600">{stats.samplesRequested}</div>
            <div className="text-sm text-gray-600 mt-1">Samples Requested</div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-3xl font-bold text-green-600">{stats.samplesRedeemed}</div>
            <div className="text-sm text-gray-600 mt-1">
              Redeemed ({stats.samplesRequested > 0 ? Math.round((stats.samplesRedeemed / stats.samplesRequested) * 100) : 0}%)
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-3xl font-bold text-emerald-600">{stats.promosUsed}</div>
            <div className="text-sm text-gray-600 mt-1">
              Promos Used ({stats.samplesRedeemed > 0 ? Math.round((stats.promosUsed / stats.samplesRedeemed) * 100) : 0}%)
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-3xl font-bold text-blue-600">{stats.conversionRate}%</div>
            <div className="text-sm text-gray-600 mt-1">Conversion Rate</div>
          </div>
        </div>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:block px-4 md:px-6">
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Overview
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
      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setSendingBlast(true)}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  📢 Send Message to Customers
                </button>
                <button
                  onClick={() => setActiveTab('customers')}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium"
                >
                  👥 View All Customers
                </button>
              </div>
            </div>

            {/* Recent Customers */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">Recent Customers</h2>
              </div>
              <div className="divide-y">
                {data.customers.slice(0, 10).map((customer) => (
                  <div key={customer.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{customer.firstName} {customer.lastName}</div>
                        <div className="text-sm text-gray-600">{customer.sampleChoice}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(customer.requestedAt)}</div>
                      </div>
                      <div>
                        {customer.promoRedeemed ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            💰 Promo Used
                          </span>
                        ) : customer.redeemed ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            ✅ Redeemed
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h2 className="text-xl font-bold">Your Customers ({filteredCustomers.length})</h2>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value as any)}
                className="px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All ({data.customers.length})</option>
                <option value="pending">Pending ({data.customers.filter(c => !c.redeemed).length})</option>
                <option value="redeemed">Redeemed ({data.customers.filter(c => c.redeemed && !c.promoRedeemed).length})</option>
                <option value="promo-used">Promo Used ({stats.promosUsed})</option>
              </select>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{customer.firstName} {customer.lastName}</div>
                      <div className="text-sm text-gray-600">{customer.phone}</div>
                    </div>
                    <div>
                      {customer.promoRedeemed ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                          💰 Promo Used
                        </span>
                      ) : customer.redeemed ? (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          ✅ Redeemed
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">{customer.sampleChoice}</div>
                  <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(customer.requestedAt)}</div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Sample</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Requested</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{customer.firstName} {customer.lastName}</td>
                      <td className="px-4 py-3 text-sm">{customer.phone}</td>
                      <td className="px-4 py-3 text-sm">{customer.sampleChoice}</td>
                      <td className="px-4 py-3">
                        {customer.promoRedeemed ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            💰 Promo Used
                          </span>
                        ) : customer.redeemed ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            ✅ Redeemed
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                            ⏳ Pending
                          </span>
                        )}
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
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
            {/* Store Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Store Settings</h2>
              
              <div className="space-y-4">
                {/* Promo Offer */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <label className="text-sm text-gray-600">Promo Offer</label>
                    <p className="font-medium">{data.store.promoOffer}</p>
                  </div>
                  <button
                    onClick={() => {
                      setPromoForm(data.store.promoOffer);
                      setEditingPromo(true);
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Edit
                  </button>
                </div>
                
                {/* Follow-up Days */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <label className="text-sm text-gray-600">Follow-up Schedule</label>
                    <p className="font-medium">Day {data.store.followupDays.join(', ')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setFollowupForm(data.store.followupDays);
                      setEditingFollowups(true);
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Edit
                  </button>
                </div>
                
                {/* Staff PIN */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <label className="text-sm text-gray-600">Staff PIN</label>
                    <p className="font-medium font-mono">••••</p>
                  </div>
                  <button
                    onClick={() => {
                      setPinForm({ current: '', new: '' });
                      setChangingPin(true);
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Change
                  </button>
                </div>
                
                {/* Contact Info */}
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-sm text-gray-600">Contact Info</label>
                    <p className="text-sm">{data.store.contactEmail || 'Not set'}</p>
                    <p className="text-sm">{data.store.contactPhone || 'Not set'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setContactForm({
                        contactName: data.store.contactName || '',
                        contactEmail: data.store.contactEmail || '',
                        contactPhone: data.store.contactPhone || ''
                      });
                      setEditingContact(true);
                    }}
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {/* Store Profile */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Store Profile</h2>
              <div className="space-y-2 text-sm">
                <div><strong>Store Name:</strong> {data.store.storeName}</div>
                <div><strong>Store ID:</strong> {data.store.storeId}</div>
                {data.store.streetAddress && (
                  <>
                    <div><strong>Address:</strong> {data.store.streetAddress}</div>
                    <div>{data.store.city}, {data.store.state} {data.store.zipCode}</div>
                  </>
                )}
                <div><strong>Active Displays:</strong> {data.displays.length}</div>
                {data.displays.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    {data.displays.map(d => d.displayId).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="grid grid-cols-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium">Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'customers' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs font-medium">Customers</span>
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

      {/* Edit Promo Modal */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Promo Offer</h3>
            
            <form onSubmit={savePromo}>
              <label className="block text-sm font-medium mb-2">Promo Offer</label>
              <input
                value={promoForm}
                onChange={(e) => setPromoForm(e.target.value)}
                placeholder="20% Off First Purchase"
                className="w-full px-3 py-2 border rounded mb-4 focus:ring-2 focus:ring-purple-500"
              />
              
              <p className="text-sm text-gray-600 mb-4">
                This offer will appear in follow-up messages and promo redemption pages.
              </p>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPromo(false)}
                  className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Follow-ups Modal */}
      {editingFollowups && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Follow-up Schedule</h3>
            
            <form onSubmit={saveFollowups}>
              <p className="text-sm text-gray-600 mb-4">
                Select when to send follow-up messages to customers who redeemed samples:
              </p>
              
              <div className="space-y-2 mb-4">
                {[4, 8, 12, 16].map(day => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={followupForm.includes(day)}
                      onChange={() => toggleFollowupDay(day)}
                    />
                    Day {day}
                  </label>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                Select at least one day. Messages include your promo offer.
              </p>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFollowups(false)}
                  className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Contact Info</h3>
            
            <form onSubmit={saveContact}>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Contact Name</label>
                  <input
                    value={contactForm.contactName}
                    onChange={(e) => setContactForm({ ...contactForm, contactName: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={contactForm.contactEmail}
                    onChange={(e) => setContactForm({ ...contactForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    value={contactForm.contactPhone}
                    onChange={(e) => setContactForm({ ...contactForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingContact(false)}
                  className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {changingPin && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Change Staff PIN</h3>
            
            <form onSubmit={changePin}>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Current PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinForm.current}
                    onChange={(e) => setPinForm({ ...pinForm, current: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinForm.new}
                    onChange={(e) => setPinForm({ ...pinForm, new: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest"
                    placeholder="••••"
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                PIN must be exactly 4 digits
              </p>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || pinForm.current.length !== 4 || pinForm.new.length !== 4}
                  className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Change PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => setChangingPin(false)}
                  className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blast SMS Modal */}
      {sendingBlast && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">📢 Send Message to Customers</h3>
            
            <form onSubmit={sendBlast}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Send To:</label>
                <select
                  value={blastForm.audience}
                  onChange={(e) => setBlastForm({ ...blastForm, audience: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Customers ({data.customers.length})</option>
                  <option value="redeemed">Redeemed Sample ({stats.samplesRedeemed})</option>
                  <option value="not-promo">Didn't Use Promo ({stats.samplesRedeemed - stats.promosUsed})</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message:</label>
                <textarea
                  value={blastForm.message}
                  onChange={(e) => setBlastForm({ ...blastForm, message: e.target.value })}
                  rows={4}
                  maxLength={160}
                  placeholder="Flash sale this weekend! 30% off all products. Come visit us!"
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {blastForm.message.length}/160 characters. Standard SMS rates apply.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ This will send to {getAudienceCount(blastForm.audience)} customers. 
                  Cost: ~${(getAudienceCount(blastForm.audience) * 0.0075).toFixed(2)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={blasting || !blastForm.message.trim()}
                  className="flex-1 bg-purple-600 text-white py-3 rounded hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                >
                  {blasting ? 'Sending...' : `Send to ${getAudienceCount(blastForm.audience)} Customers`}
                </button>
                <button
                  type="button"
                  onClick={() => setSendingBlast(false)}
                  className="px-4 bg-gray-200 py-3 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
