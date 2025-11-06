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
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-[#2b2b2b] mb-2">All Set 🎉</h1>
          <p className="text-[#6b6b6b]">Thanks for your purchase! Have a great day.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-700 to-purple-500 px-5 py-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">✅</div>
          <h1 className="text-2xl font-bold text-[#2b2b2b]">Purchase Confirmed</h1>
          <p className="text-sm text-[#6b6b6b]">Thank you for shopping with {store?.storeName || 'the store'}.</p>
        </div>

        {/* Product Image */}
        {productImage && (
          <div className="flex justify-center mb-4">
            <img 
              src={productImage} 
              alt={productName}
              className="w-40 h-40 object-cover rounded-lg border-2 border-purple-200"
            />
          </div>
        )}

        {/* Receipt-style summary */}
        <div className="border rounded-xl p-4 bg-gray-50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Item</span>
            <span className="font-medium">{productName}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-gray-600">Your Price</span>
            <span className="font-semibold text-purple-700">{price !== null ? `$${price.toFixed(2)}` : '-'}</span>
          </div>
          {discount !== null && (
            <div className="flex justify-between text-xs mt-2">
              <span className="text-gray-500">Discount</span>
              <span className="text-gray-700">{discount}% off</span>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-3">Order ID: {intent?.id}</div>
          <div className="text-xs text-gray-500">Date: {new Date().toLocaleString()}</div>
        </div>

        {/* Store details */}
        {store && (
          <div className="border rounded-xl p-4 mt-4">
            <div className="text-sm font-semibold text-[#2b2b2b]">{store.storeName}</div>
            {storeAddress && <div className="text-xs text-gray-600 mt-1">{storeAddress}</div>}
            {store.adminPhone && <div className="text-xs text-gray-600 mt-1">Phone: {store.adminPhone}</div>}
          </div>
        )}

        {/* Opt-out control */}
        <div className="mt-5 flex items-start gap-2">
          <input
            id="optout"
            type="checkbox"
            checked={optOut}
            onChange={(e) => setOptOut(e.target.checked)}
            className="mt-1 h-4 w-4 text-purple-600"
          />
          <label htmlFor="optout" className="text-sm text-[#2b2b2b]">
            Don’t send me future promos from this store
          </label>
        </div>

        <button
          onClick={onDone}
          disabled={submitting}
          className="mt-5 w-full py-3 text-lg font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Done'}
        </button>
      </div>
    </div>
  );
}
