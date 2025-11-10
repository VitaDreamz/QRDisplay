'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { SubscriptionTier } from '@/lib/subscription-tiers';

interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  province?: string;
  address?: string;
  zip?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  productType: string;
  category: string;
  unitsPerBox: number;
  wholesalePrice: string;
  retailPrice: string;
  imageUrl: string;
}

interface InventoryItem {
  productSku: string;
  quantity: number;
}

export default function QuickAddStorePage() {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [shopifyCustomers, setShopifyCustomers] = useState<ShopifyCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ShopifyCustomer | null>(null);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const [businessName, setBusinessName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSameAsOwner, setAdminSameAsOwner] = useState(false);
  
  const [purchasingName, setPurchasingName] = useState('');
  const [purchasingPhone, setPurchasingPhone] = useState('');
  const [purchasingEmail, setPurchasingEmail] = useState('');
  const [purchasingSameAsOwner, setPurchasingSameAsOwner] = useState(false);
  
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free'); // Default to free tier
  
  // Products and Inventory
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryItem[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdStoreId, setCreatedStoreId] = useState('');

  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.length < 2) {
      setShopifyCustomers([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/shopify/search-customers?query=${encodeURIComponent(searchQuery)}&orgId=ORG-VITADREAMZ`
        );
        
        if (!response.ok) {
          setShopifyCustomers([]);
          setShowResults(false);
          return;
        }

        const data = await response.json();
        setShopifyCustomers(data.customers || []);
        setShowResults((data.customers || []).length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setShopifyCustomers([]);
        setShowResults(false);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  function handleSelectCustomer(customer: ShopifyCustomer) {
    setSelectedCustomer(customer);
    setShowResults(false);
    setSearchQuery('');
    
    setBusinessName(customer.firstName);
    setStreetAddress(customer.address || '');
    setCity(customer.city || '');
    setState(customer.province || '');
    setZipCode(customer.zip || '');
    
    setOwnerEmail(customer.email || '');
    setOwnerPhone(customer.phone || '');
  }

  useEffect(() => {
    if (adminSameAsOwner) {
      setAdminName(ownerName);
      setAdminPhone(ownerPhone);
      setAdminEmail(ownerEmail);
    }
  }, [adminSameAsOwner, ownerName, ownerPhone, ownerEmail]);

  useEffect(() => {
    if (purchasingSameAsOwner) {
      setPurchasingName(ownerName);
      setPurchasingPhone(ownerPhone);
      setPurchasingEmail(ownerEmail);
    }
  }, [purchasingSameAsOwner, ownerName, ownerPhone, ownerEmail]);

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const response = await fetch('/api/admin/products?orgId=ORG-VITADREAMZ');
        if (!response.ok) throw new Error('Failed to load products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Helper function to extract size number from product name/SKU
  const extractSize = (product: Product): number => {
    const match = product.name?.match(/(\d+)ct/i) || product.sku?.match(/(\d+)ct/i);
    return match ? parseInt(match[1]) : 0;
  };

  // Helper function to extract base product name (without size)
  const extractBaseName = (product: Product): string => {
    // Remove size like "30ct - " or just get the product name
    return product.name?.replace(/^\d+ct\s*-\s*/i, '') || product.name || '';
  };

  // Helper function for inventory
  function updateInventoryQuantity(sku: string, quantity: number) {
    if (quantity <= 0) {
      setInventoryEntries(prev => prev.filter(item => item.productSku !== sku));
    } else {
      const existing = inventoryEntries.find(item => item.productSku === sku);
      if (existing) {
        setInventoryEntries(prev => 
          prev.map(item => item.productSku === sku ? { ...item, quantity } : item)
        );
      } else {
        setInventoryEntries(prev => [...prev, { productSku: sku, quantity }]);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedCustomer) {
      setSubmitError('Please select a Shopify customer');
      return;
    }

    if (!ownerName || !ownerEmail) {
      setSubmitError('Owner name and email are required');
      return;
    }

    if (!adminName || !adminEmail) {
      setSubmitError('Program admin name and email are required');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const payload = {
      shopifyCustomerId: selectedCustomer.id,
      businessName,
      streetAddress,
      city,
      state,
      zipCode,
      ownerName,
      ownerPhone,
      ownerEmail,
      adminName,
      adminPhone,
      adminEmail,
      purchasingName,
      purchasingPhone,
      purchasingEmail,
      subscriptionTier,
      inventoryEntries,
      orgId: 'ORG-VITADREAMZ'
    };

    console.log('📦 [Quick Add] Submitting with inventory entries:', inventoryEntries);
    console.log('📦 [Quick Add] Full payload:', payload);

    try {
      const response = await fetch('/api/admin/stores/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create store');
      }

      const data = await response.json();
      setCreatedStoreId(data.storeId);
      setSuccess(true);

      setTimeout(() => {
        router.push(`/admin/brands/ORG-VITADREAMZ`);
      }, 2000);

    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-green-500/20 border-2 border-green-400/50 backdrop-blur-sm rounded-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-2">Store Created!</h2>
          <p className="text-green-100">
            <strong className="text-white">{createdStoreId}</strong> has been added successfully.
          </p>
          <p className="text-sm text-green-200 mt-3">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 mb-2">
            Add New Store
          </h1>
          <p className="text-purple-200">Complete store onboarding</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!selectedCustomer ? (
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">🔍 Find Wholesale Customer</h2>
              <p className="text-sm text-purple-200 mb-4">Search by business name, email, or phone</p>
              
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search wholesale customers..."
                  className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 pr-10 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                  </div>
                )}

                {showResults && shopifyCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[400px] overflow-y-auto">
                    {shopifyCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{customer.firstName}</div>
                        <div className="text-sm text-gray-600 mt-0.5">
                          {customer.city && customer.province ? `${customer.city}, ${customer.province}` : 'Location not specified'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {showResults && shopifyCustomers.length === 0 && searchQuery.length >= 2 && !searching && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                    <div className="text-gray-600 text-sm text-center">
                      No wholesale customers found for "{searchQuery}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-green-500/20 border-2 border-green-400/50 backdrop-blur-sm rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-green-200 mb-1">✓ Selected Wholesale Customer</div>
                    <div className="text-2xl font-bold text-white">{selectedCustomer.firstName}</div>
                    <div className="text-sm text-green-100 mt-1">
                      {selectedCustomer.city && selectedCustomer.province 
                        ? `${selectedCustomer.city}, ${selectedCustomer.province}` 
                        : 'Location to be confirmed'}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedCustomer(null)} 
                    className="text-sm text-blue-300 hover:text-blue-200 underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">📋 Business Information</h2>
                <p className="text-sm text-purple-200 mb-4">Pre-filled from Shopify (editable if needed)</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-1">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-purple-200 mb-1">State</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">� Subscription Tier</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Select Tier</label>
                    <select
                      value={subscriptionTier}
                      onChange={(e) => setSubscriptionTier(e.target.value as SubscriptionTier)}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white focus:border-purple-400 focus:outline-none"
                    >
                      <option value="test" className="bg-gray-800">Test Tier - $0/mo (50% Discount Match) - For Early Adopters</option>
                      <option value="free" className="bg-gray-800">Free Tier - $0/mo (10% Discount Match)</option>
                      <option value="basic" className="bg-gray-800">Basic Tier - $150/mo (25% Discount Match)</option>
                      <option value="dreamer" className="bg-gray-800">Dreamer Tier - $249/mo (50% Discount Match)</option>
                      <option value="mega" className="bg-gray-800">Mega Tier - $499/mo (100% Discount Match)</option>
                    </select>
                    <p className="text-xs text-purple-300 mt-2">
                      {subscriptionTier === 'test' && '🎁 Test tier: Same benefits as Dreamer but free for early adopters'}
                      {subscriptionTier === 'free' && 'Limited features, 10% discount match on customer purchases'}
                      {subscriptionTier === 'basic' && '25% discount match, good for small stores'}
                      {subscriptionTier === 'dreamer' && '50% discount match, perfect for growing stores'}
                      {subscriptionTier === 'mega' && '100% discount match, best for high-volume stores'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">�👤 Owner Contact</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Name *</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={ownerPhone}
                      onChange={(e) => setOwnerPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Email *</label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@store.com"
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">📨 Program Administrator</h2>
                    <p className="text-xs text-purple-200 mt-1">Receives all notifications and updates</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-purple-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminSameAsOwner}
                      onChange={(e) => setAdminSameAsOwner(e.target.checked)}
                      className="rounded"
                    />
                    Same as owner
                  </label>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Name *</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      disabled={adminSameAsOwner}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      disabled={adminSameAsOwner}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Email *</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      disabled={adminSameAsOwner}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">💳 Purchasing Manager</h2>
                    <p className="text-xs text-purple-200 mt-1">CC'd on invoices and payment receipts</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-purple-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={purchasingSameAsOwner}
                      onChange={(e) => setPurchasingSameAsOwner(e.target.checked)}
                      className="rounded"
                    />
                    Same as owner
                  </label>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Name</label>
                    <input
                      type="text"
                      value={purchasingName}
                      onChange={(e) => setPurchasingName(e.target.value)}
                      disabled={purchasingSameAsOwner}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={purchasingPhone}
                      onChange={(e) => setPurchasingPhone(e.target.value)}
                      disabled={purchasingSameAsOwner}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-1">Email</label>
                    <input
                      type="email"
                      value={purchasingEmail}
                      onChange={(e) => setPurchasingEmail(e.target.value)}
                      disabled={purchasingSameAsOwner}
                      className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Current Inventory */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-4">� Current Inventory</h2>
                <p className="text-sm text-purple-200 mb-4">Enter how many retail units they currently have on hand</p>
                
                {loadingProducts ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-purple-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-purple-200">Loading products...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {products
                      .filter(p => p.productType === 'retail' || p.productType === 'sample')
                      .sort((a, b) => {
                        // First by name
                        const nameA = extractBaseName(a);
                        const nameB = extractBaseName(b);
                        const nameCompare = nameA.localeCompare(nameB);
                        if (nameCompare !== 0) return nameCompare;
                        
                        // Then by size
                        return extractSize(a) - extractSize(b);
                      })
                      .map((product) => {
                        const entry = inventoryEntries.find(e => e.productSku === product.sku);
                        const quantity = entry?.quantity || 0;
                        
                        return (
                          <div key={product.sku} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                            {product.imageUrl && (
                              <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-white">{product.name}</div>
                              <div className="text-xs text-purple-300">{product.sku} • {product.category}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateInventoryQuantity(product.sku, Math.max(0, quantity - 1))}
                                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded border border-white/30 text-white font-bold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={quantity}
                                onChange={(e) => updateInventoryQuantity(product.sku, parseInt(e.target.value) || 0)}
                                className="w-16 text-center bg-white/5 border-2 border-white/30 rounded px-2 py-1 text-white"
                              />
                              <button
                                type="button"
                                onClick={() => updateInventoryQuantity(product.sku, quantity + 1)}
                                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded border border-white/30 text-white font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                
                {inventoryEntries.length > 0 && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-400/30 rounded-lg">
                    <div className="text-sm text-green-200">
                      Total items: {inventoryEntries.reduce((sum, item) => sum + item.quantity, 0)} units across {inventoryEntries.length} products
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
                {submitError && (
                  <div className="mb-4 p-4 bg-red-500/20 border-2 border-red-400/50 backdrop-blur-sm rounded-lg text-red-100">
                    {submitError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => router.back()} 
                    className="flex-1 px-6 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting} 
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition-all"
                  >
                    {submitting ? 'Creating Store...' : 'Create Store'}
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}