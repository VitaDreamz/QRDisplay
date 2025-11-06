'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Product = {
  sku: string;
  name: string;
  description: string | null;
  price: number;
  msrp: number | null;
  imageUrl: string | null;
};

type PromoData = {
  storeName: string;
  promoOffer: string;
  discountPercent: number;
  customerName: string;
  products: Product[];
};

export default function PromoProductSelectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    const [promoData, setPromoData] = useState<PromoData | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setSlug(p.slug);
      
      try {
        // Fetch promo details and available products
        const res = await fetch(`/api/promos/${p.slug}/products`, { cache: 'no-store' });
        const json = await res.json();
        
        if (!res.ok || !json.ok) {
          setError(json.error || 'Invalid promo link');
        } else if (json.expired) {
          setError('Promo link expired');
        } else if (json.used) {
          setError('Promo already redeemed');
        } else {
          setPromoData(json);
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || submitting) return;
    
    setSubmitting(true);
    setError(null);

    try {
  const product = promoData!.products.find((p: Product) => p.sku === selectedProduct)!;
      const originalPrice = product.msrp || product.price;
      const discountPercent = promoData!.discountPercent;
      const finalPrice = originalPrice * (1 - discountPercent / 100);

      const res = await fetch('/api/purchase-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoSlug: slug,
          productSku: selectedProduct,
          originalPrice,
          discountPercent,
          finalPrice
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.purchaseIntent) {
        setError(json.error || 'Failed to submit request');
        setSubmitting(false);
        return;
      }

      // Success - show confirmation
      router.push(`/promo/${slug}/confirmed`);
    } catch (e) {
      setError('Network error');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500">
        <div className="text-white">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[#2b2b2b] mb-2">Issue with Promo</h1>
          <p className="text-[#6b6b6b]">{error}</p>
        </div>
      </div>
    );
  }

  if (!promoData) {
    return null;
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-700 to-purple-500 px-5 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 mb-6 text-center">
          <h1 className="text-3xl font-bold text-[#2b2b2b] mb-2">{promoData.customerName}'s Offer</h1>
          <p className="text-lg text-[#6b6b6b] mb-4">at {promoData.storeName}</p>
          <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-600">{promoData.promoOffer}</p>
          </div>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#2b2b2b] mb-2">Which Product Would You Like to Purchase?</h2>
          <p className="text-sm text-[#6b6b6b] mb-6">
            Select the full-size product you're interested in. {promoData.storeName} will be notified and contact you when your order is ready (typically within 1-3 business days).
          </p>

          {promoData.products.length === 0 ? (
            <div className="text-center py-8 text-[#6b6b6b]">
              No products currently available. Please contact the store directly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                {promoData.products.map((product: Product) => {
                  const originalPrice = product.msrp || product.price;
                  const finalPrice = originalPrice * (1 - promoData.discountPercent / 100);
                  const savings = originalPrice - finalPrice;
                  const isSelected = selectedProduct === product.sku;

                  return (
                    <label
                      key={product.sku}
                      className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="product"
                        value={product.sku}
                        checked={isSelected}
                        onChange={() => setSelectedProduct(product.sku)}
                        className="mt-1 h-5 w-5 text-purple-600"
                      />
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg border"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-[#2b2b2b]">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-[#6b6b6b] mt-1">{product.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <div className="text-sm text-gray-500 line-through">
                            ${originalPrice.toFixed(2)}
                          </div>
                          <div className="text-xl font-bold text-purple-600">
                            ${finalPrice.toFixed(2)}
                          </div>
                          <div className="text-sm font-semibold text-emerald-600">
                            Save ${savings.toFixed(2)}!
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!selectedProduct || submitting}
                className="w-full py-4 text-lg font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Request…' : 'Request This Product'}
              </button>

              <p className="text-xs text-center text-[#6b6b6b] mt-3">
                By submitting, you agree to be contacted by {promoData.storeName} when your order is ready.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
