'use client';

import { useEffect, useState } from 'react';

type StoreInfo = {
  storeName: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  adminPhone: string | null;
};

export default function PromoRedemptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [promoOffer, setPromoOffer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ storeName: string; promoOffer: string; customerName: string; productName: string } | null>(null);
  const [discountPercent, setDiscountPercent] = useState(20);

  useEffect(() => {
    (async () => {
      const p = await params;
      setSlug(p.slug);
      try {
        const res = await fetch(`/api/promos/${p.slug}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setError(json.error || 'Invalid promo link');
        } else if (json.expired) {
          setError('Promo link expired');
        } else if (json.used) {
          setError('Promo already redeemed');
        } else {
          setStoreName(json.storeName || 'the store');
          const offer = json.promoOffer || '20% off first purchase';
          setPromoOffer(offer);
          
          // Extract discount percentage from promo offer (e.g., "20% Off" -> 20)
          const discountMatch = offer.match(/(\d+)%/);
          const discount = discountMatch ? parseInt(discountMatch[1]) : 20;
          setDiscountPercent(discount);
          
          setCustomerName(json.customerName || 'Customer');
          setStoreInfo(json.store || null);
          
          // Calculate discounted prices for each product
          const productsWithPricing = (json.products || []).map((p: any) => {
            const originalPrice = p.msrp || p.price;
            const finalPrice = originalPrice * (1 - discount / 100);
            const savings = originalPrice - finalPrice;
            return {
              ...p,
              originalPrice: parseFloat(originalPrice.toFixed(2)),
              finalPrice: parseFloat(finalPrice.toFixed(2)),
              savings: parseFloat(savings.toFixed(2))
            };
          });
          setProducts(productsWithPricing);
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  async function handleRequestRedeem() {
    if (submitting || !selectedProduct) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/purchase-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug,
          productSku: selectedProduct.sku,
          originalPrice: selectedProduct.originalPrice,
          discountPercent,
          finalPrice: selectedProduct.finalPrice
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not create purchase request');
        setSubmitting(false);
        return;
      }
      setSuccess({
        storeName,
        promoOffer,
        customerName,
        productName: selectedProduct.name || ''
      });
    } catch (e) {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

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

  if (success) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <span className="text-3xl text-emerald-500">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2b2b2b] mb-2">Request Submitted!</h1>
          <p className="text-base mt-2 text-[#2b2b2b]">The store has been notified and will send you a text when your order is ready to be completed in store (typically 1-5 business days).</p>
          <div className="mt-4 text-left text-[#2b2b2b]">
            <div><span className="font-semibold">Store:</span> {success.storeName}</div>
            <div><span className="font-semibold">Customer:</span> {success.customerName}</div>
            <div><span className="font-semibold">Offer:</span> {success.promoOffer}</div>
            <div><span className="font-semibold">Product:</span> {success.productName}</div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to format phone for display
  function formatPhoneForDisplay(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }

  // Google Maps URL
  const googleMapsUrl = storeInfo?.streetAddress && storeInfo?.city && storeInfo?.state && storeInfo?.zipCode
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${storeInfo.streetAddress}, ${storeInfo.city}, ${storeInfo.state} ${storeInfo.zipCode}`
      )}`
    : null;

  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5 py-8">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#2b2b2b] mb-2">{customerName}'s Promo</h1>
          <p className="text-[#6b6b6b]">at {storeName}</p>
        </div>

        {/* Store Location Card */}
        {storeInfo && (
          <div className="bg-white border-2 border-purple-200 rounded-xl p-5 mb-4 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">{storeInfo.storeName}</h3>
                {googleMapsUrl ? (
                  <a 
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline text-sm block"
                  >
                    {storeInfo.streetAddress}<br/>
                    {storeInfo.city}, {storeInfo.state} {storeInfo.zipCode}
                    <span className="block mt-1 text-xs text-purple-600">🗺️ Open in Maps →</span>
                  </a>
                ) : (
                  <div className="text-sm text-gray-600">
                    {storeInfo.streetAddress && <div>{storeInfo.streetAddress}</div>}
                    {storeInfo.city && storeInfo.state && storeInfo.zipCode && (
                      <div>{storeInfo.city}, {storeInfo.state} {storeInfo.zipCode}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {storeInfo.adminPhone && (
              <a 
                href={`tel:${storeInfo.adminPhone}`}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-lg min-h-[44px]"
              >
                📞 {formatPhoneForDisplay(storeInfo.adminPhone)}
              </a>
            )}
          </div>
        )}

        {/* Promo Offer Card */}
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-purple-800 mb-2">YOUR OFFER</h3>
          <p className="text-3xl font-bold text-purple-600 mb-2">{promoOffer}</p>
          <p className="text-sm text-gray-600">
            Select a product below to request this promo.
          </p>
        </div>

        {/* Product Cards */}
        <div className="mb-6">
          <h3 className="font-semibold text-[#2b2b2b] mb-3">Choose Your Product</h3>
          <div className="flex flex-col gap-3">
            {products.length === 0 && <div className="text-gray-500 text-center py-4">No products available for this promo.</div>}
            {products.map((product) => (
              <button
                key={product.sku}
                type="button"
                className={`w-full text-left border-2 rounded-xl p-4 transition-all ${
                  selectedProduct?.sku === product.sku 
                    ? 'border-purple-600 bg-purple-50 shadow-md' 
                    : 'border-gray-200 bg-white'
                } hover:border-purple-400 active:scale-[0.98]`}
                onClick={() => setSelectedProduct(product)}
                disabled={submitting}
              >
                <div className="flex gap-3 items-center">
                  {/* Product Image */}
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  )}
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base mb-1">{product.name}</div>
                    {product.description && (
                      <div className="text-xs text-gray-600 mb-2 line-clamp-1">{product.description}</div>
                    )}
                    
                    {/* Pricing */}
                    <div className="flex items-baseline gap-2">
                      <div className="text-xs text-gray-500 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </div>
                      <div className="text-xl font-bold text-emerald-600">
                        ${product.finalPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      Save ${product.savings.toFixed(2)} ({discountPercent}% off)
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  {selectedProduct?.sku === product.sku && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Request to Redeem Promo Button */}
        <button
          className="w-full h-14 text-lg font-semibold bg-purple-600 text-white rounded-xl active:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={submitting || !selectedProduct}
          onClick={handleRequestRedeem}
        >
          {submitting ? 'Requesting…' : selectedProduct ? `Request to Redeem Promo for ${selectedProduct.name}` : 'Select a Product'}
        </button>
        {error && (
          <div className="text-red-600 text-sm text-center mt-2">{error}</div>
        )}
      </div>
    </div>
  );
}
