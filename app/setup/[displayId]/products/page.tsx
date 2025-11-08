'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

export default function ProductsStep({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress } = useWizardProgress(displayId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  
  // Inventory state for each product (SKU -> quantity)
  const [inventory, setInventory] = useState<Record<string, number>>({});
  
  // Selected samples (4ct) - which ones to make available
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  
  // Selected full-size products - which ones to offer for promos
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const selectedDays = [7, 14, 30]; // Default followup days

  // Fetch products and initialize state
  useEffect(() => {
    params.then(async (p) => {
      setDisplayId(p.displayId);

      try {
        // Get orgId directly from the display (it's assigned when display ships)
        const displayRes = await fetch(`/api/displays/${p.displayId}/info`);
        if (!displayRes.ok) {
          console.error('[ProductsStep] Failed to fetch display', displayRes.status);
          setError('Failed to load display information');
          return;
        }
        
        const displayData = await displayRes.json();
        const orgId = displayData.orgId;
        
        if (!orgId) {
          console.error('[ProductsStep] Display has no orgId assigned');
          setError('Display is not assigned to an organization');
          return;
        }
        
        console.log('[ProductsStep] Using orgId from display:', orgId);
        
        // Fetch retail products for this organization
        const productsRes = await fetch(`/api/products?orgId=${orgId}&productType=retail`);
        if (productsRes.ok) {
          const data = await productsRes.json();
          const all = Array.isArray(data.products) ? data.products : [];
          // Filter to only active retail products
          const filtered = all.filter((p: any) => {
            if (p && p.active === false) return false;
            if (typeof p?.productType === 'string' && p.productType !== 'retail') return false;
            return true;
          });
          setProducts(filtered);

          // Initialize inventory from existing store or saved progress
          if (progress?.existingStoreId) {
            console.log('📦 Fetching existing inventory for store:', progress.existingStoreId);
            // Fetch existing inventory from the store
            try {
              const invRes = await fetch(`/api/store/inventory?storeId=${progress.existingStoreId}`);
              if (invRes.ok) {
                const invData = await invRes.json();
                console.log('✅ Loaded existing inventory:', invData);
                
                // Convert inventory array to our format
                const existingInv: Record<string, number> = {};
                const existingSamples: string[] = [];
                const existingProducts: string[] = [];
                
                invData.inventory?.forEach((item: any) => {
                  existingInv[item.productSku] = item.quantityOnHand || 0;
                });
                
                // Also get existing availableSamples and availableProducts from store
                if (invData.store) {
                  if (invData.store.availableSamples) {
                    existingSamples.push(...invData.store.availableSamples);
                  }
                  if (invData.store.availableProducts) {
                    existingProducts.push(...invData.store.availableProducts);
                  }
                }
                
                // Initialize for all products (existing + missing)
                filtered.forEach((p: any) => {
                  if (!existingInv[p.sku]) {
                    existingInv[p.sku] = 0;
                  }
                });
                
                setInventory(existingInv);
                setSelectedSamples(existingSamples);
                setSelectedProducts(existingProducts);
              } else {
                console.log('⚠️ Could not fetch existing inventory, initializing to 0');
                initializeDefaultInventory(filtered);
              }
            } catch (err) {
              console.error('[ProductsStep] Error fetching existing inventory:', err);
              initializeDefaultInventory(filtered);
            }
          } else if (progress?.productInventory) {
            console.log('💾 Loading inventory from saved progress');
            // Handle both formats: simple numbers or { quantity, isPresale } objects
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
          } else {
            console.log('🆕 Initializing new inventory');
            initializeDefaultInventory(filtered);
          }
        } else {
          console.error('[ProductsStep] Failed to fetch products', productsRes.status);
        }
      } catch (e) {
        console.error('[ProductsStep] Error fetching products', e);
      }
    });
  }, []);

  // Helper function to initialize default inventory
  const initializeDefaultInventory = (products: any[]) => {
    const defaultInventory: Record<string, number> = {};
    products.forEach((p: any) => {
      defaultInventory[p.sku] = 0;
    });
    setInventory(defaultInventory);
  };

  // Separate samples (4ct) from full-size products
  const sampleProducts = useMemo(() => 
    products.filter(p => p.sku?.endsWith('-4')),
    [products]
  );
  
  const fullSizeProducts = useMemo(() => 
    products.filter(p => !p.sku?.endsWith('-4')),
    [products]
  );

  const updateInventory = (sku: string, quantity: number) => {
    setInventory(prev => ({
      ...prev,
      [sku]: quantity
    }));
  };

  // Validation - require at least one sample and one product selected
  const isValid = useMemo(() => {
    return selectedSamples.length > 0 && selectedProducts.length > 0;
  }, [selectedSamples, selectedProducts]);

  // Save inventory and selections to wizard progress
  useEffect(() => {
    if (displayId) {
      saveProgress({ 
        productInventory: inventory,
        selectedSamples,
        selectedProducts,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, selectedSamples, selectedProducts]);

  async function handleActivate() {
    if (!isValid) {
      setError('Please select at least one sample and one product');
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
        state: progress?.state || '',
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

      // Navigate to next step (add staff)
      router.push(`/setup/${displayId}/add-staff`);
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <div className="mb-4">
            <h2 className="font-semibold text-lg mb-1">Available Samples (4ct)</h2>
            <p className="text-sm text-gray-600">Select which samples to offer and update inventory</p>
          </div>

          {sampleProducts.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No sample products available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sampleProducts.map((product) => {
                const isSelected = selectedSamples.includes(product.sku);
                return (
                  <div key={product.sku} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {product.imageUrl && (
                      <div className="aspect-square bg-gray-100">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                      <p className="text-xs text-gray-500 mb-3">SKU: {product.sku}</p>
                      
                      {/* Inventory Input */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 block mb-1">Inventory on Hand</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateInventory(product.sku, Math.max(0, (inventory[product.sku] || 0) - 1))}
                            className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 font-bold text-gray-600"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={inventory[product.sku] || 0}
                            onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                            className="flex-1 px-3 py-2 border rounded-lg text-center font-semibold"
                          />
                          <button
                            onClick={() => updateInventory(product.sku, (inventory[product.sku] || 0) + 1)}
                            className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 font-bold text-gray-600"
                          >
                            +
                          </button>
                        </div>
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
                        className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-pink-50 text-pink-600 border-2 border-pink-200 hover:bg-pink-100'
                        }`}
                      >
                        {isSelected ? '✓ Offering' : '+ Offer This Product'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full-Size Products */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-lg mb-1">Full-Size Products</h2>
            <p className="text-sm text-gray-600">Select which products to offer for promotions and update inventory</p>
          </div>

          {fullSizeProducts.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
              <div>No full-size products available yet.</div>
              <div className="text-xs mt-2">You can add products later from your dashboard.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fullSizeProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.sku);
                  return (
                    <div key={product.sku} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      {product.imageUrl && (
                        <div className="aspect-square bg-gray-100">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-sm flex-1">{product.name}</h3>
                          {product.featured && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold ml-2">⭐</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">SKU: {product.sku}</p>
                        <p className="text-xs text-gray-700 font-semibold mb-3">${parseFloat(product.price).toFixed(2)}</p>
                        
                        {/* Inventory Input */}
                        <div className="mb-3">
                          <label className="text-xs font-medium text-gray-700 block mb-1">Inventory on Hand</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateInventory(product.sku, Math.max(0, (inventory[product.sku] || 0) - 1))}
                              className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 font-bold text-gray-600"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={inventory[product.sku] || 0}
                              onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                              className="flex-1 px-3 py-2 border rounded-lg text-center font-semibold"
                            />
                            <button
                              onClick={() => updateInventory(product.sku, (inventory[product.sku] || 0) + 1)}
                              className="w-8 h-8 rounded-lg border border-gray-300 hover:bg-gray-50 font-bold text-gray-600"
                            >
                              +
                            </button>
                          </div>
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
                          className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-pink-50 text-pink-600 border-2 border-pink-200 hover:bg-pink-100'
                          }`}
                        >
                          {isSelected ? '✓ Offering' : '+ Offer This Product'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 You can offer products with zero inventory - they'll be available for presale
              </p>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
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
    </WizardLayout>
  );
}
