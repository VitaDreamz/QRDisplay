'use client';

import { useState, useEffect } from 'react';
import { SAMPLE_OPTIONS } from '@/lib/constants';

type Store = {
  storeId: string;
  storeName: string;
  promoOffer: string;
  followupDays: number[];
  adminName: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
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
  availableSamples?: string[];
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
  redeemedAt?: Date | null;
  promoRedeemedAt?: Date | null;
  currentStage: string;
  stageChangedAt: Date;
  totalPurchases: number;
};

type DashboardData = {
  store: Store;
  customers: Customer[];
  displays: any[];
  organization: any;
  role: 'owner' | 'staff';
  purchaseIntents?: Array<{
    id: string;
    status: 'pending' | 'ready' | 'fulfilled' | string;
    verifySlug: string;
    createdAt: Date;
    originalPrice: number;
    discountPercent: number;
    finalPrice: number;
    product: { sku: string; name: string; imageUrl?: string | null };
    customer: { firstName: string; lastName: string; phone: string };
  }>;
  staffMember?: {
    staffId: string;
    firstName: string;
    lastName: string;
  } | null;
};

export default function StoreDashboardClient({ initialData, role }: { initialData: DashboardData; role: 'owner' | 'staff' }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'products' | 'staff' | 'settings'>('overview');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'pending' | 'redeemed' | 'promo-used'>('all');
  
  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Modals
  const [editingPromo, setEditingPromo] = useState(false);
  const [editingFollowups, setEditingFollowups] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  const [sendingStaffMsg, setSendingStaffMsg] = useState(false);
  const [editingSamples, setEditingSamples] = useState(false);

  // Purchase intents state
  const [purchaseIntents, setPurchaseIntents] = useState(initialData.purchaseIntents || []);
  const pendingIntents = purchaseIntents.filter(i => i.status === 'pending');
  const readyIntents = purchaseIntents.filter(i => i.status === 'ready');
  const fulfilledIntents = purchaseIntents.filter(i => i.status === 'fulfilled');

  async function notifyReady(verifySlug: string) {
    try {
      const res = await fetch('/api/purchase-intent/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifySlug })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to notify');
      // Update local state
      setPurchaseIntents(prev => prev.map(i => i.verifySlug === verifySlug ? { ...i, status: 'ready' } : i));
      alert('Customer notified.');
    } catch (e: any) {
      alert(e.message || 'Failed to notify');
    }
  }
  
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
  const [promoForm, setPromoForm] = useState(() => {
    // Extract percentage from existing promo offer (e.g., "20% Off 1st In-Store Purchase" -> "20")
    const match = data.store.promoOffer.match(/(\d+)%/);
    return match ? match[1] : '20';
  });
  const [followupForm, setFollowupForm] = useState<number[]>(data.store.followupDays);
  const [contactForm, setContactForm] = useState({
    adminName: data.store.adminName || '',
    adminEmail: data.store.adminEmail || '',
    adminPhone: data.store.adminPhone || ''
  });
  const [pinForm, setPinForm] = useState({ current: '', new: '' });
  const [blastForm, setBlastForm] = useState({
    audience: 'all' as 'all' | 'redeemed' | 'not-promo',
    channel: 'sms' as 'sms' | 'email' | 'both',
    message: ''
  });
  const [staffMsgForm, setStaffMsgForm] = useState({
    recipients: 'all' as 'all' | 'type' | 'specific',
    type: 'Sales',
    staffId: '',
    channel: 'sms' as 'sms' | 'email' | 'both',
    message: ''
  });
  const [selectedSamples, setSelectedSamples] = useState<string[]>(
    data.store.availableSamples || []
  );
  
  // Purchase Request state - using quantities for wholesale boxes
  const [showPurchaseRequest, setShowPurchaseRequest] = useState(false);
  const [boxQuantities, setBoxQuantities] = useState<Record<string, number>>({});
  const [purchaseRequestNotes, setPurchaseRequestNotes] = useState('');
  const [sendingPurchaseRequest, setSendingPurchaseRequest] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [blasting, setBlasting] = useState(false);

  // Calculate stats
  const samplesRedeemed = data.customers.filter(c => c.redeemed).length;
  const firstPurchases = data.customers.filter(c => c.promoRedeemed).length;
  
  // Calculate pending sales (purchase intents not yet fulfilled)
  const pendingSales = purchaseIntents
    .filter(i => i.status === 'pending' || i.status === 'ready')
    .reduce((sum, i) => sum + (Number(i.finalPrice) || 0), 0);
  
  // Calculate total sales (fulfilled purchase intents)
  const totalSales = purchaseIntents
    .filter(i => i.status === 'fulfilled')
    .reduce((sum, i) => sum + (Number(i.finalPrice) || 0), 0);

  const stats = {
    samplesRequested: data.customers.length,
    samplesRedeemed,
    firstPurchases,
    totalSales,
    pendingSales,
    promosUsed: firstPurchases, // Keep for backward compatibility
    conversionRate: samplesRedeemed > 0
      ? Math.round((firstPurchases / samplesRedeemed) * 100)
      : 0
  };

  // Mini stats for "today"
  const isToday = (d: Date) => {
    const dt = new Date(d);
    const now = new Date();
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
  };
  const todayRequested = data.customers.filter(c => isToday(c.requestedAt)).length;
  const todayRedeemed = data.customers.filter(c => c.redeemed && isToday(c.requestedAt)).length;
  const todayPromos = data.customers.filter(c => c.promoRedeemed && isToday(c.requestedAt)).length;

  // Filter customers
  const filteredCustomers = data.customers.filter(c => {
    if (customerFilter === 'pending') return !c.redeemed;
    if (customerFilter === 'redeemed') return c.redeemed && !c.promoRedeemed;
    if (customerFilter === 'promo-used') return c.promoRedeemed;
    return true;
  });

  // Sorting state for customers table
  const [customerSortField, setCustomerSortField] = useState<'name' | 'phone' | 'sample' | 'status' | 'requestedAt' | 'redeemTime' | 'purchaseTime' | 'lastActivity' | 'followupDue' | 'daysInStage' | 'totalPurchases'>('requestedAt');
  const [customerSortDirection, setCustomerSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort customers based on selected column
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aVal: any;
    let bVal: any;
    switch (customerSortField) {
      case 'name':
        aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
        bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
        break;
      case 'phone':
        aVal = a.phone || '';
        bVal = b.phone || '';
        break;
      case 'sample':
        aVal = a.sampleChoice?.toLowerCase() || '';
        bVal = b.sampleChoice?.toLowerCase() || '';
        break;
      case 'status':
        // promo-used (2), redeemed (1), pending (0)
        const score = (c: any) => (c.promoRedeemed ? 2 : c.redeemed ? 1 : 0);
        aVal = score(a);
        bVal = score(b);
        break;
      case 'redeemTime': {
        const aMs = a.redeemedAt ? (new Date(a.redeemedAt).getTime() - new Date(a.requestedAt).getTime()) : Number.POSITIVE_INFINITY;
        const bMs = b.redeemedAt ? (new Date(b.redeemedAt).getTime() - new Date(b.requestedAt).getTime()) : Number.POSITIVE_INFINITY;
        aVal = aMs; bVal = bMs; break;
      }
      case 'purchaseTime': {
        const aStart = a.redeemedAt || a.requestedAt;
        const bStart = b.redeemedAt || b.requestedAt;
        const aMs = a.promoRedeemedAt ? (new Date(a.promoRedeemedAt).getTime() - new Date(aStart).getTime()) : Number.POSITIVE_INFINITY;
        const bMs = b.promoRedeemedAt ? (new Date(b.promoRedeemedAt).getTime() - new Date(bStart).getTime()) : Number.POSITIVE_INFINITY;
        aVal = aMs; bVal = bMs; break;
      }
      case 'lastActivity': {
        const aLast = new Date(a.promoRedeemedAt || a.redeemedAt || a.requestedAt).getTime();
        const bLast = new Date(b.promoRedeemedAt || b.redeemedAt || b.requestedAt).getTime();
        // For last activity, more recent first when desc
        aVal = aLast; bVal = bLast; break;
      }
      case 'followupDue': {
        // Calculate follow-up due date based on stage and followupDays
        const getFollowupDate = (c: Customer) => {
          const stage = c.currentStage;
          const followupIndex = stage === 'pending' ? 0 : stage === 'redeemed' ? 1 : -1;
          if (followupIndex === -1) return Number.POSITIVE_INFINITY; // No follow-up for purchased/repeat
          
          const daysToAdd = data.store.followupDays[followupIndex] || 0;
          const baseDate = stage === 'pending' ? new Date(c.requestedAt) : new Date(c.redeemedAt || c.requestedAt);
          return baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000);
        };
        aVal = getFollowupDate(a);
        bVal = getFollowupDate(b);
        break;
      }
      case 'daysInStage': {
        // Time since entering current stage
        aVal = new Date(a.stageChangedAt).getTime();
        bVal = new Date(b.stageChangedAt).getTime();
        break;
      }
      case 'totalPurchases':
        aVal = a.totalPurchases || 0;
        bVal = b.totalPurchases || 0;
        break;
      case 'requestedAt':
      default:
        aVal = new Date(a.requestedAt).getTime();
        bVal = new Date(b.requestedAt).getTime();
        break;
    }
    if (aVal < bVal) return customerSortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return customerSortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleCustomerSort = (field: typeof customerSortField) => {
    if (customerSortField === field) {
      setCustomerSortDirection(customerSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setCustomerSortField(field);
      setCustomerSortDirection('asc');
    }
  };

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

  // Format a duration (ms) like 2d 3h or 45m
  const formatDuration = (ms: number) => {
    if (ms <= 0 || !isFinite(ms)) return '—';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promoOfferText = `${promoForm}% Off In-Store Purchase`;
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoOffer: promoOfferText })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, promoOffer: promoOfferText } });
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
        body: JSON.stringify({ followupDays: followupForm })
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
        body: JSON.stringify({ ...contactForm })
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

  const saveSamples = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSamples.length === 0) {
      alert('Select at least one sample product');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/store/samples', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableSamples: selectedSamples })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, availableSamples: selectedSamples } });
        setEditingSamples(false);
        alert('Available samples updated!');
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
        body: JSON.stringify({ staffPin: pinForm.new })
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
      const res = await fetch('/api/store/message/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...blastForm })
      });
      const result = await res.json();
      if (result.success) {
        alert(`Sent to ${result.sent} customers!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        setBlastForm({ audience: 'all', channel: 'sms', message: '' });
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

  const sendStaffMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlasting(true);
    try {
      const res = await fetch('/api/store/message/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...staffMsgForm })
      });
      const result = await res.json();
      if (result.success) {
        alert(`Sent to ${result.sent} staff!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`);
        setStaffMsgForm({ recipients: 'all', type: 'Sales', staffId: '', channel: 'sms', message: '' });
        setSendingStaffMsg(false);
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

  // Fetch products from brand
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const orgId = (data.organization as any)?.orgId;
      console.log('🔍 [Products Tab] Fetching products for orgId:', orgId);
      if (!orgId) {
        console.error('❌ [Products Tab] No orgId found');
        setLoadingProducts(false);
        return;
      }
      const res = await fetch(`/api/products?orgId=${orgId}`);
      console.log('🔍 [Products Tab] API response status:', res.status);
      if (res.ok) {
        const productsData = await res.json();
        console.log('✅ [Products Tab] Products received:', productsData.products?.length || 0);
        console.log('🔍 [Products Tab] Products data:', productsData.products);
        // Log detailed info about each product
        productsData.products?.forEach((p: any) => {
          console.log(`📦 Product: ${p.sku} | Type: ${p.productType} | Active: ${p.active} | Name: ${p.name}`);
        });
        setProducts(productsData.products || []);
      } else {
        console.error('❌ [Products Tab] API response not ok:', await res.text());
      }
    } catch (err) {
      console.error('❌ [Products Tab] Failed to fetch products:', err);
    }
    setLoadingProducts(false);
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
    if (activeTab === 'overview' && role === 'owner' && staff.length === 0) {
      fetchStaff();
    }
    if (activeTab === 'products') {
      fetchProducts();
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
      onCallDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      onCallHoursStart: '09:00',
      onCallHoursStop: '17:00',
      hireDate: new Date().toISOString().split('T')[0],
      status: 'pending',
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

  const resendVerification = async (staffId: string) => {
    try {
      const res = await fetch(`/api/store/staff/${staffId}/resend-verification`, { method: 'POST' });
      if (res.ok) {
        alert('Verification link resent!');
      } else {
        const error = await res.json();
        alert('Failed to resend: ' + (error.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Network error. Please try again.');
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
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 md:py-5">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 mb-1.5">
            {data.store.storeName}
          </h1>
          {data.organization?.name && (
            <div className="flex flex-col items-center">
              <p className="text-sm md:text-base font-semibold text-gray-800">
                {data.organization.name} Samples Dashboard
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                powered by QRDisplay
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Hidden on Settings Tab */}
      {activeTab !== 'settings' && (
        <div className="px-4 md:px-6 py-2 md:py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm min-h-32 hover:shadow transition">
              <div className="text-xs text-gray-600 font-medium">Samples Redeemed</div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 mt-1">{stats.samplesRedeemed}</div>
              <div className="text-xs text-gray-500 mt-2">✅ +{todayRedeemed} today</div>
            </div>
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm min-h-32 hover:shadow transition">
              <div className="text-xs text-gray-600 font-medium">Promos Redeemed</div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">{stats.promosUsed}</div>
              <div className="text-xs text-gray-500 mt-2">🎉 +{todayPromos} today</div>
            </div>
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm min-h-32 hover:shadow transition">
              <div className="text-xs text-gray-600 font-medium">Pending Sales</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600 mt-1">
                ${stats.pendingSales.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-2">⏳ {pendingIntents.length + readyIntents.length} orders</div>
            </div>
            <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm min-h-32 hover:shadow transition">
              <div className="text-xs text-gray-600 font-medium">Total Sales</div>
              <div className="text-2xl md:text-3xl font-bold text-purple-600 mt-1">
                ${stats.totalSales.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-2">� {fulfilledIntents.length} fulfilled</div>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'products'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            �️ Products
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 text-base font-medium transition-colors ${
              activeTab === 'customers'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            � Customers
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
      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Pending Purchase Requests */}
            {(pendingIntents.length > 0 || readyIntents.length > 0 || fulfilledIntents.length > 0) && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-xl font-bold">Purchase Requests</h2>
                  <div className="text-sm text-gray-600">
                    Pending: {pendingIntents.length} • Ready: {readyIntents.length} • Fulfilled: {fulfilledIntents.length}
                  </div>
                </div>
                <div className="divide-y">
                  {[...readyIntents, ...pendingIntents, ...fulfilledIntents].slice(0,5).map((i) => (
                    <div key={i.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{i.customer.firstName} {i.customer.lastName}</div>
                        <div className="text-sm text-gray-600">{i.product.name}</div>
                        <div className="text-xs text-gray-500">{new Date(i.createdAt).toLocaleString()} • {i.status.toUpperCase()}</div>
                        <div className="text-sm font-semibold text-purple-600 mt-1">${Number(i.finalPrice).toFixed(2)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {i.status === 'pending' && role === 'owner' && (
                          <button onClick={() => notifyReady(i.verifySlug)} className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Notify Ready</button>
                        )}
                        {i.status === 'ready' && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Customer Notified</span>
                        )}
                        {i.status === 'fulfilled' && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Fulfilled</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingIntents.length + readyIntents.length > 5 && (
                    <div className="p-3 text-xs text-gray-600">And more…</div>
                  )}
                </div>
              </div>
            )}
            {/* Current Promo Offer Card */}
            {role === 'owner' && (
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl shadow p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm opacity-90 mb-2">Current Promo Offer</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-4xl md:text-5xl font-bold">
                        {data.store.promoOffer.match(/(\d+)%/)?.[1] || '20'}% OFF
                      </div>
                    </div>
                    <div className="text-base opacity-90 mt-1">In-Store Purchase</div>
                    <div className="text-xs opacity-75 mt-2">Edit to update the deal you offer to customers</div>
                  </div>
                  <button
                    onClick={() => { 
                      const match = data.store.promoOffer.match(/(\d+)%/);
                      setPromoForm(match ? match[1] : '20');
                      setEditingPromo(true); 
                    }}
                    className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-md text-sm font-medium"
                  >Edit</button>
                </div>
              </div>
            )}

            {/* Top 3 Staff */}
            {role === 'owner' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-xl font-bold">Top Performers 🏆</h2>
                  <button onClick={() => setActiveTab('staff')} className="text-purple-600 hover:text-purple-700 text-sm font-medium">View Leaderboard →</button>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {staff.slice(0,3).map((m, i) => (
                    <div key={m.id} className="rounded-lg border border-yellow-200 bg-yellow-50/40 p-4">
                      <div className="text-2xl">{getMedal(i)}</div>
                      <div className="font-semibold">{m.firstName} {m.lastName}</div>
                      <div className="text-sm text-gray-600">{m.type}</div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600">Samples</div>
                          <div className="font-semibold">{m.samplesRedeemed}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Sales</div>
                          <div className="font-semibold text-green-600">{m.salesGenerated}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {staff.length === 0 && (
                    <div className="text-sm text-gray-600">No staff yet. Add team members in the Staff tab.</div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-xl font-bold">Recent Activity</h2>
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
            {(pendingIntents.length > 0 || readyIntents.length > 0 || fulfilledIntents.length > 0) && (
              <div className="p-4 border-b bg-purple-50/40">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Purchase Requests</h2>
                  <div className="text-sm text-gray-700">Pending: {pendingIntents.length} • Ready: {readyIntents.length} • Fulfilled: {fulfilledIntents.length}</div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...readyIntents, ...pendingIntents, ...fulfilledIntents].slice(0,6).map(i => (
                    <div key={i.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold">{i.customer.firstName} {i.customer.lastName}</div>
                          <div className="text-sm text-gray-600">{i.product.name}</div>
                          <div className="text-sm font-semibold text-purple-600 mt-1">${Number(i.finalPrice).toFixed(2)}</div>
                        </div>
                        <div>
                          {i.status === 'pending' && role === 'owner' && (
                            <button onClick={() => notifyReady(i.verifySlug)} className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 whitespace-nowrap">Notify Ready</button>
                          )}
                          {i.status === 'ready' && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Ready</span>
                          )}
                          {i.status === 'fulfilled' && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Fulfilled</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <h2 className="text-xl font-bold flex-1">Your Customers ({filteredCustomers.length})</h2>
                <button
                  onClick={() => setSendingBlast(true)}
                  className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >📢 Send Message</button>
              </div>
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
                  <div className="text-xs text-gray-600 mt-1">
                    {(() => {
                      const redeemMs = customer.redeemedAt ? (new Date(customer.redeemedAt).getTime() - new Date(customer.requestedAt).getTime()) : 0;
                      const startForPurchase = (customer.redeemedAt || customer.requestedAt) as Date;
                      const purchaseMs = customer.promoRedeemedAt ? (new Date(customer.promoRedeemedAt).getTime() - new Date(startForPurchase).getTime()) : 0;
                      const last = new Date((customer.promoRedeemedAt || customer.redeemedAt || customer.requestedAt) as Date);
                      const lastMs = Date.now() - last.getTime();
                      return (
                        <span>
                          {customer.redeemed ? `Redeem: ${formatDuration(redeemMs)}` : 'Redeem: —'}
                          {' • '}
                          {customer.promoRedeemed ? `1st: ${formatDuration(purchaseMs)}` : '1st: —'}
                          {' • Last: '}{formatDuration(lastMs)} ago
                        </span>
                      );
                    })()}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {(() => {
                      const stage = customer.currentStage;
                      const followupIndex = stage === 'pending' ? 0 : stage === 'redeemed' ? 1 : -1;
                      const daysInStage = formatDuration(Date.now() - new Date(customer.stageChangedAt).getTime());
                      
                      if (followupIndex === -1) {
                        return <span>Stage: {daysInStage}</span>;
                      }
                      
                      const daysToAdd = data.store.followupDays[followupIndex] || 0;
                      const baseDate = stage === 'pending' ? new Date(customer.requestedAt) : new Date(customer.redeemedAt || customer.requestedAt);
                      const dueDate = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                      const now = new Date();
                      const diffMs = dueDate.getTime() - now.getTime();
                      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                      
                      let followupText = '';
                      if (diffMs < 0) {
                        followupText = `Follow-up: Overdue ${formatDuration(Math.abs(diffMs))}`;
                      } else if (diffDays === 0) {
                        followupText = 'Follow-up: Today';
                      } else if (diffDays === 1) {
                        followupText = 'Follow-up: Tomorrow';
                      } else {
                        followupText = `Follow-up: In ${diffDays}d`;
                      }
                      
                      return <span>{followupText} • Stage: {daysInStage}</span>;
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th
                      onClick={() => handleCustomerSort('name')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Customer {customerSortField === 'name' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('phone')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Phone {customerSortField === 'phone' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('sample')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Sample {customerSortField === 'sample' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('status')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Status {customerSortField === 'status' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('redeemTime')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Redeem Time {customerSortField === 'redeemTime' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('purchaseTime')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        1st Purchase {customerSortField === 'purchaseTime' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('lastActivity')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Last Activity {customerSortField === 'lastActivity' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('followupDue')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Follow-up Due {customerSortField === 'followupDue' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('daysInStage')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Days in Stage {customerSortField === 'daysInStage' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('requestedAt')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Requested {customerSortField === 'requestedAt' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('totalPurchases')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Total Purchases {customerSortField === 'totalPurchases' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedCustomers.map((customer) => {
                    const redeemMs = customer.redeemedAt ? (new Date(customer.redeemedAt).getTime() - new Date(customer.requestedAt).getTime()) : 0;
                    const startForPurchase = (customer.redeemedAt || customer.requestedAt) as Date;
                    const purchaseMs = customer.promoRedeemedAt ? (new Date(customer.promoRedeemedAt).getTime() - new Date(startForPurchase).getTime()) : 0;
                    const last = new Date((customer.promoRedeemedAt || customer.redeemedAt || customer.requestedAt) as Date);
                    const lastMs = Date.now() - last.getTime();
                    return (
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
                      <td className="px-4 py-3 text-sm text-gray-700">{customer.redeemed ? formatDuration(redeemMs) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{customer.promoRedeemed ? formatDuration(purchaseMs) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDuration(lastMs)} ago</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {(() => {
                          const stage = customer.currentStage;
                          const followupIndex = stage === 'pending' ? 0 : stage === 'redeemed' ? 1 : -1;
                          if (followupIndex === -1) return '—'; // No follow-up for purchased/repeat
                          
                          const daysToAdd = data.store.followupDays[followupIndex] || 0;
                          const baseDate = stage === 'pending' ? new Date(customer.requestedAt) : new Date(customer.redeemedAt || customer.requestedAt);
                          const dueDate = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                          const now = new Date();
                          const diffMs = dueDate.getTime() - now.getTime();
                          const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                          
                          if (diffMs < 0) {
                            return <span className="text-red-600 font-medium">Overdue {formatDuration(Math.abs(diffMs))}</span>;
                          } else if (diffDays === 0) {
                            return <span className="text-orange-600 font-medium">Today</span>;
                          } else if (diffDays === 1) {
                            return <span className="text-orange-500">Tomorrow</span>;
                          } else if (diffDays <= 3) {
                            return <span className="text-yellow-600">In {diffDays}d</span>;
                          } else {
                            return <span className="text-gray-600">In {diffDays}d</span>;
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDuration(Date.now() - new Date(customer.stageChangedAt).getTime())}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatRelativeTime(customer.requestedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-purple-600">
                        ${(customer.totalPurchases || 0).toFixed(2)}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Available Samples Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Available Samples</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    These are the free sample options customers can choose from
                  </p>
                </div>
                <button
                  onClick={() => setEditingSamples(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                >
                  Edit Samples
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SAMPLE_OPTIONS.map((option) => {
                  const isAvailable = (data.store.availableSamples || []).includes(option.value);
                  
                  // Map sample SKUs to their 4ct bag image paths
                  const sampleImageMap: Record<string, string> = {
                    'slumber-berry': '/images/products/4ct-SlumberBerry-Bag.png',
                    'bliss-berry': '/images/products/4ct-BlissBerry-Bag.png',
                    // berry-chill doesn't have an image yet
                  };
                  
                  const imageUrl = sampleImageMap[option.value];
                  
                  return (
                    <div
                      key={option.value}
                      className={`border-2 rounded-lg overflow-hidden ${
                        isAvailable ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {/* Product Image */}
                      <div className="h-32 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={option.label}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-4xl">🍬</div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-sm">{option.label}</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          {isAvailable ? '✓ Currently Offered' : '✗ Not Offered'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full-Size Products Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Full-Size Products</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    These are the full-size products customers can purchase
                  </p>
                </div>
                <button
                  onClick={() => setShowPurchaseRequest(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <span>+</span>
                  Request Wholesale Order
                </button>
              </div>

            {loadingProducts ? (
              <div className="text-center py-8 text-gray-500">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No products available from your brand yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const filtered = products.filter((product: any) => product.productType !== 'wholesale-box');
                  console.log('🔍 [Products Tab] Total products:', products.length);
                  console.log('🔍 [Products Tab] Filtered products (non-wholesale):', filtered.length);
                  console.log('🔍 [Products Tab] Filtered SKUs:', filtered.map((p: any) => p.sku).join(', '));
                  return filtered;
                })()
                  .map((product: any) => {
                  const isOffered = (data.store as any).availableProducts?.includes(product.sku) || false;
                  
                  return (
                    <div
                      key={product.sku}
                      className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                        isOffered ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {product.featured && (
                        <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                          ⭐ Featured
                        </div>
                      )}
                      
                      {/* Product Image */}
                      <div className="h-40 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-4xl mb-2">🍬</div>
                            <div className="text-sm text-gray-600">{product.category}</div>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-bold text-sm text-gray-900 mb-1">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-xs text-gray-600 mb-2">{product.description}</p>
                        )}
                        {product.category && (
                          <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mb-2">
                            {product.category}
                          </span>
                        )}
                        <div className="text-lg font-bold text-purple-600 mb-3">
                          ${parseFloat(product.price).toFixed(2)}
                        </div>
                        
                        <button
                          onClick={async () => {
                            const currentProducts = (data.store as any).availableProducts || [];
                            const newProducts = isOffered
                              ? currentProducts.filter((s: string) => s !== product.sku)
                              : [...currentProducts, product.sku];
                            
                            try {
                              const res = await fetch('/api/stores/update-products', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  storeId: data.store.storeId,
                                  availableProducts: newProducts
                                })
                              });
                              
                              if (res.ok) {
                                setData({
                                  ...data,
                                  store: {
                                    ...data.store,
                                    availableProducts: newProducts
                                  } as any
                                });
                              }
                            } catch (err) {
                              console.error('Failed to update products:', err);
                            }
                          }}
                          className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                            isOffered
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          {isOffered ? '✓ Offering' : '+ Offer This Product'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Staff Tab (Owner Only) */}
        {activeTab === 'staff' && role === 'owner' && (
          <>
            {/* Staff Leaderboard */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <h2 className="text-xl font-bold">Staff Leaderboard 🏆</h2>
                <div className="flex gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setSendingStaffMsg(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    📢 Message Staff
                  </button>
                  <button
                    onClick={openAddStaff}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Staff Member
                  </button>
                </div>
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
                              <div className="font-medium flex items-center gap-2">
                                <span>{member.firstName} {member.lastName}</span>
                                {member.verified ? (
                                  <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-[10px] font-semibold">Verified</span>
                                ) : (
                                  <span className="text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded text-[10px] font-semibold">Pending</span>
                                )}
                              </div>
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
                                {!member.verified && (
                                  <button
                                    onClick={() => resendVerification(member.staffId)}
                                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Resend
                                  </button>
                                )}
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
                              <div className="font-semibold flex items-center gap-2">#{index + 1} {member.firstName} {member.lastName}
                                {member.verified ? (
                                  <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-[10px] font-semibold">Verified</span>
                                ) : (
                                  <span className="text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded text-[10px] font-semibold">Pending</span>
                                )}
                              </div>
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
                          {!member.verified && (
                            <button
                              onClick={() => resendVerification(member.staffId)}
                              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Resend
                            </button>
                          )}
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
                
                {/* Administrator Info */}
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-sm text-gray-600">Program Administrator</label>
                    <p className="text-sm font-medium">{data.store.adminName || 'Not set'}</p>
                    <p className="text-sm">{data.store.adminEmail || 'Not set'}</p>
                    <p className="text-sm">{data.store.adminPhone || 'Not set'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setContactForm({
                        adminName: data.store.adminName || '',
                        adminEmail: data.store.adminEmail || '',
                        adminPhone: data.store.adminPhone || ''
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

            {/* Owner & Purchasing Manager Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Owner & Purchasing Details</h2>
                <button
                  onClick={openEditStoreContact}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >Edit</button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Owner</h3>
                  <div className="text-sm space-y-1">
                    <div>{data.store.ownerName || <span className="text-gray-500">Name not set</span>}</div>
                    <div>{data.store.ownerPhone || <span className="text-gray-500">Phone not set</span>}</div>
                    <div className="text-gray-600">{data.store.ownerEmail || <span className="text-gray-500">Email not set</span>}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Purchasing Manager</h3>
                  <div className="text-sm space-y-1">
                    <div>{data.store.purchasingManager || <span className="text-gray-500">Name not set</span>}</div>
                    <div>{data.store.purchasingPhone || <span className="text-gray-500">Phone not set</span>}</div>
                    <div className="text-gray-600">{data.store.purchasingEmail || <span className="text-gray-500">Email not set</span>}</div>
                  </div>
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
        <div className={`grid ${role === 'owner' ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium">{role === 'staff' ? 'Stats' : 'Home'}</span>
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
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 ${
              activeTab === 'products' ? 'bg-purple-600 text-white' : 'text-gray-600'
            }`}
          >
            <span className="text-xl">🛍️</span>
            <span className="text-xs font-medium">Products</span>
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

      {/* Purchase Request Modal */}
      {showPurchaseRequest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">Request Wholesale Product Order</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Select boxes and quantities for your wholesale order inquiry
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPurchaseRequest(false);
                  setBoxQuantities({});
                  setPurchaseRequestNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {loadingProducts ? (
              <div className="text-center py-8 text-gray-500">Loading products...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {products
                    .filter((p: any) => p.productType === 'wholesale-box')
                    .sort((a: any, b: any) => {
                      // Hardcoded sort order
                      const order = [
                        'VD-SB-4-BX',   // Slumber Berry - 4ct Box
                        'VD-SB-30-BX',  // Slumber Berry - 30ct Box
                        'VD-SB-60-BX',  // Slumber Berry - 60ct Box
                        'VD-BB-4-BX',   // Bliss Berry - 4ct Box
                        'VD-BB-30-BX',  // Bliss Berry - 30ct Box
                        'VD-BB-60-BX',  // Bliss Berry - 60ct Box
                        'VD-CC-4-BX',   // Berry Chill - 4ct Box
                        'VD-CC-20-BX',  // Berry Chill - 20ct Box
                        'VD-CC-60-BX',  // Berry Chill - 60ct Box
                      ];
                      const indexA = order.indexOf(a.sku);
                      const indexB = order.indexOf(b.sku);
                      // If not in list, push to end
                      if (indexA === -1 && indexB === -1) return 0;
                      if (indexA === -1) return 1;
                      if (indexB === -1) return -1;
                      return indexA - indexB;
                    })
                    .map((product: any) => {
                      const qty = boxQuantities[product.sku] || 0;
                      const wholesalePrice = parseFloat(product.wholesalePrice || 0);
                      const retailPrice = parseFloat(product.retailPrice || 0);
                      const boxPrice = parseFloat(product.price);
                      const unitsPerBox = product.unitsPerBox || 1;
                      const margin = retailPrice > 0 ? ((retailPrice - wholesalePrice) / retailPrice * 100).toFixed(0) : 0;
                      
                      return (
                        <div
                          key={product.sku}
                          className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                            qty > 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-base">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-gray-600 mb-2">{product.description}</div>
                            )}
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Box ({unitsPerBox} units):</span>
                                <span className="font-bold text-green-600">${boxPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Per Unit:</span>
                                <span className="font-semibold">${wholesalePrice.toFixed(2)}</span>
                                <span className="text-gray-400">→</span>
                                <span className="font-semibold">${retailPrice.toFixed(2)}</span>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{margin}% margin</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const newQty = Math.max(0, qty - 1);
                                setBoxQuantities({ ...boxQuantities, [product.sku]: newQty });
                              }}
                              disabled={qty === 0}
                              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-lg"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              max="999"
                              value={qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setBoxQuantities({ ...boxQuantities, [product.sku]: Math.max(0, Math.min(999, val)) });
                              }}
                              className="w-16 text-center border border-gray-300 rounded px-2 py-1 font-semibold"
                            />
                            <button
                              onClick={() => {
                                const newQty = Math.min(999, qty + 1);
                                setBoxQuantities({ ...boxQuantities, [product.sku]: newQty });
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 font-bold text-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Order Summary */}
                {(() => {
                  const selectedBoxes = Object.entries(boxQuantities).filter(([_, qty]) => qty > 0);
                  if (selectedBoxes.length === 0) return null;
                  
                  const totalBoxes = selectedBoxes.reduce((sum, [_, qty]) => sum + qty, 0);
                  const totalCost = selectedBoxes.reduce((sum, [sku, qty]) => {
                    const product = products.find((p: any) => p.sku === sku);
                    return sum + (parseFloat(product?.price || 0) * qty);
                  }, 0);
                  const totalRetailValue = selectedBoxes.reduce((sum, [sku, qty]) => {
                    const product = products.find((p: any) => p.sku === sku);
                    const retailPrice = parseFloat(product?.retailPrice || 0);
                    const unitsPerBox = product?.unitsPerBox || 1;
                    return sum + (retailPrice * unitsPerBox * qty);
                  }, 0);
                  
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-bold text-sm mb-3">Order Summary</h4>
                      <div className="space-y-2 text-sm">
                        {selectedBoxes.map(([sku, qty]) => {
                          const product = products.find((p: any) => p.sku === sku);
                          const boxPrice = parseFloat(product?.price || 0);
                          return (
                            <div key={sku} className="flex justify-between">
                              <span>{product?.name} × {qty}</span>
                              <span className="font-semibold">${(boxPrice * qty).toFixed(2)}</span>
                            </div>
                          );
                        })}
                        <div className="border-t border-blue-200 pt-2 mt-2">
                          <div className="flex justify-between font-bold">
                            <span>Subtotal ({totalBoxes} boxes)</span>
                            <span className="text-green-600">${totalCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Retail Value</span>
                            <span>${totalRetailValue.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-semibold text-blue-700 mt-1">
                            <span>Potential Profit</span>
                            <span>${(totalRetailValue - totalCost).toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            + Shipping (to be determined)
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={purchaseRequestNotes}
                    onChange={(e) => setPurchaseRequestNotes(e.target.value)}
                    placeholder="e.g., When do you need delivery? Any special requirements?"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPurchaseRequest(false);
                      setBoxQuantities({});
                      setPurchaseRequestNotes('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const selectedBoxes = Object.entries(boxQuantities).filter(([_, qty]) => qty > 0);
                      if (selectedBoxes.length === 0) {
                        alert('Please select at least one product');
                        return;
                      }

                      setSendingPurchaseRequest(true);
                      try {
                        const res = await fetch('/api/stores/purchase-request', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            storeId: data.store.storeId,
                            storeName: data.store.storeName,
                            boxQuantities,
                            notes: purchaseRequestNotes,
                            contactName: data.store.ownerName || data.store.adminName,
                            contactEmail: data.store.ownerEmail || data.store.adminEmail,
                            contactPhone: data.store.ownerPhone || data.store.adminPhone,
                          })
                        });

                        if (res.ok) {
                          alert('✅ Wholesale order request sent to VitaDreamz! They will contact you soon with shipping details and payment information.');
                          setShowPurchaseRequest(false);
                          setBoxQuantities({});
                          setPurchaseRequestNotes('');
                        } else {
                          throw new Error('Failed to send request');
                        }
                      } catch (err) {
                        console.error('Failed to send purchase request:', err);
                        alert('❌ Failed to send purchase request. Please try again.');
                      } finally {
                        setSendingPurchaseRequest(false);
                      }
                    }}
                    disabled={sendingPurchaseRequest || Object.values(boxQuantities).every(q => q === 0)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {sendingPurchaseRequest ? 'Sending...' : 'Send Wholesale Order Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Promo Modal */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Promo Offer</h3>
            
            <form onSubmit={savePromo}>
              <label className="block text-sm font-medium mb-2">Discount Percentage</label>
              <select
                value={promoForm}
                onChange={(e) => setPromoForm(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-4 focus:ring-2 focus:ring-purple-500"
              >
                <option value="10">10% Off In-Store Purchase</option>
                <option value="15">15% Off In-Store Purchase</option>
                <option value="20">20% Off In-Store Purchase</option>
                <option value="25">25% Off In-Store Purchase</option>
                <option value="30">30% Off In-Store Purchase</option>
              </select>
              
              <p className="text-sm text-gray-600 mb-4">
                This discount will appear in follow-up messages and promo redemption pages.
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

      {/* Edit Samples Modal */}
      {editingSamples && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Available Samples</h3>
            
            <form onSubmit={saveSamples}>
              <p className="text-sm text-gray-600 mb-4">
                Select which sample products your store currently has in stock:
              </p>
              
              <div className="space-y-3 mb-4">
                {SAMPLE_OPTIONS.map((sample) => (
                  <label
                    key={sample.value}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSamples.includes(sample.value)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSamples.includes(sample.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSamples([...selectedSamples, sample.value]);
                        } else {
                          setSelectedSamples(selectedSamples.filter(s => s !== sample.value));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{sample.label.split(' - ')[0]}</div>
                      <div className="text-xs text-gray-600">{sample.label.split(' - ')[1]}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                Select at least one sample. Customers will only see samples you've selected.
              </p>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || selectedSamples.length === 0}
                  className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Samples'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSamples(false)}
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

      {/* Edit Administrator Info Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Administrator Info</h3>
            
            <form onSubmit={saveContact}>
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Administrator Name</label>
                  <input
                    value={contactForm.adminName}
                    onChange={(e) => setContactForm({ ...contactForm, adminName: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={contactForm.adminEmail}
                    onChange={(e) => setContactForm({ ...contactForm, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    value={contactForm.adminPhone}
                    onChange={(e) => setContactForm({ ...contactForm, adminPhone: e.target.value })}
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
                  onChange={(e) => setBlastForm({ ...blastForm, audience: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Customers ({data.customers.length})</option>
                  <option value="redeemed">Redeemed Sample ({stats.samplesRedeemed})</option>
                  <option value="not-promo">Didn't Use Promo ({stats.samplesRedeemed - stats.promosUsed})</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Channel:</label>
                <select
                  value={blastForm.channel}
                  onChange={(e) => setBlastForm({ ...blastForm, channel: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
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

      {/* Staff Messaging Modal */}
      {sendingStaffMsg && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">📢 Message Staff</h3>

            <form onSubmit={sendStaffMessage}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Recipients:</label>
                <select
                  value={staffMsgForm.recipients}
                  onChange={(e) => setStaffMsgForm({ ...staffMsgForm, recipients: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Staff</option>
                  <option value="type">By Type</option>
                  <option value="specific">Specific Staff</option>
                </select>
              </div>

              {staffMsgForm.recipients === 'type' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Staff Type:</label>
                  <select
                    value={staffMsgForm.type}
                    onChange={(e) => setStaffMsgForm({ ...staffMsgForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>
              )}

              {staffMsgForm.recipients === 'specific' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Staff Member (ID):</label>
                  <input
                    value={staffMsgForm.staffId}
                    onChange={(e) => setStaffMsgForm({ ...staffMsgForm, staffId: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    placeholder="STF-001"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the Staff ID (e.g., STF-001)</p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Channel:</label>
                <select
                  value={staffMsgForm.channel}
                  onChange={(e) => setStaffMsgForm({ ...staffMsgForm, channel: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                >
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message:</label>
                <textarea
                  value={staffMsgForm.message}
                  onChange={(e) => setStaffMsgForm({ ...staffMsgForm, message: e.target.value })}
                  rows={4}
                  maxLength={500}
                  placeholder="Reminder: Team meeting at 9am tomorrow."
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">{staffMsgForm.message.length}/500</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={blasting || !staffMsgForm.message.trim()}
                  className="flex-1 bg-purple-600 text-white py-3 rounded hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                >
                  {blasting ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  type="button"
                  onClick={() => setSendingStaffMsg(false)}
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
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      placeholder="9496836147"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Their PIN will be the last 4 digits of this number
                    </span>
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
