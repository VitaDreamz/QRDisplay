'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

type BrandPartnership = {
  id: string;
  brandId: string;
  brandOrgId: string;
  brandName: string;
  brandSlug: string;
  brandLogoUrl?: string;
  availableSamples: string[];
  availableProducts: string[];
  products: {
    samples: any[];
    fullSize: any[];
  };
};

export default function ProductsStepMultiBrand({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress } = useWizardProgress(displayId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [brandPartnerships, setBrandPartnerships] = useState<BrandPartnership[]>([]);
  
  // Inventory state for each product (SKU -> quantity)
  const [inventory, setInventory] = useState<Record<string, number>>({});
  
  // Product offering state per brand (brandId -> { samples: [], products: [] })
  const [offerings, setOfferings] = useState<Record<string, { samples: string[]; products: string[] }>>({});
  
  // Verification state
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setDisplayId(p.displayId);
    });
  }, [params]);

  // Fetch brand partnerships and products when we have a store
  useEffect(() => {
    if (!displayId || !progress?.existingStoreId) return;

    (async () => {
      setLoading(true);
      try {
        // Fetch store's brand partnerships with products
        const res = await fetch(`/api/stores/${progress.existingStoreId}/partnerships`);
        if (!res.ok) {
          setError('Failed to load brand partnerships');
          return;
        }

        const data = await res.json();
        setBrandPartnerships(data.partnerships || []);

        // Initialize inventory and offerings from existing data
        const initialInventory: Record<string, number> = {};
        const initialOfferings: Record<string, { samples: string[]; products: string[] }> = {};

        data.partnerships?.forEach((partnership: BrandPartnership) => {
          // Initialize offerings for this brand
          initialOfferings[partnership.brandId] = {
            samples: [...partnership.availableSamples],
            products: [...partnership.availableProducts],
          };

          // Initialize inventory for all products
          [...partnership.products.samples, ...partnership.products.fullSize].forEach((product: any) => {
            initialInventory[product.sku] = product.quantityOnHand || 0;
          });
        });

        setInventory(initialInventory);
        setOfferings(initialOfferings);
      } catch (err) {
        console.error('Error fetching partnerships:', err);
        setError('Failed to load brand partnerships');
      } finally {
        setLoading(false);
      }
    })();
  }, [displayId, progress?.existingStoreId]);

  // Save changes to progress
  useEffect(() => {
    if (displayId) {
      saveProgress({
        productInventory: inventory,
        brandOfferings: offerings,
        productsVerified: verified,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventory, offerings, verified]);

  const toggleSampleOffering = (brandId: string, sku: string) => {
    setOfferings((prev) => {
      const brandOffering = prev[brandId] || { samples: [], products: [] };
      const samples = brandOffering.samples.includes(sku)
        ? brandOffering.samples.filter((s) => s !== sku)
        : [...brandOffering.samples, sku];
      
      return {
        ...prev,
        [brandId]: { ...brandOffering, samples },
      };
    });
  };

  const toggleProductOffering = (brandId: string, sku: string) => {
    setOfferings((prev) => {
      const brandOffering = prev[brandId] || { samples: [], products: [] };
      const products = brandOffering.products.includes(sku)
        ? brandOffering.products.filter((p) => p !== sku)
        : [...brandOffering.products, sku];
      
      return {
        ...prev,
        [brandId]: { ...brandOffering, products },
      };
    });
  };

  const updateInventory = (sku: string, quantity: number) => {
    setInventory((prev) => ({ ...prev, [sku]: quantity }));
  };

  const handleContinue = async () => {
    if (!verified) {
      setError('Please verify your inventory is accurate before continuing');
      return;
    }

    setLoading(true);
    try {
      // Save inventory and offerings to database
      const res = await fetch(`/api/stores/${progress?.existingStoreId}/partnerships/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory,
          offerings,
        }),
      });

      if (!res.ok) {
        setError('Failed to save product selections');
        return;
      }

      // Continue to staff step
      saveProgress({ currentStep: 9 });
      router.push(`/setup/${displayId}/staff`);
    } catch (err) {
      console.error('Error saving:', err);
      setError('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const getBrandColor = (brandName: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'VitaDreamz Slumber': { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      'VitaDreamz Bliss': { bg: 'bg-pink-100', text: 'text-pink-800' },
      'VitaDreamz Chill': { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    };
    return colors[brandName] || { bg: 'bg-purple-100', text: 'text-purple-800' };
  };

  if (loading && brandPartnerships.length === 0) {
    return (
      <WizardLayout
        currentStep={8}
        totalSteps={10}
        title="Loading Products..."
        displayId={displayId}
      >
        <div className="text-center text-gray-600">Loading your brand partnerships and products...</div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      currentStep={8}
      totalSteps={10}
      title="Verify Products & Inventory"
      displayId={displayId}
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Review Your Products</h3>
          <p className="text-sm text-blue-800">
            Your brand partnerships and products were pre-configured during onboarding. 
            Review the list below, update inventory counts to match what you have in stock, 
            and toggle any products you don't want to offer.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Brand Partnerships */}
        {brandPartnerships.map((partnership) => {
          const brandColor = getBrandColor(partnership.brandName);
          const brandOffering = offerings[partnership.brandId] || { samples: [], products: [] };

          return (
            <div key={partnership.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Brand Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-4">
                  {partnership.brandLogoUrl && (
                    <img 
                      src={partnership.brandLogoUrl} 
                      alt={partnership.brandName}
                      className="w-12 h-12 object-contain bg-white rounded-lg p-1"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{partnership.brandName}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${brandColor.bg} ${brandColor.text}`}>
                      Partner Brand
                    </span>
                  </div>
                </div>
              </div>

              {/* Samples Section */}
              {partnership.products.samples.length > 0 && (
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Samples (FREE for customers)</h4>
                  <div className="space-y-2">
                    {partnership.products.samples.map((product: any) => {
                      const isOffered = brandOffering.samples.includes(product.sku);
                      const qty = inventory[product.sku] || 0;

                      return (
                        <div
                          key={product.sku}
                          className={`border rounded-lg p-4 transition-all ${
                            isOffered ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                  <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded" />
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-600">SKU: {product.sku}</div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Inventory Input */}
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Qty on Hand</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </div>

                              {/* Offer Toggle */}
                              <button
                                onClick={() => toggleSampleOffering(partnership.brandId, product.sku)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  isOffered
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {isOffered ? '✓ Offering' : 'Not Offering'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full-Size Products Section */}
              {partnership.products.fullSize.length > 0 && (
                <div className="px-6 py-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Full-Size Products (Promo Pricing)</h4>
                  <div className="space-y-2">
                    {partnership.products.fullSize.map((product: any) => {
                      const isOffered = brandOffering.products.includes(product.sku);
                      const qty = inventory[product.sku] || 0;

                      return (
                        <div
                          key={product.sku}
                          className={`border rounded-lg p-4 transition-all ${
                            isOffered ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                {product.imageUrl && (
                                  <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded" />
                                )}
                                <div>
                                  <div className="font-medium text-gray-900">{product.name}</div>
                                  <div className="text-sm text-gray-600">
                                    SKU: {product.sku} • ${Number(product.price).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Inventory Input */}
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Qty on Hand</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => updateInventory(product.sku, parseInt(e.target.value) || 0)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                              </div>

                              {/* Offer Toggle */}
                              <button
                                onClick={() => toggleProductOffering(partnership.brandId, product.sku)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  isOffered
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {isOffered ? '✓ Offering' : 'Not Offering'}
                              </button>
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

        {/* Verification */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="w-5 h-5 text-green-600 rounded"
            />
            <span className="font-medium text-gray-900">
              I verify that the inventory counts above are accurate
            </span>
          </label>
        </div>

        {/* Continue Button */}
        <div className="flex justify-between pt-4">
          <button
            onClick={() => router.push(`/setup/${displayId}/activate`)}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
          >
            ← Back
          </button>
          <button
            onClick={handleContinue}
            disabled={!verified || loading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue to Staff Setup →'}
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
