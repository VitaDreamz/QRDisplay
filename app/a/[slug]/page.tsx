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
        <div className="w-full max-w-lg">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center shadow-2xl">
              <span className="text-6xl md:text-7xl">✓</span>
            </div>
          </div>

          {/* Main Message */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Sample Redeemed!
            </h1>
            <p className="text-xl md:text-2xl text-white/90">
              Hand the item to the customer
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl p-6 md:p-8 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Store</span>
                <span className="text-gray-900 font-bold text-right">{success.storeName}</span>
              </div>
              <div className="flex items-start justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600 font-medium">Sample</span>
                <span className="text-gray-900 font-bold text-right">{success.sampleChoice}</span>
              </div>
              <div className="flex items-start justify-between py-3">
                <span className="text-gray-600 font-medium">Member ID</span>
                <span className="text-gray-900 font-mono font-bold text-right">{success.memberId}</span>
              </div>
            </div>
          </div>

          {/* Footer Message */}
          <div className="text-center mt-8">
            <p className="text-white/80 text-sm">
              Customer will receive a promo offer via SMS
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-[#2b2b2b]">Enter Staff PIN</h1>
          <p className="text-[#6b6b6b] mt-1">Confirm redemption for {sampleChoice} at {storeName}</p>
        </div>

        {requiresPin && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {pinError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {pinError}
              </div>
            )}
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
                setPinError(null); // Clear error when user types
              }}
            />
            <button
              type="submit"
              disabled={submitting || pin.length !== 4}
              className="w-full h-14 text-lg font-semibold bg-purple-600 text-white rounded-xl active:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Verifying…' : 'Confirm Redemption'}
            </button>
          </form>
        )}

        {!requiresPin && (
          <div className="text-center text-[#2b2b2b]">This link does not require a PIN. Please use the store link at /r/…</div>
        )}
      </div>
    </div>
  );
}
