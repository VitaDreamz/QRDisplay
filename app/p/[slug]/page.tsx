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
  const [isDirect, setIsDirect] = useState(false); // Direct purchase flow
  const [staffPin, setStaffPin] = useState(''); // For direct purchases
  const [showPinEntry, setShowPinEntry] = useState(false);

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
          setIsDirect(json.isDirect || false);
          
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
          
          // For direct purchases, pre-select the product
          if (json.isDirect && json.selectedProductSku) {
            const preselected = productsWithPricing.find((p: any) => p.sku === json.selectedProductSku);
            if (preselected) {
              setSelectedProduct(preselected);
              setShowPinEntry(true); // Go straight to PIN entry
            }
          }
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

  async function handleDirectPurchase() {
    if (submitting || !selectedProduct || !staffPin) return;
    
    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(staffPin)) {
      setError('Please enter a valid 4-digit PIN');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/promos/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slug,
          pin: staffPin,
          productSku: selectedProduct.sku,
          finalPrice: selectedProduct.finalPrice,
          discountPercent,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not complete purchase');
        setSubmitting(false);
        return;
      }
      
      // Redirect to purchase success page
      window.location.href = `/p/${slug}/success`;
    } catch (e) {
      setError('Network error');
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
      <div className="min-h-svh bg-gradient-to-br from-emerald-500 to-green-600 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white flex items-center justify-center shadow-2xl">
              <span className="text-7xl md:text-8xl">✓</span>
            </div>
          </div>

          {/* Main Message */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
              Request Submitted!
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-xl mx-auto">
              The store has been notified and will send you a text when your order is ready to be completed in store
            </p>
            <p className="text-lg md:text-xl text-white/75 mt-2">
              (typically 1-5 business days)
            </p>
          </div>

          {/* Product Card */}
          {selectedProduct && (
            <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 mb-6 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                {/* Product Image */}
                {selectedProduct.imageUrl && (
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl border-4 border-gray-200 shadow-lg"
                  />
                )}
                
                {/* Product Name */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
                  {success.productName}
                </h2>
                
                {/* Pricing */}
                <div className="flex items-center gap-4">
                  <div className="text-xl text-gray-500 line-through">
                    ${selectedProduct.originalPrice.toFixed(2)}
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-emerald-600">
                    ${selectedProduct.finalPrice.toFixed(2)}
                  </div>
                </div>
                <div className="text-lg md:text-xl text-emerald-600 font-semibold">
                  You save ${selectedProduct.savings.toFixed(2)} ({discountPercent}% off)
                </div>
              </div>
            </div>
          )}

          {/* Details Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
                <span className="text-gray-600 font-medium text-lg md:text-xl">Store</span>
                <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{success.storeName}</span>
              </div>
              <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
                <span className="text-gray-600 font-medium text-lg md:text-xl">Customer</span>
                <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{success.customerName}</span>
              </div>
              <div className="flex items-start justify-between py-4">
                <span className="text-gray-600 font-medium text-lg md:text-xl">Offer</span>
                <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{success.promoOffer}</span>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center mt-8">
            <p className="text-white/90 text-lg md:text-xl">
              Check your phone for updates from {success.storeName}
            </p>
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
            {isDirect ? 'Show this to a staff member to complete your purchase.' : 'Select a product below to request this promo.'}
          </p>
        </div>

        {/* Direct Purchase Flow - Show selected product and PIN entry */}
        {isDirect && selectedProduct ? (
          <>
            {/* Selected Product Display */}
            <div className="mb-6">
              <h3 className="font-semibold text-[#2b2b2b] mb-3">Your Product</h3>
              <div className="w-full border-2 border-purple-600 bg-purple-50 rounded-xl p-4 shadow-md">
                <div className="flex gap-3 items-center">
                  {selectedProduct.imageUrl && (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-base mb-1">{selectedProduct.name}</div>
                    {selectedProduct.description && (
                      <div className="text-xs text-gray-600 mb-2 line-clamp-1">{selectedProduct.description}</div>
                    )}
                    
                    <div className="flex items-baseline gap-2">
                      <div className="text-xs text-gray-500 line-through">
                        ${selectedProduct.originalPrice.toFixed(2)}
                      </div>
                      <div className="text-xl font-bold text-emerald-600">
                        ${selectedProduct.finalPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                      Save ${selectedProduct.savings.toFixed(2)} ({discountPercent}% off)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PIN Entry */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#2b2b2b] mb-2">
                Staff PIN <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                className="w-full h-14 px-4 text-2xl text-center tracking-widest border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                value={staffPin}
                onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={submitting}
              />
              <p className="text-xs text-gray-600 mt-2 text-center">
                Ask a staff member to enter their PIN to complete the purchase
              </p>
            </div>

            {/* Complete Purchase Button */}
            <button
              className="w-full h-14 text-lg font-semibold bg-purple-600 text-white rounded-xl active:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || staffPin.length !== 4}
              onClick={handleDirectPurchase}
            >
              {submitting ? 'Processing…' : 'Complete Purchase'}
            </button>
          </>
        ) : !isDirect ? (
          <>
            {/* Regular Promo Flow - Product Selection */}
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
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base mb-1">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-gray-600 mb-2 line-clamp-1">{product.description}</div>
                        )}
                        
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
          </>
        ) : null}
        
        {error && (
          <div className="text-red-600 text-sm text-center mt-2">{error}</div>
        )}
      </div>
    </div>
  );
}
