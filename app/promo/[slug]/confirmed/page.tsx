'use client';

import { useEffect, useState } from 'react';

export default function PromoConfirmedPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');
  const [storeName, setStoreName] = useState('the store');

  useEffect(() => {
    params.then((p) => {
      setSlug(p.slug);
      // Optionally fetch store name for display
      fetch(`/api/promos/${p.slug}`)
        .then(res => res.json())
        .then(json => {
          if (json.ok) setStoreName(json.storeName || 'the store');
        })
        .catch(() => {});
    });
  }, [params]);

  return (
    <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-5">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <span className="text-5xl text-emerald-500">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-[#2b2b2b] mb-3">Request Sent!</h1>
        <p className="text-base text-[#2b2b2b] mb-4">
          Your purchase request has been successfully sent to {storeName}.
        </p>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-left">
          <p className="text-sm text-[#2b2b2b] mb-2">
            <strong>What's Next?</strong>
          </p>
          <p className="text-sm text-[#6b6b6b]">
            {storeName} will prepare your order and text you when it's ready for pickup.
            This typically takes <strong>1-3 business days</strong>.
          </p>
        </div>
        <p className="text-xs text-[#6b6b6b] mt-6">
          You'll receive a text message with a link to complete your purchase in-store.
        </p>
      </div>
    </div>
  );
}
