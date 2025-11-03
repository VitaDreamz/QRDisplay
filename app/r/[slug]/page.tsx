'use client';

import { useEffect, useState } from 'react';

export default function RedeemShortlinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ storeName: string; sampleChoice: string; memberId: string } | null>(null);

  useEffect(() => {
    (async () => {
      const p = await params;
      try {
        // First check link validity
        const infoRes = await fetch(`/api/shortlinks/${p.slug}`, { cache: 'no-store' });
        const info = await infoRes.json();
        if (!infoRes.ok || !info.ok) {
          setError(info.error || 'Invalid link');
          setLoading(false);
          return;
        }
        if (info.expired) {
          setError('Link expired, please request new sample');
          setLoading(false);
          return;
        }
        if (info.used) {
          setError('Link already used');
          setLoading(false);
          return;
        }
        if (info.requiresPin) {
          setError('This link requires PIN. Use the /a/ link.');
          setLoading(false);
          return;
        }

        // Redeem without PIN
        const res = await fetch('/api/shortlinks/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: p.slug }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setError(json.error || 'Redemption failed');
        } else {
          setSuccess({ storeName: json.storeName, sampleChoice: json.sampleChoice, memberId: json.memberId });
        }
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#f7f5fb]">
        <div className="text-[#2b2b2b]">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#f7f5fb] px-5">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[#2b2b2b] mb-2">Issue with Link</h1>
          <p className="text-[#6b6b6b]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex items-center justify-center bg-[#f7f5fb] px-5">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
          <span className="text-3xl text-emerald-500">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-[#2b2b2b]">Sample Redeemed!</h1>
        <div className="mt-4 text-left text-[#2b2b2b]">
          <div><span className="font-semibold">Store:</span> {success?.storeName}</div>
          <div><span className="font-semibold">Sample:</span> {success?.sampleChoice}</div>
          <div><span className="font-semibold">Member:</span> <span className="font-mono">{success?.memberId}</span></div>
        </div>
      </div>
    </div>
  );
}
