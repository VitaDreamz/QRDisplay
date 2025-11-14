'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type ShopifyCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  province?: string;
  address?: string;
  zip?: string;
};

type Brand = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  logoUrl?: string;
};

type Product = {
  id: string;
  sku: string;
  name: string;
  price: string;
  imageUrl?: string;
  orgId: string;
};

export default function AddStorePage() {
  const router = useRouter();
  
  // Load saved progress from localStorage
  const loadProgress = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('addStoreProgress');
      if (!saved) return null;
      
      const parsed = JSON.parse(saved);
      
      // Validate that selectedBrands only contains orgIds (starts with "ORG-")
      if (parsed.selectedBrands) {
        parsed.selectedBrands = parsed.selectedBrands.filter((id: string) => id.startsWith('ORG-'));
      }
      
      return parsed;
    } catch {
      return null;
    }
  };

  const savedProgress = loadProgress();
  
  // Step tracking (now 4 steps: Search, Store Info, Brands, Products)
  const [currentStep, setCurrentStep] = useState(savedProgress?.currentStep || 1);
  
  // Step 1: Search for existing Shopify customer
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [shopifyCustomers, setShopifyCustomers] = useState<ShopifyCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ShopifyCustomer | null>(savedProgress?.selectedCustomer || null);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Step 2: Store Info
  const [businessName, setBusinessName] = useState(savedProgress?.businessName || '');
  const [streetAddress, setStreetAddress] = useState(savedProgress?.streetAddress || '');
  const [city, setCity] = useState(savedProgress?.city || '');
  const [state, setState] = useState(savedProgress?.state || '');
  const [zipCode, setZipCode] = useState(savedProgress?.zipCode || '');
  const [timezone, setTimezone] = useState(savedProgress?.timezone || 'America/New_York');
  
  // Contacts
  const [ownerName, setOwnerName] = useState(savedProgress?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(savedProgress?.ownerPhone || '');
  const [ownerEmail, setOwnerEmail] = useState(savedProgress?.ownerEmail || '');
  
  // Store PIN (suggested, but user can change)
  const [staffPin, setStaffPin] = useState(savedProgress?.staffPin || Math.floor(1000 + Math.random() * 9000).toString());
  
  // Subscription Tier
  const [subscriptionTier, setSubscriptionTier] = useState<'tester' | 'free' | 'basic' | 'dreamer' | 'mega'>(savedProgress?.subscriptionTier || 'tester');
  
  // Brand Partnerships (Step 3)
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>(savedProgress?.selectedBrands || []);
  
  // Products (Step 4)
  const [products, setProducts] = useState<Record<string, Product[]>>({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, { samples: string[]; products: string[] }>>(savedProgress?.selectedProducts || {});
  const [verifiedBrands, setVerifiedBrands] = useState<Set<string>>(
    Array.isArray(savedProgress?.verifiedBrands) ? new Set(savedProgress.verifiedBrands) : new Set()
  );
  
  // Staff (Step 5 - Optional)
  const [staffMembers, setStaffMembers] = useState<Array<{ 
    firstName: string; 
    lastName: string; 
    phone: string; 
    email: string; 
    role: string;
    onCallDays: string[];
    startTime: string;
    endTime: string;
  }>>(savedProgress?.staffMembers || []);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [currentStaff, setCurrentStaff] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: 'Sales',
    onCallDays: [] as string[],
    startTime: '09:00',
    endTime: '17:00',
  });
  
  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Save progress to localStorage whenever form data changes
  useEffect(() => {
    if (success) return; // Don't save after successful submission
    
    const progressData = {
      currentStep,
      selectedCustomer,
      businessName,
      streetAddress,
      city,
      state,
      zipCode,
      timezone,
      ownerName,
      ownerPhone,
      ownerEmail,
      staffPin,
      subscriptionTier,
      selectedBrands,
      selectedProducts,
      verifiedBrands: Array.from(verifiedBrands),
      staffMembers,
    };
    
    localStorage.setItem('addStoreProgress', JSON.stringify(progressData));
  }, [currentStep, selectedCustomer, businessName, streetAddress, city, state, zipCode, timezone, ownerName, ownerPhone, ownerEmail, staffPin, subscriptionTier, selectedBrands, selectedProducts, verifiedBrands, staffMembers, success]);

  // Clear progress after successful submission
  useEffect(() => {
    if (success) {
      localStorage.removeItem('addStoreProgress');
    }
  }, [success]);

  // Search for Shopify customers (Step 1)
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
        // Search across ALL brands (platform-wide search)
        const response = await fetch(
          `/api/admin/shopify/search-customers?query=${encodeURIComponent(searchQuery)}`
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

  // Handle selecting a Shopify customer
  const handleSelectCustomer = (customer: ShopifyCustomer) => {
    setSelectedCustomer(customer);
    setShowResults(false);
    setSearchQuery('');
    
    // Pre-fill store info from customer
    setBusinessName(customer.firstName);
    setStreetAddress(customer.address || '');
    setCity(customer.city || '');
    setState(customer.province || '');
    setZipCode(customer.zip || '');
    
    // Pre-fill owner contact
    setOwnerEmail(customer.email || '');
    setOwnerPhone(customer.phone || '');
    
    // Move to step 2
    setCurrentStep(2);
  };

  // Fetch all brands on mount
  useEffect(() => {
    (async () => {
      setLoadingBrands(true);
      try {
        const res = await fetch('/api/admin/brands');
        if (res.ok) {
          const data = await res.json();
          // Filter to only client brands (not platform org)
          const clientBrands = data.brands?.filter((b: any) => b.type === 'client') || [];
          setBrands(clientBrands);
        }
      } catch (err) {
        console.error('Failed to load brands:', err);
      } finally {
        setLoadingBrands(false);
      }
    })();
  }, []);

  // Fetch products when brands are selected
  useEffect(() => {
    if (selectedBrands.length === 0) return;

    (async () => {
      setLoadingProducts(true);
      console.log('[Add Store] Loading products for brands:', selectedBrands);
      try {
        const productsByBrand: Record<string, Product[]> = {};
        
        for (const brandId of selectedBrands) {
          console.log('[Add Store] Fetching products for:', brandId);
          const res = await fetch(`/api/products?orgId=${brandId}`);
          if (res.ok) {
            const data = await res.json();
            console.log(`[Add Store] Got ${data.products?.length || 0} products for ${brandId}`);
            productsByBrand[brandId] = data.products || [];
          } else {
            console.error(`[Add Store] Failed to fetch products for ${brandId}:`, res.status);
          }
        }
        
        console.log('[Add Store] Total products loaded:', Object.keys(productsByBrand).map(k => `${k}: ${productsByBrand[k].length}`));
        setProducts(productsByBrand);
        
        // Auto-select all retail products (excluding -BX) for each brand
        setSelectedProducts((prevSelections) => {
          const newSelections = { ...prevSelections };
          
          selectedBrands.forEach((brandId) => {
            const brandProducts = productsByBrand[brandId] || [];
            const retailProducts = brandProducts.filter((p) => !p.sku?.includes('-BX'));
            
            // Auto-select all retail products (override any previous state)
            const samples = retailProducts.filter(p => 
              p.name?.toLowerCase().includes('4ct') || p.sku?.toLowerCase().includes('4ct')
            ).map(p => p.sku);
            
            const products = retailProducts.filter(p => 
              !p.name?.toLowerCase().includes('4ct') && !p.sku?.toLowerCase().includes('4ct')
            ).map(p => p.sku);
            
            newSelections[brandId] = { samples, products };
            
            console.log(`[Add Store] Auto-selected ${samples.length} samples and ${products.length} products for ${brandId}`);
            
            // Set default inventory quantities
            retailProducts.forEach(product => {
              if (!inventoryQuantities[product.sku]) {
                setInventoryQuantities(prev => ({ ...prev, [product.sku]: 0 }));
              }
            });
          });
          
          return newSelections;
        });
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoadingProducts(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrands]);

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  };

  const toggleProduct = (brandId: string, sku: string, isSample: boolean, quantity?: number) => {
    setSelectedProducts((prev) => {
      const brandSelections = prev[brandId] || { samples: [], products: [] };
      const key = isSample ? 'samples' : 'products';
      const current = brandSelections[key];
      
      // If quantity is provided, we're updating inventory, not toggling selection
      if (quantity !== undefined) {
        // Just update the inventory state, selection is handled separately
        return prev;
      }
      
      return {
        ...prev,
        [brandId]: {
          ...brandSelections,
          [key]: current.includes(sku) ? current.filter((s) => s !== sku) : [...current, sku],
        },
      };
    });
  };

  // Inventory quantities for each product
  const [inventoryQuantities, setInventoryQuantities] = useState<Record<string, number>>({});

  const updateInventoryQuantity = (sku: string, quantity: number) => {
    setInventoryQuantities(prev => ({
      ...prev,
      [sku]: quantity
    }));
  };

  const verifyBrandInventory = (brandId: string) => {
    setVerifiedBrands(prev => new Set(prev).add(brandId));
  };

  const unverifyBrandInventory = (brandId: string) => {
    setVerifiedBrands(prev => {
      const newSet = new Set(prev);
      newSet.delete(brandId);
      return newSet;
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!businessName || !city || !state) {
      setError('Please fill in all required store information');
      return;
    }

    if (selectedBrands.length === 0) {
      setError('Please select at least one brand partnership');
      return;
    }

    const hasProducts = Object.values(selectedProducts).some(
      (selections) => selections.samples.length > 0 || selections.products.length > 0
    );
    if (!hasProducts) {
      setError('Please select at least one product');
      return;
    }

    // Check all brands have verified inventory
    const unverifiedBrands = selectedBrands.filter(brandId => !verifiedBrands.has(brandId));
    if (unverifiedBrands.length > 0) {
      setError('Please verify inventory for all brands before submitting');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/stores/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Store info
          businessName,
          streetAddress,
          city,
          state,
          zipCode,
          timezone,
          ownerName,
          ownerPhone,
          ownerEmail,
          staffPin, // User-provided PIN
          subscriptionTier, // Subscription tier selection
          
          // Brand partnerships - send orgIds (not database IDs)
          brandPartnerships: selectedBrands.map((brandOrgId) => {
            return {
              brandId: brandOrgId, // Send orgId like "ORG-VBEN2"
              availableSamples: selectedProducts[brandOrgId]?.samples || [],
              availableProducts: selectedProducts[brandOrgId]?.products || [],
            };
          }),
          
          // Inventory quantities
          inventoryQuantities,
          
          // Staff members (if any)
          staffMembers: staffMembers.length > 0 ? staffMembers : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create store');
        return;
      }

      setSuccess(true);
      
      // Redirect to store view after 2 seconds
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error creating store:', err);
      setError('Failed to create store');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
  );

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Created!</h2>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          {/* Spinning wheel */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              <div className="absolute top-0 left-0 w-full h-full border-8 border-purple-200 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-8 border-transparent border-t-purple-600 rounded-full animate-spin"></div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Creating Store...</h2>
          
          {/* Progress steps */}
          <div className="space-y-3 text-left max-w-xs mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700">Validating store information</span>
            </div>
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-6 h-6 rounded-full border-2 border-purple-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-600"></div>
              </div>
              <span className="text-sm text-gray-700">Creating brand partnerships</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
              <span className="text-sm text-gray-500">Setting up inventory</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
              <span className="text-sm text-gray-500">Finalizing store setup</span>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mt-6">This may take a few moments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Store</h1>
          <p className="text-gray-600">Configure a new store with brand partnerships and product selections</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Look up Store' },
              { num: 2, label: 'Store Info' },
              { num: 3, label: 'Brand Partnerships' },
              { num: 4, label: 'Products' },
              { num: 5, label: 'Staff (Optional)' },
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step.num
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.num}
                </div>
                <div className="ml-3 flex-1">
                  <div className="font-medium text-gray-900">{step.label}</div>
                </div>
                {idx < 4 && (
                  <div
                    className={`h-1 flex-1 mx-4 ${
                      currentStep > step.num ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Look up Store (Search Shopify Customers) */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">🔍 Look up Store</h2>
            <p className="text-sm text-gray-600 mb-6">Search by business name, email, or phone</p>
            
            <div className="relative mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wholesale customers..."
                className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                </div>
              )}

              {showResults && shopifyCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[400px] overflow-y-auto">
                  {shopifyCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-100 transition-colors"
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

            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Skip and enter manually →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Store Info */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Store Information</h2>
            
            {selectedCustomer && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-indigo-700 mb-1">✓ Selected Wholesale Customer</div>
                    <div className="text-lg font-bold text-indigo-900">{selectedCustomer.firstName}</div>
                    <div className="text-sm text-indigo-600">{selectedCustomer.city}, {selectedCustomer.province}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCurrentStep(1);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Acme Health Foods"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Phone</label>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              {/* Store Admin PIN */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Admin PIN
                  <span className="ml-2 text-xs text-gray-500">(Suggested: {Math.floor(1000 + Math.random() * 9000)} - or enter your own 4-digit PIN)</span>
                </label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="[0-9]*"
                  value={staffPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) setStaffPin(val);
                  }}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg font-mono"
                  style={{ color: staffPin.length === 4 ? '#000' : '#999' }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This PIN will be used to log in to the store dashboard and for staff to check in customers.
                </p>
              </div>
              
              {/* Subscription Tier Selection */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Subscription Tier *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Tester Tier */}
                  <button
                    type="button"
                    onClick={() => setSubscriptionTier('tester')}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      subscriptionTier === 'tester'
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-lg text-purple-900">Tester</div>
                      {subscriptionTier === 'tester' && (
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-purple-900 mb-1">FREE</div>
                    <div className="text-xs text-purple-600 mb-3">Trial Tier</div>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• 40 samples/quarter</li>
                      <li>• 100 customer slots/quarter</li>
                      <li>• 4ct, 20ct, 30ct boxes</li>
                      <li>• 20% commission</li>
                      <li>• 50% promo reimbursement</li>
                    </ul>
                  </button>
                  
                  {/* Free Tier */}
                  <button
                    type="button"
                    onClick={() => setSubscriptionTier('free')}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      subscriptionTier === 'free'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-lg text-gray-900">Free</div>
                      {subscriptionTier === 'free' && (
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">$0</div>
                    <div className="text-xs text-gray-500 mb-3">/quarter</div>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• 10 samples/quarter</li>
                      <li>• 10 customer slots/quarter</li>
                      <li>• 5% commission</li>
                      <li>• 10% promo reimbursement</li>
                    </ul>
                  </button>

                  {/* Basic Tier */}
                  <button
                    type="button"
                    onClick={() => setSubscriptionTier('basic')}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      subscriptionTier === 'basic'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-lg text-gray-900">Basic</div>
                      {subscriptionTier === 'basic' && (
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">$150</div>
                    <div className="text-xs text-gray-500 mb-3">/quarter</div>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• 20 samples/quarter</li>
                      <li>• 50 customer slots/quarter</li>
                      <li>• 4ct wholesale boxes</li>
                      <li>• 10% commission</li>
                      <li>• 25% promo reimbursement</li>
                    </ul>
                  </button>

                  {/* Dreamer Tier */}
                  <button
                    type="button"
                    onClick={() => setSubscriptionTier('dreamer')}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      subscriptionTier === 'dreamer'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-lg text-gray-900">Dreamer</div>
                      {subscriptionTier === 'dreamer' && (
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">$249</div>
                    <div className="text-xs text-gray-500 mb-3">/quarter</div>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• 40 samples/quarter</li>
                      <li>• 100 customer slots/quarter</li>
                      <li>• 4ct, 20ct, 30ct boxes</li>
                      <li>• 20% commission</li>
                      <li>• 50% promo reimbursement</li>
                    </ul>
                  </button>

                  {/* Mega Tier */}
                  <button
                    type="button"
                    onClick={() => setSubscriptionTier('mega')}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      subscriptionTier === 'mega'
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-bold text-lg text-gray-900">Mega Dreamer</div>
                      {subscriptionTier === 'mega' && (
                        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">$499</div>
                    <div className="text-xs text-gray-500 mb-3">/quarter</div>
                    <ul className="space-y-1 text-xs text-gray-600">
                      <li>• 60 samples/quarter</li>
                      <li>• 200 customer slots/quarter</li>
                      <li>• All wholesale boxes</li>
                      <li>• 30% commission</li>
                      <li>• 100% promo reimbursement</li>
                    </ul>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Customer slots accumulate each billing cycle. Unused samples do not roll over.
                </p>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 text-gray-700 hover:text-gray-900"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!businessName || !city || !state}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Select Brands →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Brand Partnerships */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Brand Partnerships</h2>
            <p className="text-gray-600 mb-6">Select which brands this store will carry</p>

            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={brandSearchQuery}
                onChange={(e) => setBrandSearchQuery(e.target.value)}
                placeholder="Search brands..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Brand List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingBrands ? (
                <div className="text-center py-8 text-gray-600">Loading brands...</div>
              ) : filteredBrands.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No brands found</div>
              ) : (
                filteredBrands.map((brand) => {
                  const isSelected = selectedBrands.includes(brand.orgId);
                  
                  return (
                    <button
                      key={brand.id}
                      onClick={() => toggleBrand(brand.orgId)}
                      className={`w-full flex items-center gap-4 p-4 border rounded-lg transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <span className="text-white text-sm">✓</span>}
                      </div>
                      
                      {brand.logoUrl && (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="w-12 h-12 object-contain bg-white rounded p-1"
                        />
                      )}
                      
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">{brand.name}</div>
                        <div className="text-sm text-gray-600">{brand.orgId}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                disabled={selectedBrands.length === 0}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Select Products →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Products */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Selection</h2>
            <p className="text-gray-600 mb-6">All products are auto-selected. Adjust quantities and uncheck any you don't want to offer.</p>

            {loadingProducts ? (
              <div className="text-center py-8 text-gray-600">Loading products...</div>
            ) : (
              <div className="space-y-8">
                {/* SECTION 1: Available Samples (All 4ct products from all brands) */}
                <div className={`border-2 rounded-lg overflow-hidden ${verifiedBrands.has('SAMPLES') ? 'border-green-500 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                  <div className={`px-6 py-4 border-b flex items-center justify-between ${verifiedBrands.has('SAMPLES') ? 'bg-green-100 border-green-500' : 'bg-amber-100 border-amber-200'}`}>
                    <div>
                      <h3 className="text-xl font-bold text-amber-900">🎁 Available Samples (4ct)</h3>
                      <p className="text-sm text-amber-700 mt-1">Free samples for customer acquisition</p>
                    </div>
                    <button
                      onClick={() => verifiedBrands.has('SAMPLES') ? unverifyBrandInventory('SAMPLES') : verifyBrandInventory('SAMPLES')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        verifiedBrands.has('SAMPLES')
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                    >
                      {verifiedBrands.has('SAMPLES') ? '✓ Confirmed' : 'Verify Samples'}
                    </button>
                  </div>
                  
                  {verifiedBrands.has('SAMPLES') ? (
                    // Collapsed "Confirmed" View for Samples
                    <div className="p-6 bg-green-50/50">
                      <div className="space-y-2">
                        {selectedBrands.flatMap((brandOrgId) => {
                          const brand = brands.find((b) => b.orgId === brandOrgId);
                          const brandProducts = products[brandOrgId] || [];
                          const samples = brandProducts.filter((p) => 
                            !p.sku?.includes('-BX') && (p.sku?.includes('-4') || p.name?.toLowerCase().includes('4ct'))
                          );
                          const brandSelections = selectedProducts[brandOrgId] || { samples: [], products: [] };
                          const selectedSamples = samples.filter(p => brandSelections.samples.includes(p.sku));
                          
                          return selectedSamples.map(product => {
                            const qty = inventoryQuantities[product.sku] || 0;
                            return (
                              <div key={product.sku} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border border-green-200">
                                <div className="flex-1">
                                  <span className="font-medium text-gray-900">{product.sku}</span>
                                  <span className="text-gray-600 ml-2">- {product.name}</span>
                                  <span className="text-gray-500 ml-2 text-xs">({brand?.name})</span>
                                </div>
                                <span className="text-green-700 font-semibold">{qty} units</span>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  ) : (
                    // Expanded Edit View for Samples
                    <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedBrands.flatMap((brandOrgId) => {
                        const brand = brands.find((b) => b.orgId === brandOrgId);
                        const brandProducts = products[brandOrgId] || [];
                        const samples = brandProducts.filter((p) => 
                          !p.sku?.includes('-BX') && (p.sku?.includes('-4') || p.name?.toLowerCase().includes('4ct'))
                        );
                        
                        return samples.map((product) => {
                          const qty = inventoryQuantities[product.sku] || 0;
                          const brandSelections = selectedProducts[brandOrgId] || { samples: [], products: [] };
                          const isSelected = brandSelections.samples.includes(product.sku);
                          
                          return (
                            <div 
                              key={product.sku} 
                              className={`border-2 rounded-lg p-4 transition-all ${
                                isSelected 
                                  ? 'border-amber-500 bg-white shadow-sm' 
                                  : 'border-gray-200 bg-gray-50 opacity-60'
                              }`}
                            >
                              <div className="flex gap-3">
                                {product.imageUrl && (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name} 
                                    className="w-16 h-16 object-cover rounded border border-gray-200"
                                  />
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 text-sm truncate">{product.name}</div>
                                      <div className="text-xs text-gray-500">{brand?.name}</div>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleProduct(brandOrgId, product.sku, true)}
                                      className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 flex-shrink-0"
                                    />
                                  </div>
                                  <div className="text-xs text-gray-600 mb-2">{product.sku}</div>
                                  
                                  {isSelected && (
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs font-medium text-gray-700">Qty:</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={qty}
                                        onChange={(e) => updateInventoryQuantity(product.sku, parseInt(e.target.value) || 0)}
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })}
                    </div>
                  </div>
                  )}
                </div>

                {/* SECTION 2: Full-Size Products (Grouped by Brand) */}
                <div className="border border-indigo-200 rounded-lg overflow-hidden bg-indigo-50/30">
                  <div className="bg-indigo-100 px-6 py-4 border-b border-indigo-200">
                    <h3 className="text-xl font-bold text-indigo-900">📦 Full-Size Products</h3>
                    <p className="text-sm text-indigo-700 mt-1">Retail products available for purchase</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {selectedBrands.map((brandOrgId) => {
                      const brand = brands.find((b) => b.orgId === brandOrgId);
                      const brandProducts = products[brandOrgId] || [];
                      const fullSize = brandProducts.filter((p) => 
                        !p.sku?.includes('-BX') && !p.sku?.includes('-4') && !p.name?.toLowerCase().includes('4ct')
                      ).sort((a, b) => {
                        const getCount = (product: any) => {
                          const sku = product.sku?.toLowerCase() || '';
                          if (sku.includes('20ct')) return 20;
                          if (sku.includes('30ct')) return 30;
                          if (sku.includes('60ct')) return 60;
                          return 999;
                        };
                        return getCount(a) - getCount(b);
                      });
                      
                      if (fullSize.length === 0) return null;
                      
                      const isVerified = verifiedBrands.has(brandOrgId);
                      const brandSelections = selectedProducts[brandOrgId] || { samples: [], products: [] };
                      const selectedFullSize = fullSize.filter(p => brandSelections.products.includes(p.sku));
                      
                      return (
                        <div key={brandOrgId} className={`border-2 rounded-lg overflow-hidden ${isVerified ? 'border-green-500' : 'border-gray-200'}`}>
                          <div className={`px-4 py-3 border-b flex items-center justify-between ${isVerified ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}`}>
                            <div>
                              <h4 className="font-bold text-gray-900">{brand?.name}</h4>
                              {isVerified && (
                                <p className="text-sm text-green-700 mt-1">
                                  ✓ {selectedFullSize.length} products confirmed
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => isVerified ? unverifyBrandInventory(brandOrgId) : verifyBrandInventory(brandOrgId)}
                              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                isVerified
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isVerified ? '✓ Confirmed' : 'Verify Inventory'}
                            </button>
                          </div>
                          
                          {isVerified ? (
                            // Collapsed "Confirmed" View
                            <div className="p-4 bg-green-50/50">
                              <div className="space-y-2">
                                {selectedFullSize.map(product => {
                                  const qty = inventoryQuantities[product.sku] || 0;
                                  return (
                                    <div key={product.sku} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2 border border-green-200">
                                      <div className="flex-1">
                                        <span className="font-medium text-gray-900">{product.sku}</span>
                                        <span className="text-gray-600 ml-2">- {product.name}</span>
                                      </div>
                                      <span className="text-green-700 font-semibold">{qty} units</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            // Expanded Edit View
                            <div className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {fullSize.map((product) => {
                                const qty = inventoryQuantities[product.sku] || 0;
                                const brandSelections = selectedProducts[brandOrgId] || { samples: [], products: [] };
                                const isSelected = brandSelections.products.includes(product.sku);
                                
                                return (
                                  <div 
                                    key={product.sku} 
                                    className={`border-2 rounded-lg p-4 transition-all ${
                                      isSelected 
                                        ? 'border-indigo-500 bg-white shadow-sm' 
                                        : 'border-gray-200 bg-gray-50 opacity-60'
                                    }`}
                                  >
                                    <div className="flex gap-3">
                                      {product.imageUrl && (
                                        <img 
                                          src={product.imageUrl} 
                                          alt={product.name} 
                                          className="w-16 h-16 object-cover rounded border border-gray-200"
                                        />
                                      )}
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-900 text-sm truncate">{product.name}</div>
                                            <div className="text-xs text-gray-500">${product.price}</div>
                                          </div>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleProduct(brandOrgId, product.sku, false)}
                                            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0"
                                          />
                                        </div>
                                        <div className="text-xs text-gray-600 mb-2">{product.sku}</div>
                                        
                                        {isSelected && (
                                          <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-gray-700">Qty:</label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={qty}
                                              onChange={(e) => updateInventoryQuantity(product.sku, parseInt(e.target.value) || 0)}
                                              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                              placeholder="0"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Verification Status Summary */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-blue-900">Verification Status:</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {verifiedBrands.has('SAMPLES') ? (
                    <span className="text-green-600">✓ Samples verified</span>
                  ) : (
                    <span className="text-amber-600">⚠ Samples need verification</span>
                  )}
                </div>
                {selectedBrands.map(brandId => {
                  const brand = brands.find(b => b.orgId === brandId);
                  const isVerified = verifiedBrands.has(brandId);
                  return (
                    <div key={brandId} className="flex items-center gap-2">
                      {isVerified ? (
                        <span className="text-green-600">✓ {brand?.name} verified</span>
                      ) : (
                        <span className="text-amber-600">⚠ {brand?.name} needs verification</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                ← Back
              </button>
              <button
                onClick={() => {
                  // Check if samples are verified
                  if (!verifiedBrands.has('SAMPLES')) {
                    setError('Please verify all samples before continuing');
                    return;
                  }
                  
                  // Check if all selected brands are verified
                  const unverifiedBrands = selectedBrands.filter(brandId => !verifiedBrands.has(brandId));
                  if (unverifiedBrands.length > 0) {
                    const unverifiedBrandNames = unverifiedBrands.map(brandId => {
                      const brand = brands.find(b => b.orgId === brandId);
                      return brand?.name || brandId;
                    });
                    setError(`Please verify inventory for: ${unverifiedBrandNames.join(', ')}`);
                    return;
                  }
                  
                  setError('');
                  setCurrentStep(5);
                }}
                disabled={!verifiedBrands.has('SAMPLES') || selectedBrands.some(brandId => !verifiedBrands.has(brandId))}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Staff →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Staff (Optional) */}
        {currentStep === 5 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Staff Members (Optional)</h2>
            <p className="text-gray-600 mb-6">Add staff who will be managing this store. You can also add them later.</p>

            {staffMembers.length > 0 && (
              <div className="mb-6 space-y-3">
                {staffMembers.map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div>
                      <div className="font-medium text-gray-900">{staff.firstName} {staff.lastName}</div>
                      <div className="text-sm text-gray-600">
                        {staff.phone} • {staff.email} • {staff.role}
                      </div>
                      {staff.onCallDays.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {staff.onCallDays.join(', ')} • {staff.startTime}-{staff.endTime}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setStaffMembers(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showStaffForm ? (
              <div className="space-y-6 mb-6">
                {/* Basic Info */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="font-semibold text-lg mb-4">Staff Information</h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">First Name *</label>
                        <input
                          type="text"
                          value={currentStaff.firstName}
                          onChange={(e) => setCurrentStaff(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Last Name *</label>
                        <input
                          type="text"
                          value={currentStaff.lastName}
                          onChange={(e) => setCurrentStaff(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Smith"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        value={currentStaff.phone}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="5551234567"
                      />
                      <p className="text-xs text-indigo-600 mt-1">
                        Their PIN will be the last 4 digits: {currentStaff.phone.slice(-4) || '****'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Email *</label>
                      <input
                        type="email"
                        value={currentStaff.email}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="john@store.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Role *</label>
                      <select
                        value={currentStaff.role}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {['Sales', 'Cashier', 'Manager', 'Marketing', 'Other'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Schedule (Optional) */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="font-semibold text-lg mb-4">Schedule (Optional)</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">On-Call Days</label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setCurrentStaff(prev => ({
                                ...prev,
                                onCallDays: prev.onCallDays.includes(day)
                                  ? prev.onCallDays.filter(d => d !== day)
                                  : [...prev.onCallDays, day]
                              }));
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                              currentStaff.onCallDays.includes(day)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Start Time</label>
                        <input
                          type="time"
                          value={currentStaff.startTime}
                          onChange={(e) => setCurrentStaff(prev => ({ ...prev, startTime: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">End Time</label>
                        <input
                          type="time"
                          value={currentStaff.endTime}
                          onChange={(e) => setCurrentStaff(prev => ({ ...prev, endTime: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add/Cancel Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (currentStaff.firstName && currentStaff.lastName && currentStaff.phone && currentStaff.email) {
                        setStaffMembers(prev => [...prev, currentStaff]);
                        setCurrentStaff({
                          firstName: '',
                          lastName: '',
                          phone: '',
                          email: '',
                          role: 'Sales',
                          onCallDays: [],
                          startTime: '09:00',
                          endTime: '17:00',
                        });
                        setShowStaffForm(false);
                      }
                    }}
                    disabled={!currentStaff.firstName || !currentStaff.lastName || !currentStaff.phone || !currentStaff.email}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Staff Member
                  </button>
                  <button
                    onClick={() => {
                      setShowStaffForm(false);
                      setCurrentStaff({
                        firstName: '',
                        lastName: '',
                        phone: '',
                        email: '',
                        role: 'Sales',
                        onCallDays: [],
                        startTime: '09:00',
                        endTime: '17:00',
                      });
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowStaffForm(true)}
                className="w-full px-6 py-4 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors mb-6"
              >
                + Add Staff Member
              </button>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> You can skip this step and add staff members later from the store management page.
              </p>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Creating Store...' : staffMembers.length > 0 ? `Create Store with ${staffMembers.length} Staff` : 'Create Store'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
