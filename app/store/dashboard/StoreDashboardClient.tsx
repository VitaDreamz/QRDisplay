'use client';

import React, { useState, useEffect } from 'react';
import { SAMPLE_OPTIONS } from '@/lib/constants';

type Store = {
  storeId: string;
  storeName: string;
  promoOffer: string;
  returningCustomerPromo: string;
  followupDays: number[];
  postPurchaseFollowupDays: number[];
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
  purchaseIntents?: Array<{
    id: string;
    status: string;
    createdAt: Date;
    finalPrice: number;
    fulfilledAt?: Date | null;
    product?: {
      name: string;
      sku: string;
    } | null;
  }>;
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
    fulfilledAt?: Date | null;
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
  const [mounted, setMounted] = useState(false);
  
  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Modals
  const [editingPromo, setEditingPromo] = useState(false);
  const [editingReturningPromo, setEditingReturningPromo] = useState(false);
  const [editingFollowups, setEditingFollowups] = useState(false);
  const [editingPostPurchaseFollowups, setEditingPostPurchaseFollowups] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [sendingBlast, setSendingBlast] = useState(false);
  const [sendingStaffMsg, setSendingStaffMsg] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  
  // Collapsible sections state
  const [purchaseRequestsExpanded, setPurchaseRequestsExpanded] = useState(false);
  const [samplesRequestedExpanded, setSamplesRequestedExpanded] = useState(false);
  
  // Fix hydration by only showing relative times after mount
  useEffect(() => {
    setMounted(true);
  }, []);
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
  const [staffSortBy, setStaffSortBy] = useState<'samples' | 'sales' | 'type' | 'totalSales'>('totalSales');
  const [staffSortOrder, setStaffSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [editingStoreContact, setEditingStoreContact] = useState(false);
  const [storeContactForm, setStoreContactForm] = useState<any>({});
  
  // Forms
  const [promoForm, setPromoForm] = useState(() => {
    // Extract percentage from existing promo offer (e.g., "20% Off 1st In-Store Purchase" -> "20")
    const match = data.store.promoOffer.match(/(\d+)%/);
    return match ? match[1] : '20';
  });
  const [returningPromoForm, setReturningPromoForm] = useState(() => {
    // Extract percentage from existing returning customer promo
    const match = data.store.returningCustomerPromo.match(/(\d+)%/);
    return match ? match[1] : '10';
  });
  const [followupForm, setFollowupForm] = useState<number[]>(data.store.followupDays);
  const [postPurchaseFollowupForm, setPostPurchaseFollowupForm] = useState<number[]>(data.store.postPurchaseFollowupDays || [45, 90]);
  const [contactForm, setContactForm] = useState({
    adminName: data.store.adminName || '',
    adminEmail: data.store.adminEmail || '',
    adminPhone: data.store.adminPhone || ''
  });
  const [pinForm, setPinForm] = useState({ current: '', new: '' });
  const [blastForm, setBlastForm] = useState({
    audience: 'all' as 'all' | 'undecided' | 'sampling' | 'purchased' | 'ready_for_pickup',
    message: ''
  });
  const [staffMsgForm, setStaffMsgForm] = useState({
    recipients: 'all' as 'all' | 'type' | 'specific',
    type: 'Sales',
    staffId: '',
    channel: 'sms' as 'sms' | 'email' | 'both',
    message: ''
  });
  const [directMessageCustomer, setDirectMessageCustomer] = useState<typeof data.customers[0] | null>(null);
  const [directMessageForm, setDirectMessageForm] = useState({
    message: ''
  });
  const [sendingDirectMessage, setSendingDirectMessage] = useState(false);
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
  
  // Calculate pending sales (purchase intents not yet fulfilled)
  const pendingSales = purchaseIntents
    .filter(i => i.status === 'pending' || i.status === 'ready')
    .reduce((sum, i) => sum + (Number(i.finalPrice) || 0), 0);
  
  // Calculate total sales count and amount (fulfilled purchase intents)
  const numberOfSales = purchaseIntents.filter(i => i.status === 'fulfilled').length;
  const totalSales = purchaseIntents
    .filter(i => i.status === 'fulfilled')
    .reduce((sum, i) => sum + (Number(i.finalPrice) || 0), 0);

  const stats = {
    samplesRequested: data.customers.length,
    samplesRedeemed,
    numberOfSales,
    totalSales,
    pendingSales,
    promosUsed: numberOfSales, // Use number of sales for backward compatibility
    conversionRate: samplesRedeemed > 0
      ? Math.round((numberOfSales / samplesRedeemed) * 100)
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
  const todaySales = purchaseIntents.filter(i => i.status === 'fulfilled' && i.fulfilledAt && isToday(i.fulfilledAt)).length;

  // Helper to get time since purchase request and color coding
  const getTimeSinceRequest = (createdAt: Date) => {
    const now = new Date();
    const requested = new Date(createdAt);
    const hoursAgo = Math.floor((now.getTime() - requested.getTime()) / (1000 * 60 * 60));
    const daysAgo = Math.floor(hoursAgo / 24);
    
    let color = 'bg-green-100 text-green-700'; // 0-48hrs
    if (hoursAgo >= 96) {
      color = 'bg-red-100 text-red-700'; // 96+ hrs
    } else if (hoursAgo >= 48) {
      color = 'bg-yellow-100 text-yellow-700'; // 48-96hrs
    }
    
    const timeText = daysAgo > 0 ? `${daysAgo}d ${hoursAgo % 24}h ago` : `${hoursAgo}h ago`;
    return { timeText, color, hoursAgo };
  };

  // Get oldest pending/ready request for timer display
  const oldestPendingRequest = [...pendingIntents, ...readyIntents]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

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
          
          // Purchased customers use 30-day retention
          if (stage === 'purchased' || stage === 'repeat') {
            const fulfilledPurchase = c.purchaseIntents?.find(pi => pi.status === 'fulfilled');
            const lastPurchase = fulfilledPurchase?.fulfilledAt 
              ? new Date(fulfilledPurchase.fulfilledAt) 
              : new Date(c.promoRedeemedAt || c.requestedAt);
            return lastPurchase.getTime() + (30 * 24 * 60 * 60 * 1000);
          }
          
          // Pre-purchase follow-up (always from sample request date)
          // pending = waiting for 1st followup, sampling = waiting for 1st followup, undecided = waiting for 2nd followup
          const followupIndex = (stage === 'pending' || stage === 'sampling') ? 0 : stage === 'undecided' ? 1 : -1;
          if (followupIndex === -1) return Number.POSITIVE_INFINITY; // No follow-up for other stages
          
          const daysToAdd = data.store.followupDays[followupIndex] || 0;
          const baseDate = new Date(c.requestedAt); // Always use sample request date
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
    if (audience === 'undecided') return data.customers.filter(c => c.currentStage === 'undecided').length;
    if (audience === 'sampling') return data.customers.filter(c => c.currentStage === 'sampling').length;
    if (audience === 'purchased') return data.customers.filter(c => c.currentStage === 'purchased' || c.currentStage === 'repeat').length;
    if (audience === 'ready_for_pickup') return data.customers.filter(c => c.currentStage === 'ready_for_pickup').length;
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
      const promoOfferText = promoForm === '0' ? 'No Promo' : `${promoForm}% Off In-Store Purchase`;
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

  const saveReturningPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promoOfferText = returningPromoForm === '0' ? 'No Promo' : `${returningPromoForm}% Off In-Store Purchase`;
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returningCustomerPromo: promoOfferText })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, returningCustomerPromo: promoOfferText } });
        setEditingReturningPromo(false);
        alert('Returning customer promo updated!');
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

  const savePostPurchaseFollowups = async (e: React.FormEvent) => {
    e.preventDefault();
    if (postPurchaseFollowupForm.length === 0) {
      alert('Select at least one follow-up day');
      return;
    }
    if (postPurchaseFollowupForm.length > 2) {
      alert('Select up to 2 follow-up days');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postPurchaseFollowupDays: postPurchaseFollowupForm })
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, store: { ...data.store, postPurchaseFollowupDays: postPurchaseFollowupForm } });
        setEditingPostPurchaseFollowups(false);
        alert('Post-purchase follow-up schedule updated!');
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

  const sendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directMessageCustomer) return;
    
    setSendingDirectMessage(true);
    try {
      const res = await fetch('/api/store/message/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'specific',
          customerId: directMessageCustomer.id,
          message: directMessageForm.message
        })
      });
      const result = await res.json();
      if (result.success) {
        alert('Message sent successfully!');
        setDirectMessageForm({ message: '' });
        setDirectMessageCustomer(null);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to send');
    } finally {
      setSendingDirectMessage(false);
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

  const handleStaffSort = (column: 'samples' | 'sales' | 'type' | 'totalSales') => {
    if (staffSortBy === column) {
      setStaffSortOrder(staffSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setStaffSortBy(column);
      setStaffSortOrder('desc');
    }
  };

  const getSortedStaff = () => {
    return [...staff].sort((a, b) => {
      let aVal, bVal;
      switch (staffSortBy) {
        case 'samples':
          aVal = a.samplesRedeemed;
          bVal = b.samplesRedeemed;
          break;
        case 'sales':
          aVal = a.salesGenerated;
          bVal = b.salesGenerated;
          break;
        case 'totalSales':
          aVal = a.totalSales || 0;
          bVal = b.totalSales || 0;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          return staffSortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        default:
          return 0;
      }
      return staffSortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  // Fetch products from brand
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const orgId = (data.organization as any)?.orgId;
      console.log('🔍 [Products Tab] data.store:', data.store);
      console.log('🔍 [Products Tab] data.store keys:', Object.keys(data.store));
      console.log('🔍 [Products Tab] Available keys are:', Object.keys(data.store).join(', '));
      const storeDbId = (data.store as any).id; // Use database ID, not human-readable storeId
      console.log('🔍 [Products Tab] Fetching products for orgId:', orgId);
      console.log('🔍 [Products Tab] storeDbId extracted:', storeDbId);
      console.log('🔍 [Products Tab] Fetching inventory for store:', data.store.storeId, '(DB ID:', storeDbId, ')');
      if (!orgId) {
        console.error('❌ [Products Tab] No orgId found');
        setLoadingProducts(false);
        return;
      }
      const res = await fetch(`/api/products?orgId=${orgId}&storeId=${storeDbId}`);
      console.log('🔍 [Products Tab] API response status:', res.status);
      if (res.ok) {
        const productsData = await res.json();
        console.log('✅ [Products Tab] Products received:', productsData.products?.length || 0);
        console.log('🔍 [Products Tab] Products data:', productsData.products);
        // Log detailed info about each product
        productsData.products?.forEach((p: any) => {
          console.log(`📦 Product: ${p.sku} | Type: ${p.productType} | Active: ${p.active} | Name: ${p.name} | Inventory: ${p.inventoryQuantity}`);
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

  // Update inventory quantity
  const updateInventory = async (productSku: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    try {
      const res = await fetch('/api/store/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSku,
          quantity: newQuantity,
          type: 'manual_adjustment'
        })
      });
      
      if (res.ok) {
        // Refresh products to get updated inventory
        await fetchProducts();
      } else {
        console.error('Failed to update inventory');
      }
    } catch (err) {
      console.error('Error updating inventory:', err);
    }
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 px-4 md:px-6 py-2 md:py-5">
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 mb-1.5">
            {data.store.storeName}
          </h1>
          {data.organization?.name && (
            <div className="flex flex-col items-center">
              <p className="text-sm md:text-base font-semibold text-white">
                {data.organization.name} Samples Dashboard
              </p>
              <p className="text-[10px] text-pink-200 mt-0.5">
                powered by QRDisplay
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Hidden on Settings/Customers/Products tabs (mobile), Hidden on Settings only (desktop) */}
      {activeTab !== 'settings' && (
        <div className={`px-4 md:px-6 py-2 md:py-3 ${(activeTab === 'customers' || activeTab === 'products') ? 'hidden md:block' : ''}`}>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 md:gap-4">
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg hover:shadow-xl transition">
              <div className="text-xs text-gray-600 font-medium">Samples Requested</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-600 mt-1">{data.customers.length}</div>
              <div className="text-xs text-gray-500 mt-1">📋 Total requests</div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg hover:shadow-xl transition">
              <div className="text-xs text-gray-600 font-medium">Samples Redeemed</div>
              <div className="text-2xl md:text-3xl font-bold text-green-600 mt-1">{stats.samplesRedeemed}</div>
              <div className="text-xs text-gray-500 mt-1">✅ +{todayRedeemed} today</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1 pt-1 border-t border-gray-100">
                {data.customers.length > 0 ? ((stats.samplesRedeemed / data.customers.length) * 100).toFixed(1) : 0}% conversion
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg hover:shadow-xl transition">
              <div className="text-xs text-gray-600 font-medium">Pending Orders</div>
              <div className="text-2xl md:text-3xl font-bold text-amber-600 mt-1">{pendingIntents.length + readyIntents.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                ⏳ {readyIntents.length} ready, {pendingIntents.length} requested
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg hover:shadow-xl transition">
              <div className="text-xs text-gray-600 font-medium">Pending Sales</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600 mt-1">
                ${stats.pendingSales.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">💵 In progress</div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-lg hover:shadow-xl transition">
              <div className="text-xs text-gray-600 font-medium">Total Orders</div>
              <div className="text-2xl md:text-3xl font-bold text-indigo-600 mt-1">{fulfilledIntents.length}</div>
              <div className="text-xs text-gray-500 mt-1">🛍️ Completed sales</div>
              <div className="text-xs text-indigo-600 font-semibold mt-1 pt-1 border-t border-gray-100">
                {stats.samplesRedeemed > 0 ? ((fulfilledIntents.length / stats.samplesRedeemed) * 100).toFixed(1) : 0}% conversion
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 md:p-6 shadow-sm hover:shadow transition">
              <div className="text-xs text-gray-600 font-medium">Total Sales</div>
              <div className="text-2xl md:text-3xl font-bold text-purple-600 mt-1">
                ${stats.totalSales.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">💰 {fulfilledIntents.length} fulfilled</div>
              <div className="text-xs text-purple-600 font-semibold mt-1 pt-1 border-t border-gray-100">
                {stats.samplesRedeemed > 0 ? ((stats.numberOfSales / stats.samplesRedeemed) * 100).toFixed(1) : 0}% conversion
              </div>
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
            🛍️ Products
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
      <div className="px-4 md:px-6 py-4 space-y-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Purchase Requests Card - NOW FIRST */}
            {(pendingIntents.length > 0 || readyIntents.length > 0) && (
              <div className="bg-white rounded-lg shadow">
                <div 
                  onClick={() => setPurchaseRequestsExpanded(!purchaseRequestsExpanded)}
                  className="p-3 sm:p-4 bg-purple-50/40 cursor-pointer hover:bg-purple-50/60 transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-gray-500">{purchaseRequestsExpanded ? '▼' : '▶'}</span>
                      <h2 className="text-lg sm:text-xl font-bold text-purple-900">🛒 Purchase Requests</h2>
                      <span className="text-xs sm:text-sm bg-purple-600 text-white px-2 sm:px-3 py-1 rounded-full font-semibold">
                        {pendingIntents.length + readyIntents.length} Waiting
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Pending: {pendingIntents.length} • Ready: {readyIntents.length}
                    </div>
                  </div>
                </div>
                {purchaseRequestsExpanded && (
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {[...readyIntents, ...pendingIntents].slice(0,8).map((i) => (
                      <div key={i.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 relative">
                        {/* Timer Badge - Top Right */}
                        <div className="absolute top-3 right-3">
                          {(() => {
                            const timeSince = getTimeSinceRequest(i.createdAt);
                            return (
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${timeSince.color}`}>
                                ⏱️ {timeSince.timeText}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {i.product.imageUrl && (
                            <img 
                              src={i.product.imageUrl} 
                              alt={i.product.name}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm sm:text-base">{i.customer.firstName} {i.customer.lastName}</div>
                            <div className="text-xs sm:text-sm text-gray-600 truncate">{i.product.name}</div>
                            <div className="text-xs text-gray-500 hidden sm:block">{new Date(i.createdAt).toLocaleString()} • {i.status.toUpperCase()}</div>
                            <div className="text-sm font-semibold text-purple-600 mt-0.5">${Number(i.finalPrice).toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
                          {i.status === 'pending' && role === 'owner' && (
                            <button onClick={() => notifyReady(i.verifySlug)} className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 active:bg-purple-800">Notify Ready</button>
                          )}
                          {i.status === 'ready' && (
                            <span className="flex-1 sm:flex-none text-center text-xs bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg font-medium">Customer Notified</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Samples Requested Card */}
            {data.customers.filter(c => !c.redeemed).length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div 
                  onClick={() => setSamplesRequestedExpanded(!samplesRequestedExpanded)}
                  className="p-3 sm:p-4 bg-blue-50/40 cursor-pointer hover:bg-blue-50/60 transition-colors"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-gray-500">{samplesRequestedExpanded ? '▼' : '▶'}</span>
                      <h2 className="text-lg sm:text-xl font-bold text-blue-900">✨ Samples Requested</h2>
                      <span className="text-xs sm:text-sm bg-blue-600 text-white px-2 sm:px-3 py-1 rounded-full font-semibold">
                        {data.customers.filter(c => !c.redeemed).length} Pending
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Redeemed: {samplesRedeemed} • Total: {data.customers.length}
                    </div>
                  </div>
                </div>
                {samplesRequestedExpanded && (
                  <div className="divide-y max-h-96 overflow-y-auto">
                  {data.customers
                    .filter(c => !c.redeemed)
                    .slice(0, 8)
                    .map((customer) => (
                      <div key={customer.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm sm:text-base">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 truncate">
                              {customer.sampleChoice}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {mounted ? formatRelativeTime(customer.requestedAt) : new Date(customer.requestedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium whitespace-nowrap">
                              ⏳ Pending
                            </span>
                            <a 
                              href={`tel:${customer.phone}`}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {customer.phone}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {samplesRequestedExpanded && data.customers.filter(c => !c.redeemed).length > 8 && (
                  <div className="p-3 text-center border-t bg-gray-50">
                    <button
                      onClick={() => {
                        setActiveTab('customers');
                        setCustomerFilter('pending');
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View all {data.customers.filter(c => !c.redeemed).length} pending samples →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Promo Offer Cards */}
            {role === 'owner' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1st Purchase Promo */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl shadow p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm opacity-90 mb-2">1st Purchase Promo</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-4xl md:text-5xl font-bold">
                          {data.store.promoOffer === 'No Promo' ? 'NO PROMO' : `${data.store.promoOffer.match(/(\d+)%/)?.[1] || '20'}% OFF`}
                        </div>
                      </div>
                      <div className="text-base opacity-90 mt-1">{data.store.promoOffer === 'No Promo' ? 'Not offering a promo' : 'In-Store Purchase'}</div>
                      <div className="text-xs opacity-75 mt-2">Edit to update the deal you offer 1st time customers</div>
                    </div>
                    <button
                      onClick={() => { 
                        const match = data.store.promoOffer.match(/(\d+)%/);
                        setPromoForm(match ? match[1] : (data.store.promoOffer === 'No Promo' ? '0' : '20'));
                        setEditingPromo(true); 
                      }}
                      className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-md text-sm font-medium"
                    >Edit</button>
                  </div>
                </div>

                {/* Returning Customer Promo */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl shadow p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm opacity-90 mb-2">Returning Customer Promo</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-4xl md:text-5xl font-bold">
                          {data.store.returningCustomerPromo === 'No Promo' ? 'NO PROMO' : `${data.store.returningCustomerPromo.match(/(\d+)%/)?.[1] || '10'}% OFF`}
                        </div>
                      </div>
                      <div className="text-base opacity-90 mt-1">{data.store.returningCustomerPromo === 'No Promo' ? 'Not offering a promo' : 'In-Store Purchase'}</div>
                      <div className="text-xs opacity-75 mt-2">Edit to update the deal you offer returning customers</div>
                    </div>
                    <button
                      onClick={() => { 
                        const match = data.store.returningCustomerPromo.match(/(\d+)%/);
                        setReturningPromoForm(match ? match[1] : (data.store.returningCustomerPromo === 'No Promo' ? '0' : '10'));
                        setEditingReturningPromo(true); 
                      }}
                      className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-md text-sm font-medium"
                    >Edit</button>
                  </div>
                </div>
              </div>
            )}

            {/* Place Wholesale Order Card */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Place Wholesale Order</h2>
                  <p className="text-purple-100 mb-3">
                    Order wholesale products for your store inventory
                  </p>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 inline-flex">
                    <span className="text-3xl">💰</span>
                    <div>
                      <p className="text-xs text-purple-100 uppercase tracking-wide">Available Store Credit</p>
                      <p className="text-2xl font-bold">${((data.store as any).storeCredit || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPurchaseRequest(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  + Place Order
                </button>
              </div>
            </div>

            {/* Top 3 Staff */}
            {role === 'owner' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-xl font-bold">Top Staff Performers 🏆</h2>
                  <button onClick={() => setActiveTab('staff')} className="text-purple-600 hover:text-purple-700 text-sm font-medium">View Leaderboard →</button>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {staff.slice(0,3).map((m, i) => (
                    <div key={m.id} className="rounded-lg border border-yellow-200 bg-yellow-50/40 p-4">
                      <div className="text-2xl">{getMedal(i)}</div>
                      <div className="font-semibold">{m.firstName} {m.lastName}</div>
                      <div className="text-sm text-gray-600">{m.type}</div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-gray-600">Samples</div>
                          <div className="font-semibold">{m.samplesRedeemed}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Sales</div>
                          <div className="font-semibold text-green-600">{m.salesGenerated}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Total $</div>
                          <div className="font-semibold text-green-600">${(m.totalSales || 0).toFixed(2)}</div>
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
                {(() => {
                  // Gather all activities
                  const activities: Array<{
                    id: string;
                    type: 'sample-request' | 'sample-redeemed' | 'purchase-requested' | 'purchase-ready' | 'purchase-fulfilled' | 'promo-redeemed';
                    timestamp: Date;
                    customer: { firstName: string; lastName: string };
                    details: string;
                    badge: { color: string; text: string; emoji: string };
                  }> = [];

                  // Sample requests
                  data.customers.forEach(c => {
                    activities.push({
                      id: `sample-req-${c.id}`,
                      type: 'sample-request',
                      timestamp: new Date(c.requestedAt),
                      customer: { firstName: c.firstName, lastName: c.lastName },
                      details: c.sampleChoice,
                      badge: { color: 'bg-purple-100 text-purple-800', text: 'Sample Requested', emoji: '📋' }
                    });
                  });

                  // Sample redemptions
                  data.customers.filter(c => c.redeemed && c.redeemedAt).forEach(c => {
                    activities.push({
                      id: `sample-red-${c.id}`,
                      type: 'sample-redeemed',
                      timestamp: new Date(c.redeemedAt!),
                      customer: { firstName: c.firstName, lastName: c.lastName },
                      details: c.sampleChoice,
                      badge: { color: 'bg-blue-100 text-blue-800', text: 'Sample Redeemed', emoji: '✅' }
                    });
                  });

                  // Purchase intents
                  purchaseIntents.forEach(pi => {
                    activities.push({
                      id: `purchase-req-${pi.id}`,
                      type: 'purchase-requested',
                      timestamp: new Date(pi.createdAt),
                      customer: { firstName: pi.customer.firstName, lastName: pi.customer.lastName },
                      details: `${pi.product.name} - $${pi.finalPrice.toFixed(2)}`,
                      badge: { color: 'bg-yellow-100 text-yellow-800', text: 'Purchase Requested', emoji: '🛒' }
                    });

                    if (pi.status === 'ready' || pi.status === 'fulfilled') {
                      activities.push({
                        id: `purchase-ready-${pi.id}`,
                        type: 'purchase-ready',
                        timestamp: new Date(pi.createdAt), // Use created date as proxy for ready time
                        customer: { firstName: pi.customer.firstName, lastName: pi.customer.lastName },
                        details: `${pi.product.name} ready for pickup`,
                        badge: { color: 'bg-orange-100 text-orange-800', text: 'Purchase Ready', emoji: '📦' }
                      });
                    }

                    if (pi.status === 'fulfilled' && pi.fulfilledAt) {
                      activities.push({
                        id: `purchase-ful-${pi.id}`,
                        type: 'purchase-fulfilled',
                        timestamp: new Date(pi.fulfilledAt),
                        customer: { firstName: pi.customer.firstName, lastName: pi.customer.lastName },
                        details: `${pi.product.name} - $${pi.finalPrice.toFixed(2)}`,
                        badge: { color: 'bg-green-100 text-green-800', text: 'Purchase Fulfilled', emoji: '💰' }
                      });
                    }
                  });

                  // Promo redemptions
                  data.customers.filter(c => c.promoRedeemed && c.promoRedeemedAt).forEach(c => {
                    activities.push({
                      id: `promo-${c.id}`,
                      type: 'promo-redeemed',
                      timestamp: new Date(c.promoRedeemedAt!),
                      customer: { firstName: c.firstName, lastName: c.lastName },
                      details: 'Returning customer promo',
                      badge: { color: 'bg-pink-100 text-pink-800', text: 'Promo Redeemed', emoji: '🎁' }
                    });
                  });

                  // Sort by timestamp descending and take last 20
                  return activities
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .slice(0, 20)
                    .map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">
                              {activity.customer.firstName} {activity.customer.lastName}
                            </div>
                            <div className="text-sm text-gray-600">{activity.details}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {mounted ? formatRelativeTime(activity.timestamp) : activity.timestamp.toLocaleDateString()}
                            </div>
                          </div>
                          <div>
                            <span className={`${activity.badge.color} px-2 py-1 rounded text-xs font-medium whitespace-nowrap`}>
                              {activity.badge.emoji} {activity.badge.text}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-lg shadow">
            {(pendingIntents.length > 0 || readyIntents.length > 0) && (
              <div className="p-3 sm:p-4 border-b bg-purple-50/40">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold">Purchase Requests</h2>
                    <span className="text-xs px-2 py-1 rounded-full font-semibold bg-purple-100 text-purple-800">
                      {pendingIntents.length + readyIntents.length} Waiting
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-700">Pending: {pendingIntents.length} • Ready: {readyIntents.length}</div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {[...readyIntents, ...pendingIntents].slice(0,6).map(i => (
                    <div key={i.id} className="bg-white border rounded-lg p-2.5 sm:p-3 flex gap-2 sm:gap-3 relative">
                      {/* Timer Badge */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        {(() => {
                          const timeSince = getTimeSinceRequest(i.createdAt);
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${timeSince.color}`}>
                              ⏱️ {timeSince.timeText}
                            </span>
                          );
                        })()}
                      </div>
                      
                      {/* Product Image */}
                      {i.product.imageUrl && (
                        <img 
                          src={i.product.imageUrl} 
                          alt={i.product.name}
                          className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex flex-col justify-between flex-1 min-w-0 pr-12 sm:pr-16">
                        <div>
                          <div className="font-semibold text-xs sm:text-sm truncate">{i.customer.firstName} {i.customer.lastName}</div>
                          <div className="text-xs text-gray-600 truncate">{i.product.name}</div>
                          <div className="text-sm font-semibold text-purple-600 mt-0.5">${Number(i.finalPrice).toFixed(2)}</div>
                        </div>
                        <div className="mt-1">
                          {i.status === 'pending' && role === 'owner' && (
                            <button onClick={() => notifyReady(i.verifySlug)} className="w-full px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 active:bg-purple-800 whitespace-nowrap">Notify Ready</button>
                          )}
                          {i.status === 'ready' && (
                            <span className="inline-block text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">Customer Notified</span>
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
              {filteredCustomers.map((customer) => {
                const isExpanded = expandedCustomer === customer.id;
                const redeemMs = customer.redeemedAt ? (new Date(customer.redeemedAt).getTime() - new Date(customer.requestedAt).getTime()) : 0;
                const startForPurchase = (customer.redeemedAt || customer.requestedAt) as Date;
                const purchaseMs = customer.promoRedeemedAt ? (new Date(customer.promoRedeemedAt).getTime() - new Date(startForPurchase).getTime()) : 0;
                const last = new Date((customer.promoRedeemedAt || customer.redeemedAt || customer.requestedAt) as Date);
                const lastMs = Date.now() - last.getTime();
                
                return (
                <div key={customer.id} className="p-4">
                  <div 
                    onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
                        <div>
                          <div className="font-semibold">{customer.firstName} {customer.lastName}</div>
                          <div className="text-sm text-gray-600">{customer.phone}</div>
                        </div>
                      </div>
                      <div>
                        {(() => {
                          const stage = customer.currentStage;
                          if (stage === 'purchased' || stage === 'repeat') {
                            return (
                              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                                ✨ Purchased
                              </span>
                            );
                          } else if (stage === 'purchase_requested') {
                            return (
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                                � Purchase Requested
                              </span>
                            );
                          } else if (stage === 'undecided') {
                            return (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                                🤔 Undecided
                              </span>
                            );
                          } else if (stage === 'sampling' || customer.redeemed) {
                            return (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                ✅ Sampling
                              </span>
                            );
                          } else if (stage === 'opted_out') {
                            return (
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                                🚫 Opted Out
                              </span>
                            );
                          } else {
                            return (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                📝 Sample Requested
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  <div className="text-sm text-gray-600">{customer.sampleChoice}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {mounted ? formatRelativeTime(customer.requestedAt) : new Date(customer.requestedAt).toLocaleDateString()}
                  </div>
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
                      
                      // Handle purchased customers with 30-day retention
                      if (stage === 'purchased' || stage === 'repeat') {
                        const fulfilledPurchase = customer.purchaseIntents?.find(pi => pi.status === 'fulfilled');
                        const lastPurchase = fulfilledPurchase?.fulfilledAt 
                          ? new Date(fulfilledPurchase.fulfilledAt) 
                          : new Date(customer.promoRedeemedAt || customer.requestedAt);
                        const dueDate = new Date(lastPurchase.getTime() + (30 * 24 * 60 * 60 * 1000));
                        const now = new Date();
                        const diffMs = dueDate.getTime() - now.getTime();
                        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                        const daysInStage = formatDuration(Date.now() - new Date(customer.stageChangedAt).getTime());
                        
                        if (diffMs < 0) {
                          return <span>Follow-up: Overdue • Stage: {daysInStage}</span>;
                        } else {
                          return <span>Follow-up: {diffDays}d (retention) • Stage: {daysInStage}</span>;
                        }
                      }
                      
                      // Pre-purchase follow-up (always from sample request date)
                      // pending = waiting for 1st followup, sampling = waiting for 1st followup, undecided = waiting for 2nd followup
                      const followupIndex = (stage === 'pending' || stage === 'sampling') ? 0 : stage === 'undecided' ? 1 : -1;
                      const daysInStage = formatDuration(Date.now() - new Date(customer.stageChangedAt).getTime());
                      
                      if (followupIndex === -1) {
                        return <span>Stage: {daysInStage}</span>;
                      }
                      
                      const daysToAdd = data.store.followupDays[followupIndex] || 0;
                      const baseDate = new Date(customer.requestedAt); // Always use sample request date
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
                  
                  {/* Expanded Mobile Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Details</h4>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Member ID:</span>
                            <span className="font-mono">{customer.memberId}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Phone:</span>
                            <div className="flex items-center gap-2">
                              <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDirectMessageCustomer(customer);
                                }}
                                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                              >
                                💬
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sample:</span>
                            <span>{customer.sampleChoice}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Product Requested:</span>
                            <span>{customer.purchaseIntents && customer.purchaseIntents.length > 0 ? customer.purchaseIntents[0].product?.name || 'N/A' : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Status:</span>
                            <span className="font-semibold capitalize">{customer.currentStage?.replace('_', ' ') || 'pending'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Timeline</h4>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sample Requested:</span>
                            <span>{new Date(customer.requestedAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sample Redeemed:</span>
                            <span>{customer.redeemedAt ? new Date(customer.redeemedAt).toLocaleDateString() : '—'}</span>
                          </div>
                          {customer.purchaseIntents && customer.purchaseIntents.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Purchase Requested:</span>
                              <span>{new Date(customer.purchaseIntents[0].createdAt).toLocaleDateString()}</span>
                            </div>
                          )}
                          {customer.purchaseIntents && customer.purchaseIntents.some(pi => pi.status === 'fulfilled') && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Purchase Confirmed:</span>
                              <span>{customer.purchaseIntents.find(pi => pi.status === 'fulfilled')?.fulfilledAt ? new Date(customer.purchaseIntents.find(pi => pi.status === 'fulfilled')!.fulfilledAt!).toLocaleDateString() : '—'}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status Changed:</span>
                            <span>{new Date(customer.stageChangedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Performance</h4>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Redeem Time:</span>
                            <span>{customer.redeemed ? formatDuration(redeemMs) : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Purchase Time:</span>
                            <span>{customer.promoRedeemed ? formatDuration(purchaseMs) : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Spent:</span>
                            <span className="font-semibold text-green-600">${(customer.totalPurchases || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
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
                        Name {customerSortField === 'name' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
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
                      onClick={() => handleCustomerSort('status')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Status {customerSortField === 'status' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th
                      onClick={() => handleCustomerSort('totalPurchases')}
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        Total Spent {customerSortField === 'totalPurchases' && (<span>{customerSortDirection === 'asc' ? '↑' : '↓'}</span>)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Pending Sales
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
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedCustomers.map((customer) => {
                    const redeemMs = customer.redeemedAt ? (new Date(customer.redeemedAt).getTime() - new Date(customer.requestedAt).getTime()) : 0;
                    const startForPurchase = (customer.redeemedAt || customer.requestedAt) as Date;
                    const purchaseMs = customer.promoRedeemedAt ? (new Date(customer.promoRedeemedAt).getTime() - new Date(startForPurchase).getTime()) : 0;
                    const last = new Date((customer.promoRedeemedAt || customer.redeemedAt || customer.requestedAt) as Date);
                    const lastMs = Date.now() - last.getTime();
                    const isExpanded = expandedCustomer === customer.id;
                    return (
                    <React.Fragment key={customer.id}>
                    <tr 
                      onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                          {customer.firstName} {customer.lastName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{customer.phone}</td>
                      <td className="px-4 py-3">
                        {/* Status Badge based on currentStage */}
                        {(() => {
                          const stage = customer.currentStage;
                          
                          if (stage === 'purchased' || stage === 'repeat') {
                            return (
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>✨</span> Purchased
                              </span>
                            );
                          } else if (stage === 'ready_for_pickup') {
                            return (
                              <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>📦</span> Ready for Pickup
                              </span>
                            );
                          } else if (stage === 'purchase_requested') {
                            return (
                              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>🛒</span> Purchase Requested
                              </span>
                            );
                          } else if (stage === 'undecided') {
                            return (
                              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>🤔</span> Undecided
                              </span>
                            );
                          } else if (stage === 'sampling' || customer.redeemed) {
                            return (
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>✅</span> Sampling
                              </span>
                            );
                          } else if (stage === 'opted_out') {
                            return (
                              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>🚫</span> Opted Out
                              </span>
                            );
                          } else {
                            return (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                                <span>📝</span> Sample Requested
                              </span>
                            );
                          }
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-green-600">
                        ${(customer.totalPurchases || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                        {(() => {
                          const pendingAmount = customer.purchaseIntents
                            ?.filter(pi => pi.status === 'pending' || pi.status === 'ready')
                            .reduce((sum, pi) => sum + Number(pi.finalPrice), 0) || 0;
                          return pendingAmount > 0 ? `$${pendingAmount.toFixed(2)}` : '—';
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(lastMs)} ago</td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const stage = customer.currentStage;
                          // If they've purchased, use 30-day retention follow-up
                          if (stage === 'purchased' || stage === 'repeat' || customer.promoRedeemed) {
                            // Get the most recent fulfilled purchase date
                            const fulfilledPurchase = customer.purchaseIntents?.find(pi => pi.status === 'fulfilled');
                            const lastPurchase = fulfilledPurchase?.fulfilledAt 
                              ? new Date(fulfilledPurchase.fulfilledAt) 
                              : new Date(customer.promoRedeemedAt || customer.requestedAt);
                            const dueDate = new Date(lastPurchase.getTime() + (30 * 24 * 60 * 60 * 1000));
                            const now = new Date();
                            const diffMs = dueDate.getTime() - now.getTime();
                            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                            
                            if (diffMs < 0) {
                              return <span className="text-red-600 font-medium">Overdue</span>;
                            } else {
                              return <span className="text-gray-600">{diffDays}d (retention)</span>;
                            }
                          }
                          
                          // Pre-purchase follow-up logic (always from sample request date)
                          // pending = waiting for 1st followup, sampling = waiting for 1st followup, undecided = waiting for 2nd followup
                          const followupIndex = (stage === 'pending' || stage === 'sampling') ? 0 : stage === 'undecided' ? 1 : -1;
                          if (followupIndex === -1) return <span className="text-gray-400">—</span>;
                          
                          const daysToAdd = data.store.followupDays[followupIndex] || 0;
                          const baseDate = new Date(customer.requestedAt); // Always use sample request date
                          const dueDate = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                          const now = new Date();
                          const diffMs = dueDate.getTime() - now.getTime();
                          const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
                          
                          if (diffMs < 0) {
                            return <span className="text-red-600 font-medium">Overdue</span>;
                          } else if (diffDays === 0) {
                            return <span className="text-orange-600 font-medium">Today</span>;
                          } else if (diffDays === 1) {
                            return <span className="text-orange-500 font-medium">Tomorrow</span>;
                          } else if (diffDays <= 3) {
                            return <span className="text-yellow-600 font-medium">{diffDays}d</span>;
                          } else {
                            return <span className="text-gray-600">{diffDays}d</span>;
                          }
                        })()}
                      </td>
                    </tr>
                    {/* Expanded Drawer */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50 border-t">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Customer Details</h4>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Member ID:</span>
                                  <span className="font-mono text-gray-900">{customer.memberId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Sample Choice:</span>
                                  <span className="text-gray-900">{customer.sampleChoice}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Phone:</span>
                                  <div className="flex items-center gap-2">
                                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDirectMessageCustomer(customer);
                                      }}
                                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                                    >
                                      💬 Send Message
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Timeline</h4>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Requested:</span>
                                  <span className="text-gray-900">{new Date(customer.requestedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Redeemed:</span>
                                  <span className="text-gray-900">
                                    {customer.redeemedAt ? new Date(customer.redeemedAt).toLocaleDateString() : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Purchased:</span>
                                  <span className="text-gray-900">
                                    {customer.promoRedeemedAt ? new Date(customer.promoRedeemedAt).toLocaleDateString() : '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Performance</h4>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Redeem Time:</span>
                                  <span className="text-gray-900">
                                    {customer.redeemed ? formatDuration(redeemMs) : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Purchase Time:</span>
                                  <span className="text-gray-900">
                                    {customer.promoRedeemed ? formatDuration(purchaseMs) : '—'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Spent:</span>
                                  <span className="font-semibold text-green-600">
                                    ${(customer.totalPurchases || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Current Stage</h4>
                              <div className="space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Stage:</span>
                                  <span className="text-gray-900 capitalize">{customer.currentStage}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Days in Stage:</span>
                                  <span className="text-gray-900">
                                    {formatDuration(Date.now() - new Date(customer.stageChangedAt).getTime())}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Last Activity:</span>
                                  <span className="text-gray-900">{formatDuration(lastMs)} ago</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Place Wholesale Order Card */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Place Wholesale Order</h2>
                  <p className="text-purple-100 mb-3">
                    Order wholesale products for your store inventory
                  </p>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3 inline-flex">
                    <span className="text-3xl">💰</span>
                    <div>
                      <p className="text-xs text-purple-100 uppercase tracking-wide">Available Store Credit</p>
                      <p className="text-2xl font-bold">${((data.store as any).storeCredit || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowPurchaseRequest(true)}
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  + Place Order
                </button>
              </div>
            </div>

            {/* Available Samples Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Available Samples</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Free 4ct sample options customers can choose from
                  </p>
                </div>
                <button
                  onClick={() => setEditingSamples(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                >
                  Edit Samples
                </button>
              </div>

              {loadingProducts ? (
                <div className="text-center py-8 text-gray-500">Loading samples...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    // Map sample values to SKUs
                    const sampleSkuMap: Record<string, string> = {
                      'slumber-berry': 'VD-SB-4',
                      'bliss-berry': 'VD-BB-4',
                      'berry-chill': 'VD-CC-4'
                    };
                    
                    return SAMPLE_OPTIONS.map((option) => {
                      const isAvailable = (data.store.availableSamples || []).includes(option.value);
                      const sku = sampleSkuMap[option.value];
                      const product = products.find(p => p.sku === sku);
                      
                      if (!product) return null;
                      
                      return (
                        <div
                          key={option.value}
                          className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                            isAvailable ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Product Image */}
                          <div className="h-40 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center p-4">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <div className="text-4xl">🍬</div>
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
                            <div className="text-sm font-semibold text-purple-600 mb-2">
                              Free Sample (Retail: ${parseFloat(product.price).toFixed(2)})
                            </div>
                            
                            {/* Inventory Display with Controls */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">In Stock:</span>
                                <span className={`text-sm font-bold ${
                                  product.inventoryQuantity > 10 
                                    ? 'text-green-600' 
                                    : product.inventoryQuantity > 0 
                                    ? 'text-yellow-600' 
                                    : 'text-red-600'
                                }`}>
                                  {product.inventoryQuantity || 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateInventory(product.sku, Math.max(0, (product.inventoryQuantity || 0) - 1))}
                                  className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold text-sm"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={product.inventoryQuantity || 0}
                                  onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                                  className="flex-1 text-center bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm"
                                />
                                <button
                                  onClick={() => updateInventory(product.sku, (product.inventoryQuantity || 0) + 1)}
                                  className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold text-sm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            <button
                              onClick={async () => {
                                const currentSamples = data.store.availableSamples || [];
                                const newSamples = isAvailable
                                  ? currentSamples.filter((s: string) => s !== option.value)
                                  : [...currentSamples, option.value];
                                
                                try {
                                  const res = await fetch('/api/store/settings', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ availableSamples: newSamples })
                                  });
                                  
                                  if (res.ok) {
                                    setData({
                                      ...data,
                                      store: {
                                        ...data.store,
                                        availableSamples: newSamples
                                      }
                                    });
                                  }
                                } catch (err) {
                                  console.error('Failed to update samples:', err);
                                }
                              }}
                              className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                                isAvailable
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {isAvailable ? '✓ Offering' : '+ Offer This Product'}
                            </button>
                          </div>
                        </div>
                      );
                    }).filter(Boolean);
                  })()}
                </div>
              )}
            </div>

            {/* Full-Size Products Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold">Full-Size Products</h2>
                <p className="text-sm text-gray-600 mt-1">
                  These are the full-size products customers can purchase
                </p>
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
                  // Filter out wholesale boxes and 4ct samples (they're in the samples section)
                  const filtered = products.filter((product: any) => 
                    product.productType !== 'wholesale-box' && 
                    !product.sku.endsWith('-4') // Exclude 4ct products (samples)
                  );
                  console.log('🔍 [Products Tab] Total products:', products.length);
                  console.log('🔍 [Products Tab] Filtered products (non-wholesale, non-4ct):', filtered.length);
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
                        <div className="text-lg font-bold text-purple-600 mb-2">
                          ${parseFloat(product.price).toFixed(2)}
                        </div>
                        
                        {/* Inventory Display with Controls */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700">In Stock:</span>
                            <span className={`text-sm font-bold ${
                              product.inventoryQuantity > 10 
                                ? 'text-green-600' 
                                : product.inventoryQuantity > 0 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                            }`}>
                              {product.inventoryQuantity || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateInventory(product.sku, Math.max(0, (product.inventoryQuantity || 0) - 1))}
                              className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold text-sm"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={product.inventoryQuantity || 0}
                              onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                              className="flex-1 text-center bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <button
                              onClick={() => updateInventory(product.sku, (product.inventoryQuantity || 0) + 1)}
                              className="flex-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-bold text-sm"
                            >
                              +
                            </button>
                          </div>
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
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
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
                          <th 
                            className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100"
                            onClick={() => handleStaffSort('type')}
                          >
                            Type {staffSortBy === 'type' && (staffSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100"
                            onClick={() => handleStaffSort('samples')}
                          >
                            Samples {staffSortBy === 'samples' && (staffSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100"
                            onClick={() => handleStaffSort('sales')}
                          >
                            Sales {staffSortBy === 'sales' && (staffSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-gray-100"
                            onClick={() => handleStaffSort('totalSales')}
                          >
                            Total $ {staffSortBy === 'totalSales' && (staffSortOrder === 'asc' ? '↑' : '↓')}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">On Call</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getSortedStaff().map((member, index) => {
                          const isExpanded = expandedStaffId === member.id;
                          return (
                            <React.Fragment key={member.id}>
                              <tr className={`${index < 3 ? 'bg-yellow-50/30' : ''} ${isExpanded ? 'border-b-0' : ''}`}>
                                <td className="px-4 py-3 text-lg">
                                  {getMedal(index)} {index + 1}
                                </td>
                                <td 
                                  className="px-4 py-3 cursor-pointer hover:bg-gray-50"
                                  onClick={() => setExpandedStaffId(isExpanded ? null : member.id)}
                                >
                                  <div className="font-medium flex items-center gap-2">
                                    <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
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
                                <td className="px-4 py-3 text-sm font-semibold text-green-600">${(member.totalSales || 0).toFixed(2)}</td>
                                <td className="px-4 py-3 text-xs">
                                  <div>{member.onCallDays.join(', ')}</div>
                                  <div className="text-gray-500">{member.onCallHoursStart} - {member.onCallHoursStop}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setExpandedStaffId(isExpanded ? null : member.id)}
                                    className="text-gray-600 hover:text-gray-900 text-sm"
                                  >
                                    {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className={index < 3 ? 'bg-yellow-50/30' : ''}>
                                  <td colSpan={8} className="px-4 py-4 bg-gray-50">
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Contact Information</h4>
                                          <div className="text-sm space-y-1">
                                            <div><span className="text-gray-600">Email:</span> {member.email || 'N/A'}</div>
                                            <div><span className="text-gray-600">Phone:</span> {member.phone}</div>
                                            <div>
                                              <span className="text-gray-600">PIN:</span> 
                                              <span className="font-mono ml-1">{member.staffPin}</span>
                                              <button
                                                onClick={() => navigator.clipboard.writeText(member.staffPin)}
                                                className="ml-2 text-purple-600 hover:text-purple-700 text-xs"
                                              >
                                                📋 Copy
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Schedule</h4>
                                          <div className="text-sm space-y-1">
                                            <div><span className="text-gray-600">On-call Days:</span> {member.onCallDays.join(', ')}</div>
                                            <div><span className="text-gray-600">Hours:</span> {member.onCallHoursStart} - {member.onCallHoursStop}</div>
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-2">Performance Metrics</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-white rounded p-3 border">
                                            <div className="text-xs text-gray-600">Samples Redeemed</div>
                                            <div className="text-lg font-semibold">{member.samplesRedeemed}</div>
                                          </div>
                                          <div className="bg-white rounded p-3 border">
                                            <div className="text-xs text-gray-600">Sales Generated</div>
                                            <div className="text-lg font-semibold text-green-600">{member.salesGenerated}</div>
                                          </div>
                                          <div className="bg-white rounded p-3 border">
                                            <div className="text-xs text-gray-600">Total Sales $</div>
                                            <div className="text-lg font-semibold text-green-600">${(member.totalSales || 0).toFixed(2)}</div>
                                          </div>
                                        </div>
                                      </div>
                                      {member.notes && (
                                        <div>
                                          <h4 className="font-semibold text-sm mb-2">Notes</h4>
                                          <div className="text-sm text-gray-700 bg-white rounded p-3 border">{member.notes}</div>
                                        </div>
                                      )}
                                      <div className="flex gap-2 pt-2 border-t">
                                        {!member.verified && (
                                          <button
                                            onClick={() => resendVerification(member.staffId)}
                                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                          >
                                            📧 Resend Verification
                                          </button>
                                        )}
                                        <button
                                          onClick={() => openEditStaff(member)}
                                          className="px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                                        >
                                          ✏️ Edit Staff
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDeletingStaff(member);
                                            setShowDeleteStaffConfirm(true);
                                          }}
                                          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                          🗑️ Delete Staff
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {getSortedStaff().map((member, index) => {
                      const isExpanded = expandedStaffId === member.id;
                      return (
                        <div key={member.id} className={`p-4 rounded-lg border ${index < 3 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
                          <div 
                            className="cursor-pointer"
                            onClick={() => setExpandedStaffId(isExpanded ? null : member.id)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">{isExpanded ? '▼' : '▶'}</span>
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
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <div className="text-gray-600">Samples</div>
                                <div className="font-semibold text-lg">{member.samplesRedeemed}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Sales</div>
                                <div className="font-semibold text-lg text-green-600">{member.salesGenerated}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">Total $</div>
                                <div className="font-semibold text-lg text-green-600">${(member.totalSales || 0).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Contact Information</h4>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-gray-600">Email:</span> {member.email || 'N/A'}</div>
                                  <div><span className="text-gray-600">Phone:</span> {member.phone}</div>
                                  <div>
                                    <span className="text-gray-600">PIN:</span> 
                                    <span className="font-mono ml-1">{member.staffPin}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(member.staffPin);
                                      }}
                                      className="ml-2 text-purple-600 hover:text-purple-700 text-xs"
                                    >
                                      📋 Copy
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm mb-2">Schedule</h4>
                                <div className="text-sm space-y-1">
                                  <div><span className="text-gray-600">On-call Days:</span> {member.onCallDays.join(', ')}</div>
                                  <div><span className="text-gray-600">Hours:</span> {member.onCallHoursStart} - {member.onCallHoursStop}</div>
                                </div>
                              </div>
                              {member.notes && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Notes</h4>
                                  <div className="text-sm text-gray-700 bg-white rounded p-2 border">{member.notes}</div>
                                </div>
                              )}
                              <div className="flex gap-2 pt-2">
                                {!member.verified && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      resendVerification(member.staffId);
                                    }}
                                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    📧 Resend
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditStaff(member);
                                  }}
                                  className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingStaff(member);
                                    setShowDeleteStaffConfirm(true);
                                  }}
                                  className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                
                {/* Sampling Follow-up Days */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <label className="text-sm text-gray-600">Sampling Follow-Up Schedule</label>
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
                
                {/* Post-Purchase Follow-up */}
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <label className="text-sm text-gray-600">After Purchase Follow-Up</label>
                    <p className="font-medium">Day {(data.store.postPurchaseFollowupDays || [45, 90]).join(', ')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setPostPurchaseFollowupForm(data.store.postPurchaseFollowupDays || [45, 90]);
                      setEditingPostPurchaseFollowups(true);
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-900/95 to-purple-800/90 backdrop-blur-lg border-t border-purple-400/30 shadow-2xl safe-area-inset-bottom">
        <div className={`grid ${role === 'owner' ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 transition-colors ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-purple-100 hover:text-white'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs font-medium">{role === 'staff' ? 'Stats' : 'Home'}</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 transition-colors ${
              activeTab === 'customers' ? 'bg-purple-600 text-white' : 'text-purple-100 hover:text-white'
            }`}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs font-medium">Customers</span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center justify-center h-14 space-y-1 transition-colors ${
              activeTab === 'products' ? 'bg-purple-600 text-white' : 'text-purple-100 hover:text-white'
            }`}
          >
            <span className="text-xl">🛍️</span>
            <span className="text-xs font-medium">Products</span>
          </button>
          {role === 'owner' && (
            <>
              <button
                onClick={() => setActiveTab('staff')}
                className={`flex flex-col items-center justify-center h-14 space-y-1 transition-colors ${
                  activeTab === 'staff' ? 'bg-purple-600 text-white' : 'text-purple-100 hover:text-white'
                }`}
              >
                <span className="text-xl">🏆</span>
                <span className="text-xs font-medium">Staff</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex flex-col items-center justify-center h-14 space-y-1 transition-colors ${
                  activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-purple-100 hover:text-white'
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold">Place Wholesale Order</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Select boxes and quantities for your wholesale order
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPurchaseRequest(false);
                  setBoxQuantities({});
                  setPurchaseRequestNotes('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Store Credit Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">💰</span>
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Available Store Credit</p>
                    <p className="text-2xl font-bold text-purple-600">${((data.store as any).storeCredit || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-600 text-right">
                  Credit will be applied<br />to your order
                </div>
              </div>
            </div>

            {loadingProducts ? (
              <div className="text-center py-8 text-gray-500">Loading products...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {products
                    .filter((p: any) => p.productType === 'wholesale-box')
                    .sort((a: any, b: any) => {
                      // Sort by name (which includes product line and count)
                      return a.name.localeCompare(b.name);
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
                          className={`flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all ${
                            qty > 0 ? 'border-green-500 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          {/* Mobile: Image + Title + Quantity in row */}
                          <div className="flex items-start gap-3 sm:contents">
                            {product.imageUrl && (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm sm:text-base">{product.name}</div>
                              {product.description && (
                                <div className="text-xs text-gray-600 mb-2 hidden sm:block">{product.description}</div>
                              )}
                              <div className="text-xs sm:text-sm space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-gray-600">Box ({unitsPerBox} units):</span>
                                  <span className="font-bold text-green-600">${boxPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-gray-600">Per Unit:</span>
                                  <span className="font-semibold">${wholesalePrice.toFixed(2)}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="font-semibold">${retailPrice.toFixed(2)}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{margin}% margin</span>
                                </div>
                              </div>
                            </div>
                            {/* Mobile quantity controls - inline with title */}
                            <div className="flex items-center gap-2 sm:hidden">
                              <button
                                onClick={() => {
                                  const newQty = Math.max(0, qty - 1);
                                  setBoxQuantities({ ...boxQuantities, [product.sku]: newQty });
                                }}
                                disabled={qty === 0}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xl"
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
                                className="w-14 text-center border-2 border-gray-300 rounded-lg px-2 py-1.5 font-bold text-base"
                              />
                              <button
                                onClick={() => {
                                  const newQty = Math.min(999, qty + 1);
                                  setBoxQuantities({ ...boxQuantities, [product.sku]: newQty });
                                }}
                                className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 font-bold text-xl"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {/* Desktop quantity controls - on the right */}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                const newQty = Math.max(0, qty - 1);
                                setBoxQuantities({ ...boxQuantities, [product.sku]: newQty });
                              }}
                              disabled={qty === 0}
                              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-xl"
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
                              className="w-16 text-center border-2 border-gray-300 rounded-lg px-2 py-2 font-bold"
                            />
                            <button
                              onClick={() => {
                                const newQty = Math.min(999, qty + 1);
                                setBoxQuantities({ ...boxQuantities, [product.sku]: newQty });
                              }}
                              className="w-10 h-10 flex items-center justify-center rounded-lg border-2 border-gray-300 hover:bg-gray-100 font-bold text-xl"
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
                  
                  const storeCredit = Number((data.store as any)?.storeCredit || 0);
                  const creditApplied = Math.min(storeCredit, totalCost);
                  const finalTotal = Math.max(0, totalCost - creditApplied);
                  
                  // Debug logging
                  console.log('💰 Order Summary Debug:', {
                    storeCredit,
                    totalCost,
                    creditApplied,
                    finalTotal
                  });
                  
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      {storeCredit > 0 && (
                        <div className="bg-green-100 border border-green-300 rounded-md p-2 mb-3 text-sm">
                          <span className="font-semibold text-green-800">💰 Available Store Credit: ${storeCredit.toFixed(2)}</span>
                        </div>
                      )}
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
                            <span>${totalCost.toFixed(2)}</span>
                          </div>
                          {creditApplied > 0 && (
                            <div className="flex justify-between text-green-600 font-semibold">
                              <span>Store Credit Applied</span>
                              <span>-${creditApplied.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-lg text-purple-600 mt-2 pt-2 border-t border-blue-200">
                            <span>Total</span>
                            <span>${finalTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-600 mt-2">
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

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowPurchaseRequest(false);
                      setBoxQuantities({});
                      setPurchaseRequestNotes('');
                    }}
                    className="w-full sm:flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  
                  {/* Dual Path: Shopify Draft Order vs Manual Request */}
                  {data.organization?.shopifyStoreName && data.organization?.shopifyAccessToken ? (
                    // SHOPIFY PATH: Create draft order via Shopify API
                    <button
                      onClick={async () => {
                        const selectedBoxes = Object.entries(boxQuantities).filter(([_, qty]) => qty > 0);
                        if (selectedBoxes.length === 0) {
                          alert('Please select at least one product');
                          return;
                        }

                        setSendingPurchaseRequest(true);
                        try {
                          const res = await fetch('/api/stores/create-draft-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              storeId: data.store.storeId,
                              storeName: data.store.storeName,
                              boxQuantities,
                              notes: purchaseRequestNotes,
                              storeCredit: (data.store as any).storeCredit || 0,
                              contactName: data.store.ownerName || data.store.adminName,
                              contactEmail: data.store.ownerEmail || data.store.adminEmail,
                              contactPhone: data.store.ownerPhone || data.store.adminPhone,
                            })
                          });

                          if (res.ok) {
                            const result = await res.json();
                            
                            const org = data.organization;
                            const orgName = (org as any)?.name || 'us';
                            
                            const message = `Thanks! Your PO is on its way! 

Your purchasing manager will receive a payable invoice link via email within the next few minutes. Please be sure to check your spam folder if not found in your inbox within 5+ mins.

Follow the prompts on the Payable Invoice Link and we'll get your order out to you ASAP! Shipments typically take 5-7 business days (although many times arrive much sooner).

Thanks for choosing ${orgName}!`;
                            
                            alert(`✅ ${message}`);
                            setShowPurchaseRequest(false);
                            setBoxQuantities({});
                            setPurchaseRequestNotes('');
                          } else {
                            const error = await res.json();
                            throw new Error(error.error || 'Failed to create draft order');
                          }
                        } catch (err: any) {
                          console.error('Failed to create draft order:', err);
                          alert(`❌ Failed to create draft order: ${err.message}`);
                        } finally {
                          setSendingPurchaseRequest(false);
                        }
                      }}
                      disabled={sendingPurchaseRequest || Object.values(boxQuantities).every(q => q === 0)}
                      className="w-full sm:flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base flex items-center justify-center gap-2"
                    >
                      {sendingPurchaseRequest ? 'Submitting PO...' : '📋 Submit a PO'}
                    </button>
                  ) : (
                    // MANUAL PATH: Send email request to organization
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
                              storeCredit: (data.store as any).storeCredit || 0,
                              contactName: data.store.ownerName || data.store.adminName,
                              contactEmail: data.store.ownerEmail || data.store.adminEmail,
                              contactPhone: data.store.ownerPhone || data.store.adminPhone,
                            })
                          });

                          if (res.ok) {
                            const org = data.organization;
                            const orgName = (org as any)?.name || 'us';
                            
                            const message = `Thanks! Your PO has been submitted!

Your purchasing manager will receive a payable invoice link via email from your sales rep (typically within 24hrs, may take up to 48hrs at longest). 

Please be sure to check your spam folder if not found in your inbox.

Follow the prompts on the Payable Invoice Link and we'll get your order out to you ASAP! Shipments typically take 5-7 business days (although many times arrive much sooner).

Thanks for choosing ${orgName}!`;
                            
                            alert(`✅ ${message}`);
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
                      className="w-full sm:flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base"
                    >
                      {sendingPurchaseRequest ? 'Submitting PO...' : '� Submit a PO'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit 1st Purchase Promo Modal */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit 1st Purchase Promo</h3>
            
            <form onSubmit={savePromo}>
              <label className="block text-sm font-medium mb-2">Discount Percentage</label>
              <select
                value={promoForm}
                onChange={(e) => setPromoForm(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-4 focus:ring-2 focus:ring-purple-500"
              >
                <option value="0">No Promo</option>
                <option value="5">5% Off In-Store Purchase</option>
                <option value="10">10% Off In-Store Purchase</option>
                <option value="15">15% Off In-Store Purchase</option>
                <option value="20">20% Off In-Store Purchase</option>
                <option value="25">25% Off In-Store Purchase</option>
                <option value="30">30% Off In-Store Purchase</option>
              </select>
              
              <p className="text-sm text-gray-600 mb-4">
                This discount will be offered to first-time customers and appear in follow-up messages and promo redemption pages.
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

      {/* Edit Returning Customer Promo Modal */}
      {editingReturningPromo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Returning Customer Promo</h3>
            
            <form onSubmit={saveReturningPromo}>
              <label className="block text-sm font-medium mb-2">Discount Percentage</label>
              <select
                value={returningPromoForm}
                onChange={(e) => setReturningPromoForm(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-4 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="0">No Promo</option>
                <option value="5">5% Off In-Store Purchase</option>
                <option value="10">10% Off In-Store Purchase</option>
                <option value="15">15% Off In-Store Purchase</option>
                <option value="20">20% Off In-Store Purchase</option>
                <option value="25">25% Off In-Store Purchase</option>
                <option value="30">30% Off In-Store Purchase</option>
              </select>
              
              <p className="text-sm text-gray-600 mb-4">
                This discount will be offered to customers who have already made a purchase at your store.
              </p>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded hover:bg-emerald-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingReturningPromo(false)}
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

      {/* Edit Sampling Follow-ups Modal */}
      {editingFollowups && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit Sampling Follow-Up Schedule</h3>
            
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

      {/* Edit Post-Purchase Follow-ups Modal */}
      {editingPostPurchaseFollowups && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Edit After Purchase Follow-Up</h3>
            
            <form onSubmit={savePostPurchaseFollowups}>
              <p className="text-sm text-gray-600 mb-4">
                Schedule how many days after purchase to follow-up. Select up to 2 days:
              </p>
              
              <div className="space-y-2 mb-4">
                {[15, 30, 45, 60, 90].map(day => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={postPurchaseFollowupForm.includes(day)}
                      onChange={() => {
                        if (postPurchaseFollowupForm.includes(day)) {
                          setPostPurchaseFollowupForm(postPurchaseFollowupForm.filter(d => d !== day));
                        } else {
                          if (postPurchaseFollowupForm.length < 2) {
                            setPostPurchaseFollowupForm([...postPurchaseFollowupForm, day].sort((a, b) => a - b));
                          }
                        }
                      }}
                      disabled={!postPurchaseFollowupForm.includes(day) && postPurchaseFollowupForm.length >= 2}
                    />
                    {day} Days
                  </label>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mb-4">
                Select 1-2 days for retention follow-up messages.
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
                  onClick={() => setEditingPostPurchaseFollowups(false)}
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
                  <option value="undecided">Undecided Customers ({getAudienceCount('undecided')})</option>
                  <option value="sampling">Sampling Customers ({getAudienceCount('sampling')})</option>
                  <option value="purchased">Purchased Customers ({getAudienceCount('purchased')})</option>
                  <option value="ready_for_pickup">Ready For Pickup Customers ({getAudienceCount('ready_for_pickup')})</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message (SMS):</label>
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

      {/* Direct Message Modal */}
      {directMessageCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">💬 Send Message to {directMessageCustomer.firstName}</h3>
            
            <form onSubmit={sendDirectMessage}>
              <div className="mb-4 bg-gray-50 p-3 rounded border">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-semibold">{directMessageCustomer.firstName} {directMessageCustomer.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-mono text-sm">{directMessageCustomer.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="text-sm capitalize">{directMessageCustomer.currentStage?.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message (SMS):</label>
                <textarea
                  value={directMessageForm.message}
                  onChange={(e) => setDirectMessageForm({ ...directMessageForm, message: e.target.value })}
                  rows={4}
                  maxLength={160}
                  placeholder="Hi! Just wanted to follow up about your sample..."
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  {directMessageForm.message.length}/160 characters
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm text-blue-800">
                  💡 This message will be sent directly to this customer only.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sendingDirectMessage || !directMessageForm.message.trim()}
                  className="flex-1 bg-purple-600 text-white py-3 rounded hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                >
                  {sendingDirectMessage ? 'Sending...' : 'Send Message'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectMessageCustomer(null);
                    setDirectMessageForm({ message: '' });
                  }}
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
                      {editingStaff && editingStaff.staffPin ? (
                        <>Current PIN: <span className="font-mono font-bold text-purple-600">{editingStaff.staffPin}</span> (last 4 of phone)</>
                      ) : (
                        'Their PIN will be the last 4 digits of this number'
                      )}
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
