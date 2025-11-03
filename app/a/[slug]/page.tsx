'use client';

import { useEffect, useState } from 'react';

export default function ActivateShortlinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
          setError(json.error || 'Invalid link');
        } else if (json.expired) {
          setError('Link expired, please request new sample');
        } else if (json.used) {
          setError('Link already used');
        } else {
          setRequiresPin(!!json.requiresPin);
          setStoreName(json.storeName || 'the store');
          setSampleChoice(json.sampleChoice || 'your sample');
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
      const res = await fetch('/api/shortlinks/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Invalid PIN');
        setSubmitting(false);
        return;
      }
      setSuccess({ storeName: json.storeName, sampleChoice: json.sampleChoice, memberId: json.memberId });
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
          <h1 className="text-xl font-bold text-[#2b2b2b] mb-2">Issue with Link</h1>
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
          <h1 className="text-2xl font-bold text-[#2b2b2b]">Sample Redeemed!</h1>
          <p className="text-base mt-2 text-[#2b2b2b]">Show the item to the customer and mark as handed off.</p>
          <div className="mt-4 text-left text-[#2b2b2b]">
            <div><span className="font-semibold">Store:</span> {success.storeName}</div>
            <div><span className="font-semibold">Sample:</span> {success.sampleChoice}</div>
            <div><span className="font-semibold">Member:</span> <span className="font-mono">{success.memberId}</span></div>
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
