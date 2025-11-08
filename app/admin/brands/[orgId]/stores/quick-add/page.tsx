'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Trash2, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
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
  
  // Step 1: Find Shopify customer
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
  
  // Step 2: Configure store
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  
  // Step 3: Manual inventory
  const [retailProducts, setRetailProducts] = useState<RetailProduct[]>([]);
  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);
  
  // Step 4: Trial kit (optional)
  const [wholesaleProducts, setWholesaleProducts] = useState<WholesaleProduct[]>([]);
  const [trialKitItems, setTrialKitItems] = useState<TrialKitItem[]>([]);
  const [includeTrialKit, setIncludeTrialKit] = useState(false);
  
  // Final submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdStoreId, setCreatedStoreId] = useState('');

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Debounced search as user types
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
    }, 300); // 300ms debounce

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
      
      // Separate retail and wholesale products
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
    setSearchQuery(customer.firstName); // Business name
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

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/admin/brands/ORG-VITADREAMZ/stores/${data.storeId}`);
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
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Store <strong>{createdStoreId}</strong> created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quick Add Store</h1>
        <p className="text-muted-foreground">Link an existing Shopify wholesale customer to QRDisplay</p>
      </div>

      {/* Step 1: Find Shopify Customer */}
      <Card>
        <CardHeader>
          <CardTitle>1. Find Shopify Customer</CardTitle>
          <CardDescription>Search by business name, email, or phone (partial matches supported)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Start typing business name, email, or phone..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searching && (
                <div className="flex items-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && shopifyCustomers.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {visibleCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900">{customer.firstName}</div>
                        <div className="text-sm text-gray-500">
                          {customer.city && customer.province && `${customer.city}, ${customer.province}`}
                        </div>
                        {customer.email && (
                          <div className="text-xs text-gray-400 mt-1">{customer.email}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                
                {shopifyCustomers.length > INITIAL_RESULTS_LIMIT && !showAllResults && (
                  <button
                    onClick={() => setShowAllResults(true)}
                    className="w-full px-4 py-2 text-sm text-primary hover:bg-gray-50 border-t"
                  >
                    Show all {shopifyCustomers.length} results
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Selected Customer Display */}
          {selectedCustomer && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{selectedCustomer.firstName}</p>
                  {selectedCustomer.city && selectedCustomer.province && (
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.city}, {selectedCustomer.province}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                  {selectedCustomer.phone && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSearchQuery('');
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Subscription Tier */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>2. Subscription Tier</CardTitle>
            <CardDescription>Select the subscription tier for this store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(SUBSCRIPTION_TIERS).map(([tier, config]) => (
                <button
                  key={tier}
                  onClick={() => setSubscriptionTier(tier as SubscriptionTier)}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    subscriptionTier === tier
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{config.name}</div>
                  <div className="text-2xl font-bold mt-1">
                    {config.price === 0 ? 'Free' : `$${config.price}/qtr`}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    +{config.features.newCustomersPerBilling} customers/qtr
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {config.features.samplesPerQuarter} samples/qtr
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Manual Inventory */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>3. Current Inventory (Optional)</CardTitle>
            <CardDescription>Enter any existing inventory the store currently has on-hand</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryEntries.map((entry, index) => {
              const product = retailProducts.find(p => p.sku === entry.productSku);
              return (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Product</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2"
                      value={entry.productSku}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateInventoryEntry(index, 'productSku', e.target.value)}
                    >
                      {retailProducts.map(p => (
                        <option key={p.sku} value={p.sku}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      value={entry.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateInventoryEntry(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInventoryEntry(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            
            <Button variant="outline" onClick={addInventoryEntry} disabled={retailProducts.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Inventory Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Trial Kit Order */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle>4. Trial Kit Order (Optional)</CardTitle>
            <CardDescription>Create a draft order for wholesale boxes (will convert to retail inventory)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeTrialKit"
                checked={includeTrialKit}
                onChange={(e) => setIncludeTrialKit(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeTrialKit">Include trial kit order</Label>
            </div>

            {includeTrialKit && (
              <>
                {trialKitItems.map((item, index) => {
                  const product = wholesaleProducts.find(p => p.sku === item.productSku);
                  return (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label>Wholesale Box</Label>
                        <select
                          className="w-full border rounded-md px-3 py-2"
                          value={item.productSku}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateTrialKitItem(index, 'productSku', e.target.value)}
                        >
                          {wholesaleProducts.map(p => (
                            <option key={p.sku} value={p.sku}>
                              {p.name} - {p.unitsPerBox} units @ ${p.wholesalePrice}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-32">
                        <Label>Boxes</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTrialKitItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      {product && (
                        <div className="w-32">
                          <Label>Units</Label>
                          <Input
                            type="text"
                            value={`${item.quantity * product.unitsPerBox}`}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTrialKitItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                
                <Button variant="outline" onClick={addTrialKitItem} disabled={wholesaleProducts.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Wholesale Box
                </Button>

                {trialKitItems.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <strong>Note:</strong> These wholesale boxes will be automatically converted to retail inventory. 
                      For example, 2 boxes of "Slumber Berry 30ct Box" (8 units per box) will add 16 units of "Slumber Berry - 30ct" to the store's retail inventory.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      {selectedCustomer && (
        <Card>
          <CardContent className="pt-6">
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating Store...' : 'Create Store'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
