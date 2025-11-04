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
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  purchasingManager?: string | null;
  purchasingPhone?: string | null;
  purchasingEmail?: string | null;
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
  role: 'owner' | 'staff';
  staffMember?: {
    staffId: string;
    firstName: string;
    lastName: string;
  } | null;
};

export default function StoreDashboardClient({ initialData, userId, role }: { initialData: DashboardData; userId: string; role: 'owner' | 'staff' }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'staff' | 'settings'>('overview');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'pending' | 'redeemed' | 'promo-used'>('all');
  
  // Modals
  const [editingPromo, setEditingPromo] = useState(false);
  const [editingFollowups, setEditingFollowups] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  
  // Staff Management
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<any | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDeleteStaffConfirm, setShowDeleteStaffConfirm] = useState(false);
  const [staffForm, setStaffForm] = useState<any>({});
  const [editingStoreContact, setEditingStoreContact] = useState(false);
  const [storeContactForm, setStoreContactForm] = useState<any>({});
  
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

  // Staff Management Functions
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch('/api/store/staff');
      const result = await res.json();
      setStaff(result);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab]);

  const openAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      type: 'Sales',
      staffPin: '',
      onCallDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      onCallHoursStart: '09:00',
      onCallHoursStop: '17:00',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: ''
    });
    setShowStaffModal(true);
  };

  const openEditStaff = (staffMember: any) => {
    setEditingStaff(staffMember);
    setStaffForm({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email || '',
      phone: staffMember.phone,
      type: staffMember.type,
      staffPin: staffMember.staffPin,
      onCallDays: staffMember.onCallDays,
      onCallHoursStart: staffMember.onCallHoursStart,
      onCallHoursStop: staffMember.onCallHoursStop,
      hireDate: new Date(staffMember.hireDate).toISOString().split('T')[0],
      status: staffMember.status,
      notes: staffMember.notes || ''
    });
    setShowStaffModal(true);
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingStaff 
        ? `/api/store/staff/${editingStaff.staffId}`
        : '/api/store/staff';
      
      const res = await fetch(url, {
        method: editingStaff ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });

      if (res.ok) {
        alert(editingStaff ? 'Staff updated!' : 'Staff added!');
        setShowStaffModal(false);
        fetchStaff();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'Failed to save'));
      }
    } catch (err) {
      alert('Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async () => {
    if (!deletingStaff) return;
    try {
      const res = await fetch(`/api/store/staff/${deletingStaff.staffId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Staff deleted!');
        setShowDeleteStaffConfirm(false);
        setDeletingStaff(null);
        fetchStaff();
      } else {
        alert('Failed to delete staff');
      }
    } catch (err) {
      alert('Failed to delete staff');
    }
  };

  const toggleDayInStaffForm = (day: string) => {
    const days = staffForm.onCallDays || [];
    if (days.includes(day)) {
      setStaffForm({ ...staffForm, onCallDays: days.filter((d: string) => d !== day) });
    } else {
      setStaffForm({ ...staffForm, onCallDays: [...days, day] });
    }
  };

  const openEditStoreContact = () => {
    setStoreContactForm({
      ownerName: data.store.ownerName || '',
      ownerPhone: data.store.ownerPhone || '',
      ownerEmail: data.store.ownerEmail || '',
      purchasingManager: data.store.purchasingManager || '',
      purchasingPhone: data.store.purchasingPhone || '',
      purchasingEmail: data.store.purchasingEmail || ''
    });
    setEditingStoreContact(true);
  };

  const saveStoreContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/store/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeContactForm)
      });

      if (res.ok) {
        const updated = await res.json();
        setData({ 
          ...data, 
          store: { 
            ...data.store, 
            ...storeContactForm 
          } 
        });
        setEditingStoreContact(false);
        alert('Contact info updated!');
      } else {
        alert('Failed to update');
      }
    } catch (err) {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{data.store.storeName}</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Store Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 md:px-6 py-3 md:py-6">
        <div className="grid grid-cols-4 gap-2 md:gap-4">
          <div className="bg-white rounded-lg p-2 md:p-5 shadow-sm">
            <div className="hidden md:block text-3xl mb-2">📊</div>
            <div className="text-lg md:text-3xl font-bold text-purple-600">{stats.samplesRequested}</div>
            <div className="text-[10px] md:text-sm text-gray-600 mt-0.5 md:mt-1 leading-tight">Requested</div>
          </div>

          <div className="bg-white rounded-lg p-2 md:p-5 shadow-sm">
            <div className="hidden md:block text-3xl mb-2">✅</div>
            <div className="text-lg md:text-3xl font-bold text-green-600">{stats.samplesRedeemed}</div>
            <div className="text-[10px] md:text-sm text-gray-600 mt-0.5 md:mt-1 leading-tight">
              Redeemed <span className="hidden md:inline">({stats.samplesRequested > 0 ? Math.round((stats.samplesRedeemed / stats.samplesRequested) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-2 md:p-5 shadow-sm">
            <div className="hidden md:block text-3xl mb-2">💰</div>
            <div className="text-lg md:text-3xl font-bold text-emerald-600">{stats.promosUsed}</div>
            <div className="text-[10px] md:text-sm text-gray-600 mt-0.5 md:mt-1 leading-tight">
              Promos <span className="hidden md:inline">({stats.samplesRedeemed > 0 ? Math.round((stats.promosUsed / stats.samplesRedeemed) * 100) : 0}%)</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-2 md:p-5 shadow-sm">
            <div className="hidden md:block text-3xl mb-2">📈</div>
            <div className="text-lg md:text-3xl font-bold text-blue-600">{stats.conversionRate}%</div>
            <div className="text-[10px] md:text-sm text-gray-600 mt-0.5 md:mt-1 leading-tight">Conv. Rate</div>
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
            📊 {role === 'staff' ? 'My Stats' : 'Overview'}
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
          {role === 'owner' && (
            <>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-6 py-3 text-base font-medium transition-colors ${
                  activeTab === 'staff'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏆 Staff
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
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions (Owner Only) */}
            {role === 'owner' && (
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
            )}

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

        {/* Staff Tab (Owner Only) */}
        {activeTab === 'staff' && role === 'owner' && (
          <>
            {/* Store Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Store Contact Information</h2>
                <button
                  onClick={openEditStoreContact}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Edit Contact Info
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Owner</h3>
                  {data.store.ownerName || data.store.ownerPhone || data.store.ownerEmail ? (
                    <div className="text-sm space-y-1">
                      {data.store.ownerName && <div>{data.store.ownerName}</div>}
                      {data.store.ownerPhone && <div>{data.store.ownerPhone}</div>}
                      {data.store.ownerEmail && <div className="text-gray-600">{data.store.ownerEmail}</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No owner info set</div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Purchasing Manager</h3>
                  {data.store.purchasingManager || data.store.purchasingPhone || data.store.purchasingEmail ? (
                    <div className="text-sm space-y-1">
                      {data.store.purchasingManager && <div>{data.store.purchasingManager}</div>}
                      {data.store.purchasingPhone && <div>{data.store.purchasingPhone}</div>}
                      {data.store.purchasingEmail && <div className="text-gray-600">{data.store.purchasingEmail}</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No purchasing manager info set</div>
                  )}
                </div>
              </div>
            </div>

            {/* Staff Leaderboard */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Staff Leaderboard 🏆</h2>
                <button
                  onClick={openAddStaff}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  + Add Staff Member
                </button>
              </div>

              {loadingStaff ? (
                <div className="text-center py-8 text-gray-500">Loading staff...</div>
              ) : staff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No staff members yet. Add your first team member to get started!
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Staff</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Samples</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Sales</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">On Call</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {staff.map((member, index) => (
                          <tr key={member.id} className={index < 3 ? 'bg-yellow-50/30' : ''}>
                            <td className="px-4 py-3 text-lg">
                              {getMedal(index)} {index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium">{member.firstName} {member.lastName}</div>
                              <div className="text-xs text-gray-500">{member.phone}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">{member.type}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{member.samplesRedeemed}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">{member.salesGenerated}</td>
                            <td className="px-4 py-3 text-xs">
                              <div>{member.onCallDays.join(', ')}</div>
                              <div className="text-gray-500">{member.onCallHoursStart} - {member.onCallHoursStop}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditStaff(member)}
                                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingStaff(member);
                                    setShowDeleteStaffConfirm(true);
                                  }}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {staff.map((member, index) => (
                      <div key={member.id} className={`p-4 rounded-lg border ${index < 3 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getMedal(index)}</span>
                            <div>
                              <div className="font-semibold">#{index + 1} {member.firstName} {member.lastName}</div>
                              <div className="text-sm text-gray-600">{member.type}</div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <div className="text-gray-600">Samples</div>
                            <div className="font-semibold text-lg">{member.samplesRedeemed}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Sales</div>
                            <div className="font-semibold text-lg text-green-600">{member.salesGenerated}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-3">
                          <div>{member.onCallDays.join(', ')}</div>
                          <div>{member.onCallHoursStart} - {member.onCallHoursStop}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditStaff(member)}
                            className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeletingStaff(member);
                              setShowDeleteStaffConfirm(true);
                            }}
                            className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Settings Tab (Owner Only) */}
        {activeTab === 'settings' && role === 'owner' && (
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
        <div className={`grid ${role === 'owner' ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium">{role === 'staff' ? 'My Stats' : 'Overview'}</span>
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
          {role === 'owner' && (
            <>
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex flex-col items-center justify-center h-14 space-y-1 ${
                  activeTab === 'staff' ? 'bg-purple-600 text-white' : 'text-gray-600'
                }`}
              >
                <span className="text-xl">🏆</span>
                <span className="text-xs font-medium">Staff</span>
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
            </>
          )}
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

      {/* Edit Store Contact Modal */}
      {editingStoreContact && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4 py-8">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
              <h3 className="text-xl font-bold mb-4">Edit Store Contact Information</h3>
            
            <form onSubmit={saveStoreContact}>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <h4 className="font-semibold mb-3">Owner Information</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Owner Name</label>
                  <input
                    value={storeContactForm.ownerName}
                    onChange={(e) => setStoreContactForm({ ...storeContactForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Owner Phone</label>
                  <input
                    value={storeContactForm.ownerPhone}
                    onChange={(e) => setStoreContactForm({ ...storeContactForm, ownerPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Owner Email</label>
                  <input
                    type="email"
                    value={storeContactForm.ownerEmail}
                    onChange={(e) => setStoreContactForm({ ...storeContactForm, ownerEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="owner@store.com"
                  />
                </div>

                <div className="md:col-span-2 border-t pt-4 mt-2">
                  <h4 className="font-semibold mb-3">Purchasing Manager Information</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Purchasing Manager Name</label>
                  <input
                    value={storeContactForm.purchasingManager}
                    onChange={(e) => setStoreContactForm({ ...storeContactForm, purchasingManager: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Purchasing Manager Phone</label>
                  <input
                    value={storeContactForm.purchasingPhone}
                    onChange={(e) => setStoreContactForm({ ...storeContactForm, purchasingPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Purchasing Manager Email</label>
                  <input
                    type="email"
                    value={storeContactForm.purchasingEmail}
                    onChange={(e) => setStoreContactForm({ ...storeContactForm, purchasingEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="purchasing@store.com"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-3 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStoreContact(false)}
                  className="px-6 bg-gray-200 py-3 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4 py-8">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
              <h3 className="text-xl font-bold mb-4">{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
            
            <form onSubmit={saveStaff}>
              <div className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <input
                      required
                      value={staffForm.firstName}
                      onChange={(e) => setStaffForm({ ...staffForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <input
                      required
                      value={staffForm.lastName}
                      onChange={(e) => setStaffForm({ ...staffForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone *</label>
                    <input
                      required
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Type *</label>
                    <select
                      required
                      value={staffForm.type}
                      onChange={(e) => setStaffForm({ ...staffForm, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Staff PIN (4 digits) *</label>
                    <input
                      required
                      maxLength={4}
                      pattern="[0-9]{4}"
                      value={staffForm.staffPin}
                      onChange={(e) => setStaffForm({ ...staffForm, staffPin: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                      placeholder="1234"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">On Call Days</label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayInStaffForm(day)}
                        className={`px-2 py-2 text-sm rounded ${
                          staffForm.onCallDays?.includes(day)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hours Start</label>
                    <input
                      type="time"
                      value={staffForm.onCallHoursStart}
                      onChange={(e) => setStaffForm({ ...staffForm, onCallHoursStart: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Hours Stop</label>
                    <input
                      type="time"
                      value={staffForm.onCallHoursStop}
                      onChange={(e) => setStaffForm({ ...staffForm, onCallHoursStop: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Hire Date</label>
                    <input
                      type="date"
                      value={staffForm.hireDate}
                      onChange={(e) => setStaffForm({ ...staffForm, hireDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={staffForm.status}
                      onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={staffForm.notes}
                    onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-purple-600 text-white py-3 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : editingStaff ? 'Update Staff' : 'Add Staff'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-6 bg-gray-200 py-3 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation */}
      {showDeleteStaffConfirm && deletingStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-3 text-red-600">Delete Staff Member?</h3>
            <p className="text-gray-700 mb-4">
              Delete <strong>{deletingStaff.firstName} {deletingStaff.lastName}</strong>? 
              This will permanently remove them from your staff list.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Current Performance: {deletingStaff.samplesRedeemed} samples redeemed, {deletingStaff.salesGenerated} sales generated
            </p>
            <div className="flex space-x-3">
              <button
                onClick={deleteStaff}
                className="flex-1 bg-red-600 text-white py-3 rounded hover:bg-red-700"
              >
                Delete Staff
              </button>
              <button
                onClick={() => {
                  setShowDeleteStaffConfirm(false);
                  setDeletingStaff(null);
                }}
                className="px-6 bg-gray-200 py-3 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
