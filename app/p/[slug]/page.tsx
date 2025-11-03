'use client';

import { useEffect, useState } from 'react';

type StoreInfo = {
  storeName: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  contactPhone: string | null;
};

export default function PromoRedemptionPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [promoOffer, setPromoOffer] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ storeName: string; promoOffer: string; customerName: string } | null>(null);

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
          setPromoOffer(json.promoOffer || '20% off first purchase');
          setCustomerName(json.customerName || 'Customer');
          setStoreInfo(json.store || null);
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/promos/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Invalid PIN');
        setSubmitting(false);
        return;
      }
      setSuccess({ 
        storeName: json.store, 
        promoOffer: json.promo, 
        customerName: `${json.customer.firstName} ${json.customer.lastName}` 
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
          <h1 className="text-2xl font-bold text-[#2b2b2b]">Promo Redeemed!</h1>
          <p className="text-base mt-2 text-[#2b2b2b]">Customer discount applied successfully.</p>
          <div className="mt-4 text-left text-[#2b2b2b]">
            <div><span className="font-semibold">Store:</span> {success.storeName}</div>
            <div><span className="font-semibold">Customer:</span> {success.customerName}</div>
            <div><span className="font-semibold">Offer:</span> {success.promoOffer}</div>
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
            
            {storeInfo.contactPhone && (
              <a 
                href={`tel:${storeInfo.contactPhone}`}
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium text-lg min-h-[44px]"
              >
                📞 {formatPhoneForDisplay(storeInfo.contactPhone)}
              </a>
            )}
          </div>
        )}

        {/* Promo Offer Card */}
        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-purple-800 mb-2">YOUR OFFER</h3>
          <p className="text-3xl font-bold text-purple-600 mb-2">{promoOffer}</p>
          <p className="text-sm text-gray-600">
            Show this page to staff at checkout to redeem
          </p>
        </div>

        {/* Staff Verification */}
        <div className="bg-gray-50 rounded-xl p-6">
          <h3 className="font-bold mb-4 text-center text-[#2b2b2b]">Staff Verification</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2b2b2b] mb-2">
              Staff PIN
            </label>
            <input
              type="text"
              className="w-full h-14 px-4 text-2xl tracking-widest text-center border-2 border-gray-300 rounded-xl focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setPin(value);
              }}
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}
            <button
              type="submit"
              disabled={submitting || pin.length !== 4}
              className="w-full h-14 text-lg font-semibold bg-purple-600 text-white rounded-xl active:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Redeeming…' : 'Redeem Promo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
