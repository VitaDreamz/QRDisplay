'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress, type WizardProgress } from '@/hooks/useWizardProgress';
import { SAMPLE_OPTIONS } from '@/lib/constants';

export default function ProductsStep({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress, clearProgress } = useWizardProgress(displayId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [availableSamples, setAvailableSamples] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);

  // Fetch products and initialize state
  useEffect(() => {
    params.then(async (p) => {
      setDisplayId(p.displayId);

      // Initialize from saved progress or default to none selected
      const initialSamples = progress?.availableSamples ?? [];
      setAvailableSamples(initialSamples);
      try {
        // First, get the display to find its orgId
        const displayRes = await fetch(`/api/displays/${p.displayId}`);
        if (!displayRes.ok) {
          console.error('[ProductsStep] Failed to fetch display', displayRes.status);
          return;
        }
        const displayData = await displayRes.json();
        const orgId = displayData.display?.orgId || 'ORG-VITADREAMZ';
        
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

          // Initialize products selection: from saved progress or none selected by default
          if (progress?.availableProducts && progress.availableProducts.length > 0) {
            setAvailableProducts(progress.availableProducts);
          } else {
            setAvailableProducts([]);
          }
        } else {
          console.error('[ProductsStep] Failed to fetch products', productsRes.status);
        }
      } catch (e) {
        console.error('[ProductsStep] Error fetching products', e);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleToggleSample = (value: string, checked: boolean) => {
    setAvailableSamples((prev) => checked ? [...prev, value] : prev.filter(v => v !== value));
  };

  const isValid = useMemo(() => {
    return availableSamples.length > 0 && availableProducts.length > 0;
  }, [availableSamples, availableProducts]);

  const handleActivate = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('📋 Current wizard progress:', progress);
      console.log('📋 Full progress object:', JSON.stringify(progress, null, 2));
      
      // Convert followupDays from object to array of day numbers
      const selectedDays = progress?.followupDays 
        ? Object.entries(progress.followupDays)
            .filter(([_, checked]) => checked)
            .map(([day]) => parseInt(day.replace('day', '')))
        : [];

      console.log('📅 Selected followup days:', selectedDays);

      // Build payload from wizard progress
      // If adminSameAsOwner, copy owner data to admin fields
      const adminName = progress?.adminSameAsOwner ? progress?.ownerName : progress?.adminName;
      const adminPhone = progress?.adminSameAsOwner ? progress?.ownerPhone : progress?.adminPhone;
      const adminEmail = progress?.adminSameAsOwner ? progress?.ownerEmail : progress?.adminEmail;
      
      // If purchasingSameAsOwner, copy owner data to purchasing fields
      const purchasingManager = progress?.purchasingSameAsOwner ? progress?.ownerName : progress?.purchasingManager;
      const purchasingPhone = progress?.purchasingSameAsOwner ? progress?.ownerPhone : progress?.purchasingPhone;
      const purchasingEmail = progress?.purchasingSameAsOwner ? progress?.ownerEmail : progress?.purchasingEmail;
      
      const payload = {
        displayId,
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
        availableSamples,
        availableProducts,
      };
      
      console.log('🚀 Sending activation payload:', payload);
      console.log('📋 shopifyCustomerId from progress:', progress?.shopifyCustomerId);
      
      const response = await fetch('/api/displays/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const errorMsg = data.error || `Activation failed (${response.status})`;
        console.error('[Activation Error]', errorMsg, data);
        setError(errorMsg);
        setLoading(false);
        return;
      }
      // On success, go to staff page (step 8)
      const result = await response.json();
      console.log('[Activation Success]', result);
      
      // Save store ID and go to staff page
      const storeId = result.storeId;
      saveProgress({ currentStep: 9 });
      router.push(`/setup/${displayId}/staff?storeId=${storeId}`);
    } catch (e) {
      console.error('[Activation Exception]', e);
      setError(e instanceof Error ? e.message : 'Activation failed.');
      setLoading(false);
    }
  }
  useEffect(() => {
    if (displayId) saveProgress({ availableProducts });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableProducts]);

  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-600">Loading...</div></div>;
  }

  return (
    <WizardLayout
      currentStep={8}
      totalSteps={10}
      stepLabel="Products"
      displayId={displayId}
      showNext={false}
      showBack={false}
    >
      <div className="pb-20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧪🛍️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Choose Samples & Products</h1>
          <p className="text-pink-200">Select at least one sample and one full-size product offering</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        {/* Sample Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-lg mb-4">Available Samples</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select which samples you have available to hand out. You can always request the other samples later.
          </p>
          <div className="space-y-2">
            {SAMPLE_OPTIONS.map((sample) => (
              <label key={sample.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={availableSamples.includes(sample.value)}
                  onChange={(e) => handleToggleSample(sample.value, e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600"
                />
                <div className="text-sm">
                  <div className="font-medium">{sample.label.split(' - ')[0]}</div>
                  <div className="text-gray-500">{sample.label.split(' - ')[1]}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <h2 className="font-semibold text-lg mb-4">Available Products for Purchase</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select the Full Size Products you would like to offer to your customers. If customer is interested, you will be notified before they come in which product they would like to buy.
          </p>

          {products.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
              <div>No products available yet.</div>
              <div className="text-xs mt-2">You can add products later from your dashboard.</div>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {products.map((product) => (
                <label key={product.sku} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={availableProducts.includes(product.sku)}
                    onChange={(e) => {
                      setAvailableProducts((prev) => e.target.checked
                        ? Array.from(new Set([...prev, product.sku]))
                        : prev.filter(s => s !== product.sku)
                      );
                    }}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600"
                  />
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                  )}
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{product.name}</span>
                      {product.featured && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">⭐ Featured</span>
                      )}
                    </div>
                    {product.description && (
                      <div className="text-gray-600 mt-0.5">{product.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {product.category && (
                        <span className="text-xs text-gray-500">{product.category}</span>
                      )}
                      <span className="text-xs font-semibold text-gray-900">${parseFloat(product.price).toFixed(2)}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3">
            💡 You can manage your product offerings later from your store dashboard
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push(`/setup/${displayId}/activate`)}
            className="w-full py-3 rounded-lg font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
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
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg'
            }`}
          >
            {loading ? 'Activating...' : 'Next: Add Staff →'}
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
