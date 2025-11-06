'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RedeemPage({ params }: { params: Promise<{ verifySlug: string }> }) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [intent, setIntent] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 4) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/purchase-intent/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifySlug: slug, staffPin: pin })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to redeem');
        setSubmitting(false);
        return;
      }
  // Go to success screen
  router.replace(`/r/${slug}/success`);
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
          <h1 className="text-xl font-bold text-[#2b2b2b] mb-2">Redemption Issue</h1>
          <p className="text-[#6b6b6b]">{error}</p>
        </div>
      </div>
    );
  }

  const productName = intent?.product?.name || 'Product';
  const productImage = intent?.product?.imageUrl || null;
  const originalPrice = intent?.product?.msrp ? Number(intent.product.msrp) : null;
  const finalPrice = intent ? Number(intent.finalPrice) : null;
  const promoOffer = intent?.promoOffer || '20% Off';
  const storeAddress = store ? [store.streetAddress, [store.city, store.state].filter(Boolean).join(', '), store.zipCode].filter(Boolean).join(' • ') : null;
  const storePhone = store?.adminPhone || null;
  const storeEmail = store?.adminEmail || null;
  const storeName = store?.storeName || 'Store';
  
  // Create Google Maps link
  const mapsLink = store ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.streetAddress}, ${store.city}, ${store.state} ${store.zipCode}`)}` : null;

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-700 to-purple-500 px-5 py-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-[#2b2b2b] mb-1">Redeem Promo Offer</h1>
        <p className="text-sm text-[#6b6b6b] mb-4">Speak to cashier for 4-digit PIN to confirm your order.</p>

        {/* Promo Badge */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl p-4 mb-4 text-center">
          <div className="text-sm opacity-90 mb-1">Store Promo Offer</div>
          <div className="text-3xl font-bold">{promoOffer}</div>
        </div>

        {/* Product Details */}
        <div className="border rounded-xl p-4 mb-4">
          {productImage && (
            <div className="flex justify-center mb-4">
              <img 
                src={productImage} 
                alt={productName}
                className="w-40 h-40 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="text-center mb-3">
            <div className="font-bold text-lg text-[#2b2b2b] mb-2">{productName}</div>
            {originalPrice !== null && (
              <div className="text-sm text-gray-500 line-through mb-1">
                Retail: ${originalPrice.toFixed(2)}
              </div>
            )}
            {finalPrice !== null && (
              <div className="text-3xl font-bold text-purple-600">
                ${finalPrice.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Pickup Location */}
        {store && (
          <div className="border rounded-xl p-4 mb-4 bg-gray-50">
            <div className="text-sm font-semibold text-[#2b2b2b] mb-2">Pickup at</div>
            <div className="font-bold text-[#2b2b2b]">{storeName}</div>
            {storeAddress && mapsLink && (
              <a 
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-600 hover:text-purple-700 underline block mt-1"
              >
                {storeAddress}
              </a>
            )}
            {storePhone && (
              <a 
                href={`tel:${storePhone}`}
                className="text-sm text-purple-600 hover:text-purple-700 block mt-2"
              >
                Phone: {storePhone}
              </a>
            )}
            {storeEmail && (
              <a 
                href={`mailto:${storeEmail}`}
                className="text-sm text-purple-600 hover:text-purple-700 block mt-1"
              >
                Email: {storeEmail}
              </a>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#2b2b2b] mb-1">PIN</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setPin(v);
              }}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
              placeholder="••••"
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={pin.length !== 4 || submitting}
            className="w-full py-3 text-lg font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? 'Confirming…' : 'Confirm Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
