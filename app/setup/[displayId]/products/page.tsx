'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';
import { toStateAbbreviation } from '@/lib/states';

export default function ProductsStep({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress } = useWizardProgress(displayId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  
  // Refs for scrolling to sections
  const samplesRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  
  // Inventory state for each product (SKU -> quantity)
  const [inventory, setInventory] = useState<Record<string, number>>({});
  
  // Selected samples (4ct) - which ones to make available
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  
  // Selected full-size products - which ones to offer for promos
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Verification state for inventory counts
  const [samplesVerified, setSamplesVerified] = useState(false);
  const [productsVerified, setProductsVerified] = useState(false);
  
  // Brand verification state for each brand subsection
  const [brandVerified, setBrandVerified] = useState<Record<string, boolean>>({});

  // Convert followupDays object from progress to array of numbers
  const selectedDays = useMemo(() => {
    if (!progress?.followupDays) return [4, 12]; // Default to day 4 and 12
    
    const days: number[] = [];
    if (progress.followupDays.day4) days.push(4);
    if (progress.followupDays.day8) days.push(8);
    if (progress.followupDays.day12) days.push(12);
    if (progress.followupDays.day16) days.push(16);
    if (progress.followupDays.day20) days.push(20);
    
    return days.length >= 2 ? days : [4, 12]; // Ensure at least 2 days
  }, [progress?.followupDays]);
  
  // Track if we've already loaded to prevent infinite loop
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);

  // Fetch products and initialize state
  useEffect(() => {
    // Wait for both displayId and progress to be loaded
    if (!displayId) {
      params.then(async (p) => {
        setDisplayId(p.displayId);
      });
      return;
    }
    
    // Prevent infinite loop - only load once
    if (productsLoaded) return;
    
    // Mark as loaded immediately to prevent re-runs
    setProductsLoaded(true);
    
    // Only fetch products once we have displayId
    (async () => {

      try {
        // If we have an existing store, fetch products from its brand partnerships
        if (progress?.existingStoreId) {
          console.log('[ProductsStep] Fetching products for existing store:', progress.existingStoreId);
          
          const storeRes = await fetch(`/api/stores/${progress.existingStoreId}/products`);
          if (!storeRes.ok) {
            console.error('[ProductsStep] Failed to fetch store products', storeRes.status);
            setError('Failed to load store products');
            setProductsLoaded(false); // Allow retry
            return;
          }
          
          const storeData = await storeRes.json();
          const allProducts = Array.isArray(storeData.products) ? storeData.products : [];
          
          // Filter to only active retail products
          const filtered = allProducts.filter((p: any) => {
            if (p && p.active === false) return false;
            if (typeof p?.productType === 'string' && p.productType !== 'retail') return false;
            return true;
          });
          
          console.log('[ProductsStep] Loaded products from store partnerships:', filtered.length);
          setProducts(filtered);
          initializeDefaultInventory(filtered);
          return; // SUCCESS - don't run fallback
        }
        
        // Only run fallback if NO existing store ID
        // This shouldn't happen in normal flow since we always select a store first
        console.warn('[ProductsStep] No existing store found in progress - cannot load products');
        setError('Please select a store first');
        setProductsLoaded(false); // Allow retry
      } catch (e) {
        console.error('[ProductsStep] Error fetching products', e);
        setProductsLoaded(false); // Allow retry
      }
    })();
  }, [displayId, progress?.existingStoreId]); // Re-run when we get the store ID
  
  // Load inventory once products and progress are both available
  useEffect(() => {
    if (!products.length || !progress || inventoryLoaded) return;
    
    console.log('[ProductsStep] Loading inventory with progress:', progress);
    setInventoryLoaded(true); // Mark as loaded immediately to prevent re-runs
    
    if (progress.existingStoreId) {
      console.log('📦 Fetching existing inventory for store:', progress.existingStoreId);
      (async () => {
        try {
          const invRes = await fetch(`/api/store/inventory?storeId=${progress.existingStoreId}`);
          if (invRes.ok) {
            const invData = await invRes.json();
            console.log('✅ Loaded existing inventory:', invData);
            
            const existingInv: Record<string, number> = {};
            const existingSamples: string[] = [];
            const existingProducts: string[] = [];
            
            invData.inventory?.forEach((item: any) => {
              existingInv[item.productSku] = item.quantityOnHand || 0;
            });
            
            if (invData.store) {
              if (invData.store.availableSamples) {
                existingSamples.push(...invData.store.availableSamples);
              }
              if (invData.store.availableProducts) {
                existingProducts.push(...invData.store.availableProducts);
              }
            }
            
            products.forEach((p: any) => {
              if (!existingInv[p.sku]) {
                existingInv[p.sku] = 0;
              }
            });
            
            setInventory(existingInv);
            setSelectedSamples(existingSamples);
            setSelectedProducts(existingProducts);
          }
        } catch (err) {
          console.error('[ProductsStep] Error fetching existing inventory:', err);
        }
      })();
    } else if (progress.productInventory) {
      console.log('💾 Loading inventory from saved progress');
      const savedInv: Record<string, number> = {};
      Object.entries(progress.productInventory).forEach(([sku, value]) => {
        if (typeof value === 'number') {
          savedInv[sku] = value;
        } else if (typeof value === 'object' && value !== null && 'quantity' in value) {
          savedInv[sku] = value.quantity;
        }
      });
      setInventory(savedInv);
      if (progress.selectedSamples) setSelectedSamples(progress.selectedSamples);
      if (progress.selectedProducts) setSelectedProducts(progress.selectedProducts);
      if (progress.samplesVerified) setSamplesVerified(progress.samplesVerified);
      if (progress.productsVerified) setProductsVerified(progress.productsVerified);
    }
  }, [products, progress]);

  // Helper function to initialize default inventory
  const initializeDefaultInventory = (products: any[]) => {
    const defaultInventory: Record<string, number> = {};
    products.forEach((p: any) => {
      defaultInventory[p.sku] = 0;
    });
    setInventory(defaultInventory);
  };

  // Helper function to extract size number from product name/SKU
  const extractSize = (product: any): number => {
    const match = product.name?.match(/(\d+)ct/i) || product.sku?.match(/(\d+)ct/i);
    return match ? parseInt(match[1]) : 0;
  };

  // Helper function to extract base product name (without size)
  const extractBaseName = (product: any): string => {
    // Remove size like "30ct - " or just get the product name
    return product.name?.replace(/^\d+ct\s*-\s*/i, '') || product.name || '';
  };

  // Separate samples (4ct) from full-size products and sort by featured, then name, then size
  const sampleProducts = useMemo(() => 
    products
      .filter(p => p.sku?.endsWith('-4'))
      .sort((a, b) => {
        // Featured products first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        // Then by name
        const nameA = extractBaseName(a);
        const nameB = extractBaseName(b);
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;
        
        // Then by size
        return extractSize(a) - extractSize(b);
      }),
    [products]
  );
  
  const fullSizeProducts = useMemo(() => 
    products
      .filter(p => !p.sku?.endsWith('-4'))
      .sort((a, b) => {
        // Featured products first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        // Then by name
        const nameA = extractBaseName(a);
        const nameB = extractBaseName(b);
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;
        
        // Then by size
        return extractSize(a) - extractSize(b);
      }),
    [products]
  );
  
  // Group full-size products by brand
  const productsByBrand = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    fullSizeProducts.forEach(product => {
      const brandName = product.brand?.name || 'Unknown Brand';
      if (!grouped[brandName]) {
        grouped[brandName] = [];
      }
      grouped[brandName].push(product);
    });
    return grouped;
  }, [fullSizeProducts]);

  const updateInventory = (sku: string, quantity: number) => {
    setInventory(prev => ({
      ...prev,
      [sku]: quantity
    }));
  };

  // Validation - require at least one sample and one product selected, AND all brands verified
  const isValid = useMemo(() => {
    const allBrandsVerified = Object.keys(productsByBrand).every(brandName => brandVerified[brandName]);
    return selectedSamples.length > 0 && selectedProducts.length > 0 && samplesVerified && allBrandsVerified;
  }, [selectedSamples, selectedProducts, samplesVerified, brandVerified, productsByBrand]);

  // Save inventory and selections to wizard progress
  useEffect(() => {
    if (displayId) {
      saveProgress({ 
        productInventory: inventory,
        selectedSamples,
        selectedProducts,
        samplesVerified,
        productsVerified: brandVerified, // Save verification state
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, selectedSamples, selectedProducts, samplesVerified, brandVerified]);

  async function handleActivate() {
    if (!isValid) {
      // Scroll to the first unverified section
      if (!samplesVerified) {
        samplesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setError('Please verify your samples inventory by clicking "Verify as Accurate" above');
      } else {
        const unverifiedBrand = Object.keys(productsByBrand).find(brandName => !brandVerified[brandName]);
        if (unverifiedBrand) {
          productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setError(`Please verify inventory for ${unverifiedBrand} by clicking "Verify as Accurate"`);
        } else {
          setError('Please select at least one sample and one product');
        }
      }
      
      // Clear error after 5 seconds
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Build payload from wizard progress
      // If adminSameAsOwner, copy owner data to admin fields
      const adminName = progress?.adminSameAsOwner ? progress?.ownerName : progress?.adminName;
      const adminPhone = progress?.adminSameAsOwner ? progress?.ownerPhone : progress?.adminPhone;
      const adminEmail = progress?.adminSameAsOwner ? progress?.ownerEmail : progress?.adminEmail;
      
      // If purchasingSameAsOwner, copy owner data to purchasing fields
      const purchasingManager = progress?.purchasingSameAsOwner ? progress?.ownerName : progress?.purchasingManager;
      const purchasingPhone = progress?.purchasingSameAsOwner ? progress?.ownerPhone : progress?.purchasingPhone;
      const purchasingEmail = progress?.purchasingSameAsOwner ? progress?.ownerEmail : progress?.purchasingEmail;
      
      // Convert inventory to the format API expects: { sku: { quantity, isPresale } }
      const productInventory: Record<string, { quantity: number; isPresale: boolean }> = {};
      Object.entries(inventory).forEach(([sku, qty]) => {
        productInventory[sku] = {
          quantity: qty,
          isPresale: qty === 0 && selectedProducts.includes(sku), // Presale if selected but no inventory
        };
      });
      
      const payload = {
        displayId,
        existingStoreId: progress?.existingStoreId || null, // Link to existing store if found
        storeName: progress?.storeName || '',
        adminName: adminName || '',
        adminEmail: adminEmail || '',
        adminPhone: adminPhone || '',
        address: progress?.address || '',
        city: progress?.city || '',
        state: toStateAbbreviation(progress?.state || ''),
        zip: progress?.zip || '',
        timezone: progress?.timezone || '',
        promoOffer: progress?.promoPercentage ? `${progress.promoPercentage}% Off In-Store Purchase` : '20% Off In-Store Purchase',
        returningCustomerPromo: progress?.returningPromoPercentage ? `${progress.returningPromoPercentage}% Off In-Store Purchase` : '10% Off In-Store Purchase',
        followupDays: selectedDays,
        postPurchaseFollowupDays: [45, 90], // Default followup at 45 and 90 days after purchase
        pin: progress?.pin || '',
        ownerName: progress?.ownerName || '',
        ownerPhone: progress?.ownerPhone || '',
        ownerEmail: progress?.ownerEmail || '',
        purchasingManager: purchasingManager || '',
        purchasingPhone: purchasingPhone || '',
        purchasingEmail: purchasingEmail || '',
        purchasingSameAsOwner: progress?.purchasingSameAsOwner || false,
        adminSameAsOwner: progress?.adminSameAsOwner || false,
        shopifyCustomerId: progress?.shopifyCustomerId || null, // For Shopify tagging
        availableSamples: selectedSamples, // Which samples are offered
        availableProducts: selectedProducts, // Which products are offered
        productInventory: productInventory, // Pass inventory to API for update/creation
        isNewLocation: progress?.isNewLocation, // Tell API if this is new or existing store
      };

      console.log('[ProductsStep] Activating display with payload:', payload);

      const res = await fetch('/api/displays/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to activate display');
      }

      const data = await res.json();
      console.log('[ProductsStep] ✅ Display activated:', data);

      // Navigate to next step (staff)
      router.push(`/setup/${displayId}/staff`);
    } catch (e: any) {
      console.error('[ProductsStep] Error activating display:', e);
      setError(e.message || 'Failed to activate display');
    } finally {
      setLoading(false);
    }
  }

  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <WizardLayout
      currentStep={8}
      totalSteps={10}
      stepLabel="Verify Products & Inventory"
      displayId={displayId}
      showNext={false}
      showBack={false}
      onBack={() => router.push(`/setup/${displayId}/activate`)}
    >
      <div className="pb-20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify Products & Inventory</h1>
          <p className="text-pink-200">Select which products to offer and update inventory levels</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Sample Products (4ct) */}
        <div ref={samplesRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-semibold text-lg mb-1">Available Samples (4ct)</h2>
              <p className="text-sm text-gray-600">
                {samplesVerified 
                  ? `Locked in ${selectedSamples.length} sample${selectedSamples.length !== 1 ? 's' : ''}`
                  : 'Select which samples to offer and update inventory'
                }
              </p>
            </div>
            <button
              onClick={() => setSamplesVerified(!samplesVerified)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                samplesVerified
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {samplesVerified ? '✓ Verified' : 'Verify as Accurate'}
            </button>
          </div>

          {samplesVerified ? (
            // Collapsed confirmed view
            selectedSamples.length === 0 ? (
              // No samples selected - warning state
              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">No Samples Offered</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      You've verified without selecting any samples. This display will not offer any sample products to customers.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
                      <p className="text-xs text-yellow-800">
                        💡 <strong>Tip:</strong> Offering samples is a great way to introduce customers to your products and drive sales.
                      </p>
                    </div>
                    <button
                      onClick={() => setSamplesVerified(false)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-semibold underline"
                    >
                      Click "✓ Verified" above to add samples
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Has samples selected - confirmed state
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">✅</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-emerald-900 mb-2">Samples Confirmed</h3>
                    <div className="space-y-1">
                      {selectedSamples.map(sku => {
                        const product = sampleProducts.find(p => p.sku === sku);
                        return product ? (
                          <div key={sku} className="flex items-center justify-between text-sm">
                            <span className="text-emerald-800 font-medium">{product.name}</span>
                            <span className="text-emerald-600">{inventory[sku] || 0} units</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                    <button
                      onClick={() => setSamplesVerified(false)}
                      className="mt-3 text-xs text-emerald-700 hover:text-emerald-800 underline"
                    >
                      Click "✓ Verified" above to make changes
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : sampleProducts.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No sample products available</div>
          ) : (
            <div className="space-y-3">
              {sampleProducts.map((product) => {
                const isSelected = selectedSamples.includes(product.sku);
                return (
                  <div 
                    key={product.sku} 
                    className={`relative rounded-2xl p-6 transition-all hover:shadow-md ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-100 via-blue-100 to-purple-100 border-4 border-purple-500 shadow-xl ring-4 ring-purple-200'
                        : 'bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 border border-gray-200'
                    }`}
                  >
                    {product.featured && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          ⭐ Featured
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Product Image */}
                      {product.imageUrl && (
                        <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Product Info & Controls */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base mb-1 text-gray-900">{product.name}</h3>
                            {product.description && (
                              <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                            )}
                            {product.category && (
                              <div className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mb-2">
                                {product.category}
                              </div>
                            )}
                            <p className="text-sm font-semibold text-gray-900 mt-1">${parseFloat(product.price || 0).toFixed(2)}</p>
                          </div>
                          
                          {/* Selection Button */}
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSamples(prev => prev.filter(sku => sku !== product.sku));
                              } else {
                                setSelectedSamples(prev => [...prev, product.sku]);
                              }
                            }}
                            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                : 'bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-200'
                            }`}
                          >
                            {isSelected ? 'Offering This Product' : '+ Offer This Product'}
                          </button>
                        </div>
                        
                        {/* Inventory Control */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Inventory:</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => updateInventory(product.sku, Math.max(0, (inventory[product.sku] || 0) - 1))}
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-bold text-gray-700 text-lg"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={inventory[product.sku] || 0}
                              onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                              className="w-20 h-10 px-3 border-2 border-gray-300 rounded-lg text-center font-bold text-lg"
                            />
                            <button
                              onClick={() => updateInventory(product.sku, (inventory[product.sku] || 0) + 1)}
                              className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-bold text-gray-700 text-lg"
                            >
                              +
                            </button>
                            <span className="text-sm text-gray-600">units on hand</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full-Size Products - Grouped by Brand */}
        <div ref={productsRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-lg mb-1">Full-Size Products</h2>
            <p className="text-sm text-gray-600">
              Select which products to offer for promotions and verify inventory for each brand
            </p>
          </div>

          {Object.keys(productsByBrand).length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
              <div>No full-size products available yet.</div>
              <div className="text-xs mt-2">You can add products later from your dashboard.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(productsByBrand).map(([brandName, brandProducts]) => {
                const brandKey = brandName;
                const isVerified = brandVerified[brandKey] || false;
                const brandSelectedProducts = brandProducts.filter(p => selectedProducts.includes(p.sku));
                
                return (
                  <div key={brandKey} className="border-2 border-indigo-200 rounded-lg overflow-hidden">
                    {/* Brand Header */}
                    <div className="bg-indigo-50 border-b-2 border-indigo-200 p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-indigo-900 text-lg">{brandName}</h3>
                        <p className="text-sm text-indigo-700">
                          {isVerified 
                            ? `✓ Verified - ${brandSelectedProducts.length} product${brandSelectedProducts.length !== 1 ? 's' : ''} selected`
                            : `${brandProducts.length} product${brandProducts.length !== 1 ? 's' : ''} available`
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (isVerified) {
                            setBrandVerified(prev => ({ ...prev, [brandKey]: false }));
                          } else {
                            setBrandVerified(prev => ({ ...prev, [brandKey]: true }));
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                          isVerified
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {isVerified ? '✓ Verified' : 'Verify as Accurate'}
                      </button>
                    </div>
                    
                    {/* Brand Products */}
                    {isVerified ? (
                      // Collapsed verified view
                      <div className="p-4 bg-emerald-50">
                        {brandSelectedProducts.length === 0 ? (
                          <div className="text-sm text-emerald-700">
                            No products selected for this brand
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {brandSelectedProducts.map(product => (
                              <div key={product.sku} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                                <span className="text-gray-900 font-medium">{product.name}</span>
                                <span className="text-gray-600">{inventory[product.sku] || 0} units</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      // Expanded editing view
                      <div className="p-4 space-y-3 bg-white">
                        {brandProducts.map((product) => {
                          const isSelected = selectedProducts.includes(product.sku);
                          return (
                            <div 
                              key={product.sku} 
                              className={`relative rounded-lg p-4 transition-all ${
                                isSelected
                                  ? 'bg-indigo-50 border-2 border-indigo-400'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row items-start gap-4">
                                {/* Product Image */}
                                {product.imageUrl && (
                                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                
                                {/* Product Info & Controls */}
                                <div className="flex-1 min-w-0 w-full">
                                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-base text-gray-900">{product.name}</h4>
                                      {product.description && (
                                        <p className="text-xs text-gray-600 mt-1">{product.description}</p>
                                      )}
                                      <p className="text-sm font-semibold text-gray-900 mt-1">${parseFloat(product.price).toFixed(2)}</p>
                                    </div>
                                    
                                    {/* Selection Button */}
                                    <button
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedProducts(prev => prev.filter(sku => sku !== product.sku));
                                        } else {
                                          setSelectedProducts(prev => [...prev, product.sku]);
                                        }
                                      }}
                                      className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                      }`}
                                    >
                                      {isSelected ? '✓ Offering' : '+ Offer'}
                                    </button>
                                  </div>
                                  
                                  {/* Inventory Control */}
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <label className="text-sm font-semibold text-gray-700">Inventory:</label>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => updateInventory(product.sku, Math.max(0, (inventory[product.sku] || 0) - 1))}
                                        className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-100 font-bold text-gray-700"
                                      >
                                        −
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={inventory[product.sku] || 0}
                                        onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                                        className="w-16 h-8 px-2 border border-gray-300 rounded text-center font-semibold"
                                      />
                                      <button
                                        onClick={() => updateInventory(product.sku, (inventory[product.sku] || 0) + 1)}
                                        className="w-8 h-8 rounded border border-gray-300 hover:bg-gray-100 font-bold text-gray-700"
                                      >
                                        +
                                      </button>
                                      <span className="text-xs text-gray-600">units</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6">
          {/* Validation hint */}
          {!isValid && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">⚠️</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    Please verify your inventory before continuing
                  </p>
                  <p className="text-xs text-yellow-800">
                    {!samplesVerified ? (
                      <>Click "Verify as Accurate" on the Available Samples section above.</>
                    ) : Object.keys(productsByBrand).some(brandName => !brandVerified[brandName]) ? (
                      <>Click "Verify as Accurate" on each brand's product section above.</>
                    ) : (
                      <>Please select at least one sample and one product to offer.</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push(`/setup/${displayId}/activate`)}
              className="w-full py-3 rounded-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 transition-all"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={loading || !isValid}
              onClick={handleActivate}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                loading || !isValid
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/50'
              }`}
            >
              {loading ? 'Activating...' : 'Next: Add Staff →'}
            </button>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
