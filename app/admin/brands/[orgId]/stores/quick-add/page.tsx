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
      <div className="container max-w-2xl py-8">
        <div className="bg-green-50 border border-green-500 rounded-lg p-4 text-green-800">
          ✓ Store <strong>{createdStoreId}</strong> created successfully! Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quick Add Store</h1>
        <p className="text-gray-600">Link an existing Shopify wholesale customer to QRDisplay</p>
      </div>

      {/* Search */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-2">1. Find Shopify Customer</h2>
        <p className="text-sm text-gray-600 mb-4">Search by business name, email, or phone</p>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Start typing..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-md px-4 py-2"
          />
          {searching && <span className="text-sm text-gray-500 mt-2">Searching...</span>}

          {showResults && shopifyCustomers.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {visibleCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full px-4 py-3 hover:bg-gray-50 border-b text-left"
                >
                  <div className="font-medium">{customer.firstName}</div>
                  <div className="text-sm text-gray-500">
                    {customer.city && customer.province && `${customer.city}, ${customer.province}`}
                  </div>
                </button>
              ))}
              {shopifyCustomers.length > INITIAL_RESULTS_LIMIT && !showAllResults && (
                <button
                  onClick={() => setShowAllResults(true)}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                >
                  Show all {shopifyCustomers.length} results
                </button>
              )}
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between">
              <div>
                <p className="font-medium">{selectedCustomer.firstName}</p>
                <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                {selectedCustomer.phone && <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>}
              </div>
              <button onClick={() => { setSelectedCustomer(null); setSearchQuery(''); }} className="text-sm text-blue-600">Change</button>
            </div>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <>
          {/* Subscription Tier */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">2. Subscription Tier</h2>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => (
                <button
                  key={tier}
                  onClick={() => setSubscriptionTier(tier as SubscriptionTier)}
                  className={`p-4 border rounded-lg text-left ${
                    subscriptionTier === tier ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{config.name}</div>
                  <div className="text-2xl font-bold">{config.price === 0 ? 'Free' : `$${config.price}/qtr`}</div>
                  <div className="text-sm text-gray-600">+{config.features.newCustomersPerBilling} customers/qtr</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white border rounded-lg p-6">
            {submitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-500 rounded-lg text-red-800">{submitError}</div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => router.back()} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">
                {submitting ? 'Creating...' : 'Create Store'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
