'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/subscription-tiers';

interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName?: string;
  city?: string;
  province?: string;
  address?: string;
  zip?: string;
}

interface RetailProduct {
  sku: string;
  name: string;
  category: string;
  price: number;
}

interface WholesaleProduct {
  sku: string;
  name: string;
  category: string;
  unitsPerBox: number;
  wholesalePrice: number;
}

interface InventoryEntry {
  productSku: string;
  quantity: number;
}

interface TrialKitItem {
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
  const [showAllResults, setShowAllResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const INITIAL_RESULTS_LIMIT = 7;
  const visibleCustomers = showAllResults 
    ? shopifyCustomers 
    : shopifyCustomers.slice(0, INITIAL_RESULTS_LIMIT);
  
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [retailProducts, setRetailProducts] = useState<RetailProduct[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);
  const [wholesaleProducts, setWholesaleProducts] = useState<WholesaleProduct[]>([]);
  const [trialKitItems, setTrialKitItems] = useState<TrialKitItem[]>([]);
  const [includeTrialKit, setIncludeTrialKit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdStoreId, setCreatedStoreId] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

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
        setShowAllResults(false);
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

  async function loadProducts() {
    try {
      const response = await fetch('/api/admin/products?orgId=ORG-VITADREAMZ');
      if (!response.ok) throw new Error('Failed to load products');
      
      const data = await response.json();
      const retail = data.products.filter((p: any) => p.productType === 'retail' && p.active);
      const wholesale = data.products.filter((p: any) => p.productType === 'wholesale-box' && p.active);
      
      setRetailProducts(retail.map((p: any) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price)
      })));
      
      setWholesaleProducts(wholesale.map((p: any) => ({
        sku: p.sku,
        name: p.name,
        category: p.category,
        unitsPerBox: p.unitsPerBox,
        wholesalePrice: parseFloat(p.wholesalePrice || p.price)
      })));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }

  function handleSelectCustomer(customer: ShopifyCustomer) {
    setSelectedCustomer(customer);
    setShowResults(false);
    setSearchQuery(customer.firstName);
  }

  function addInventoryEntry() {
    if (retailProducts.length === 0) return;
    setInventoryEntries([...inventoryEntries, { productSku: retailProducts[0].sku, quantity: 0 }]);
  }

  function updateInventoryEntry(index: number, field: 'productSku' | 'quantity', value: string | number) {
    const updated = [...inventoryEntries];
    updated[index] = { ...updated[index], [field]: value };
    setInventoryEntries(updated);
  }

  function removeInventoryEntry(index: number) {
    setInventoryEntries(inventoryEntries.filter((_, i) => i !== index));
  }

  function addTrialKitItem() {
    if (wholesaleProducts.length === 0) return;
    setTrialKitItems([...trialKitItems, { productSku: wholesaleProducts[0].sku, quantity: 1 }]);
  }

  function updateTrialKitItem(index: number, field: 'productSku' | 'quantity', value: string | number) {
    const updated = [...trialKitItems];
    updated[index] = { ...updated[index], [field]: value };
    setTrialKitItems(updated);
  }

  function removeTrialKitItem(index: number) {
    setTrialKitItems(trialKitItems.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!selectedCustomer) {
      setSubmitError('Please select a Shopify customer');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/admin/stores/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopifyCustomerId: selectedCustomer.id,
          subscriptionTier,
          inventoryEntries: inventoryEntries.filter(e => e.quantity > 0),
          trialKitItems: includeTrialKit ? trialKitItems.filter(t => t.quantity > 0) : [],
          orgId: 'ORG-VITADREAMZ'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create store');
      }

      const data = await response.json();
      setCreatedStoreId(data.storeId);
      setSuccess(true);

      setTimeout(() => {
        router.push(`/admin/brands/ORG-VITADREAMZ/stores`);
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
          <p className="text-sm text-green-200 mt-3">Redirecting to stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 mb-2">
            Quick Add Store
          </h1>
          <p className="text-purple-200">Link an existing Shopify wholesale customer</p>
        </div>

        {!selectedCustomer ? (
          /* Step 1: Search for Customer */
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-2">Find Wholesale Customer</h2>
            <p className="text-sm text-purple-200 mb-4">Search by business name, email, or phone</p>
            
            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by business name, email, or phone..."
                className="w-full border-2 border-white/30 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-3 pr-10 text-white placeholder-purple-300 focus:border-purple-400 focus:outline-none"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                </div>
              )}

              {/* Search Results Dropdown */}
              {showResults && shopifyCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[400px] overflow-y-auto">
                  {visibleCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{customer.firstName}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {customer.city && customer.province ? `${customer.city}, ${customer.province}` : 'Location not specified'}
                      </div>
                    </button>
                  ))}
                  
                  {/* Show More Button */}
                  {!showAllResults && shopifyCustomers.length > INITIAL_RESULTS_LIMIT && (
                    <button
                      onClick={() => setShowAllResults(true)}
                      className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 font-medium transition-colors border-t border-gray-200"
                    >
                      Show {shopifyCustomers.length - INITIAL_RESULTS_LIMIT} more
                    </button>
                  )}
                </div>
              )}

              {/* No Results */}
              {showResults && shopifyCustomers.length === 0 && searchQuery.length >= 2 && !searching && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <div className="text-gray-600 text-sm text-center">
                    No wholesale customers found for "{searchQuery}"
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-purple-200">
              Enter business name (e.g., "ABC Liquor"), email address, or phone number
            </p>
          </div>
        ) : (
          /* Step 2: Configure Store */
          <div className="space-y-6">
            {/* Selected Customer */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-semibold mb-1">Selected Business</h3>
                  <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200">
                    {selectedCustomer.firstName}
                  </p>
                  <p className="text-sm text-purple-200 mt-1">
                    {selectedCustomer.city && selectedCustomer.province 
                      ? `${selectedCustomer.city}, ${selectedCustomer.province}` 
                      : 'Location to be confirmed'}
                  </p>
                </div>
                <button 
                  onClick={() => { setSelectedCustomer(null); setSearchQuery(''); }} 
                  className="text-sm text-blue-300 hover:text-blue-200 underline"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Subscription Tier */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-4">Choose Subscription Tier</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => (
                  <button
                    key={tier}
                    onClick={() => setSubscriptionTier(tier as SubscriptionTier)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      subscriptionTier === tier 
                        ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/50' 
                        : 'border-white/30 bg-white/5 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-white mb-1">{config.name}</div>
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-blue-200 mb-2">
                      {config.price === 0 ? 'Free' : `$${config.price}`}
                      <span className="text-sm text-purple-200">{config.price === 0 ? '' : '/qtr'}</span>
                    </div>
                    <div className="text-sm text-purple-200">
                      • +{config.features.newCustomersPerBilling} customers/quarter<br/>
                      • {config.features.samplesPerQuarter} samples/quarter<br/>
                      • {config.features.commissionRate}% commission<br/>
                      • {config.features.promoReimbursementRate}% promo reimbursement
                    </div>
                  </button>
                ))}
              </div>
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
                  onClick={() => router.back()} 
                  className="flex-1 px-6 py-3 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting} 
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/50 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Creating...' : 'Create Store'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
