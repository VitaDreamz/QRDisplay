'use client';

import { useEffect, useState } from 'react';

export default function RedeemSuccessPage({ params }: { params: Promise<{ verifySlug: string }> }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [optOut, setOptOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await params;
      setSlug(p.verifySlug);
      try {
        const res = await fetch(`/api/purchase-intent?verifySlug=${p.verifySlug}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.intent) {
          setError(json.error || 'Invalid link');
        } else {
          setIntent(json.intent);
          setStore(json.store || null);
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const storeAddress = store ? [store.streetAddress, [store.city, store.state].filter(Boolean).join(', '), store.zipCode].filter(Boolean).join(' • ') : null;
  const productName = intent?.product?.name || 'Product';
  const productImage = intent?.product?.imageUrl || null;
  const price = intent ? Number(intent.finalPrice) : null;
  const discount = intent ? Number(intent.discountPercent) : null;

  const onDone = async () => {
    if (!intent) return;
    setSubmitting(true);
    try {
      if (optOut && intent.customer?.phone) {
        await fetch('/api/optout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: intent.customer.phone, reason: 'customer_opt_out_after_purchase', storeId: intent.storeId })
        });
      }
      setDone(true);
    } catch (e) {
      // Non-blocking
    } finally {
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
          <h1 className="text-xl font-bold text-[#2b2b2b] mb-2">Link Issue</h1>
          <p className="text-[#6b6b6b]">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-purple-600 to-indigo-700 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg text-center">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center shadow-2xl">
              <span className="text-6xl md:text-7xl">🎉</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">All Set!</h1>
          <p className="text-xl md:text-2xl text-white/90">Thanks for your purchase! Have a great day.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-600 to-indigo-700 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center shadow-2xl">
            <span className="text-6xl md:text-7xl">✅</span>
          </div>
        </div>

        {/* Main Message */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Purchase Confirmed!
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            Thank you for shopping with {store?.storeName || 'us'}
          </p>
        </div>

        {/* Product Image */}
        {productImage && (
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img 
                src={productImage} 
                alt={productName}
                className="w-48 h-48 md:w-56 md:h-56 object-cover rounded-2xl shadow-2xl border-4 border-white/20"
              />
            </div>
          </div>
        )}

        {/* Receipt Card */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 shadow-2xl mb-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600 font-medium">Item</span>
              <span className="text-gray-900 font-bold text-right">{productName}</span>
            </div>
            <div className="flex items-start justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600 font-medium">Your Price</span>
              <span className="text-purple-700 font-bold text-2xl">{price !== null ? `$${price.toFixed(2)}` : '-'}</span>
            </div>
            {discount !== null && (
              <div className="flex items-start justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Discount</span>
                <span className="text-emerald-600 font-bold">{discount}% off</span>
              </div>
            )}
            <div className="pt-3 space-y-1">
              <div className="text-xs text-gray-500">Order ID: {intent?.id}</div>
              <div className="text-xs text-gray-500">Date: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>

        {/* Store details */}
        {store && (
          <div className="bg-white/90 backdrop-blur rounded-2xl p-5 shadow-xl mb-6">
            <div className="text-sm font-semibold text-gray-900 mb-2">{store.storeName}</div>
            {storeAddress && <div className="text-xs text-gray-600 mb-1">{storeAddress}</div>}
            {store.adminPhone && <div className="text-xs text-gray-600">Phone: {store.adminPhone}</div>}
          </div>
        )}

        {/* Opt-out control */}
        <div className="bg-white/80 backdrop-blur rounded-xl p-4 flex items-start gap-3 mb-6">
          <input
            id="optout"
            type="checkbox"
            checked={optOut}
            onChange={(e) => setOptOut(e.target.checked)}
            className="mt-1 h-5 w-5 text-purple-600 rounded"
          />
          <label htmlFor="optout" className="text-sm text-gray-900">
            Don’t send me future promos from this store
          </label>
        </div>

        <button
          onClick={onDone}
          disabled={submitting}
          className="w-full py-4 text-xl font-bold bg-white text-purple-700 rounded-2xl hover:bg-gray-50 disabled:opacity-50 shadow-xl transition-all active:scale-[0.98]"
        >
          {submitting ? 'Saving…' : 'Done ✓'}
        </button>
      </div>
    </div>
  );
}
