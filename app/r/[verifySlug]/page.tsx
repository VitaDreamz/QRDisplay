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
  const price = intent ? Number(intent.finalPrice) : null;
  const storeAddress = store ? [store.streetAddress, [store.city, store.state].filter(Boolean).join(', '), store.zipCode].filter(Boolean).join(' • ') : null;
  const storePhone = store?.adminPhone || null;

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-700 to-purple-500 px-5 py-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-[#2b2b2b] mb-1">Redeem Purchase</h1>
        <p className="text-sm text-[#6b6b6b] mb-4">Enter your 4-digit PIN to confirm the sale.</p>

        <div className="border rounded-xl p-4 mb-4">
          <div className="font-semibold text-[#2b2b2b]">{productName}</div>
          {price !== null && (
            <div className="text-sm text-[#6b6b6b]">Your Price: <span className="font-semibold text-purple-700">${price.toFixed(2)}</span></div>
          )}
        </div>

        {store && (
          <div className="border rounded-xl p-4 mb-4 bg-gray-50">
            <div className="text-sm font-semibold text-[#2b2b2b]">Pickup at</div>
            <div className="text-sm text-[#2b2b2b]">{store.storeName}</div>
            {storeAddress && <div className="text-xs text-gray-600 mt-1">{storeAddress}</div>}
            {storePhone && <div className="text-xs text-gray-600 mt-1">Phone: {storePhone}</div>}
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
            {submitting ? 'Confirming…' : 'Confirm Sale'}
          </button>
        </form>
      </div>
    </div>
  );
}
