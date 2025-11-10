'use client';

import { useEffect, useState } from 'react';

export default function ActivateShortlinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null); // Fatal errors with the link itself
  const [pinError, setPinError] = useState<string | null>(null); // Inline PIN validation errors
  const [requiresPin, setRequiresPin] = useState(false);
  const [storeName, setStoreName] = useState<string>('');
  const [sampleChoice, setSampleChoice] = useState<string>('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ storeName: string; sampleChoice: string; memberId: string } | null>(null);

  useEffect(() => {
    (async () => {
      const p = await params;
      setSlug(p.slug);
      try {
        const res = await fetch(`/api/shortlinks/${p.slug}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setLinkError(json.error || 'Invalid link');
        } else if (json.expired) {
          setLinkError('Link expired, please request new sample');
        } else if (json.used) {
          setLinkError('Link already used');
        } else {
          setRequiresPin(!!json.requiresPin);
          setStoreName(json.storeName || 'the store');
          setSampleChoice(json.sampleChoice || 'your sample');
          setProductImage(json.productImage);
          setProductPrice(json.productPrice);
        }
      } catch (e) {
        setLinkError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setPinError(null);

    try {
      const res = await fetch('/api/shortlinks/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setPinError(json.error || 'Invalid PIN');
        setSubmitting(false);
        return;
      }
      setSuccess({ storeName: json.storeName, sampleChoice: json.sampleChoice, memberId: json.memberId });
    } catch (e) {
      setPinError('Network error');
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

  if (linkError) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[#2b2b2b] mb-2">Issue with Link</h1>
          <p className="text-[#6b6b6b]">{linkError}</p>
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
              Sample Redeemed!
            </h1>
            <p className="text-2xl md:text-3xl text-white/90">
              Hand the item to the customer
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
                <span className="text-gray-600 font-medium text-lg md:text-xl">Store</span>
                <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{success.storeName}</span>
              </div>
              <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
                <span className="text-gray-600 font-medium text-lg md:text-xl">Sample</span>
                <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{success.sampleChoice}</span>
              </div>
              <div className="flex items-start justify-between py-4">
                <span className="text-gray-600 font-medium text-lg md:text-xl">Member ID</span>
                <span className="text-gray-900 font-mono font-bold text-right text-lg md:text-xl">{success.memberId}</span>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center mt-8">
            <p className="text-white/90 text-lg md:text-xl">
              Customer will receive a promo offer via SMS
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-700 to-purple-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Product Image & Details */}
        {productImage && (
          <div className="flex flex-col items-center mb-8">
            <div className="w-48 h-48 md:w-56 md:h-56 bg-white rounded-3xl shadow-2xl p-4 mb-4">
              <img 
                src={productImage} 
                alt={sampleChoice}
                className="w-full h-full object-contain"
              />
            </div>
            {productPrice && (
              <div className="bg-white/20 backdrop-blur rounded-full px-6 py-2 mb-2">
                <span className="text-white/60 text-2xl line-through mr-3">${productPrice.toFixed(2)}</span>
                <span className="text-white text-3xl md:text-4xl font-black">FREE</span>
              </div>
            )}
          </div>
        )}
        
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xl md:text-2xl text-white/75 mb-2">
            {storeName}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            {sampleChoice}
          </h1>
          <p className="text-lg md:text-xl text-white/90">
            Enter Staff PIN to Confirm
          </p>
        </div>

        {requiresPin && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {pinError && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-red-700 text-center text-lg shadow-lg">
                {pinError}
              </div>
            )}
            
            {/* PIN Input */}
            <div className="bg-white/95 backdrop-blur rounded-3xl p-8 md:p-12 shadow-2xl">
              <input
                type="text"
                className="w-full h-20 md:h-24 px-4 text-4xl md:text-5xl tracking-[0.5em] text-center border-4 border-gray-300 rounded-2xl focus:border-purple-600 focus:ring-4 focus:ring-purple-200 focus:outline-none transition-all"
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPin(value);
                  setPinError(null);
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || pin.length !== 4}
              className="w-full h-16 md:h-20 text-xl md:text-2xl font-bold bg-white text-purple-600 rounded-2xl active:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
            >
              {submitting ? 'Verifying…' : 'Confirm Redemption'}
            </button>
          </form>
        )}

        {!requiresPin && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
            <p className="text-xl text-[#2b2b2b]">This link does not require a PIN. Please use the store link at /r/…</p>
          </div>
        )}
      </div>
    </div>
  );
}
