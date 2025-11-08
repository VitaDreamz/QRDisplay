'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PurchaseSuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [promoOffer, setPromoOffer] = useState('');
  const [optOut, setOptOut] = useState(false);
  const [submittingOptOut, setSubmittingOptOut] = useState(false);

  useEffect(() => {
    params.then(async (p) => {
      setSlug(p.slug);
      
      // Fetch promo details for receipt
      try {
        const res = await fetch(`/api/promos/${p.slug}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.ok) {
          setCustomerName(json.customerName || '');
          setStoreName(json.storeName || '');
          setPromoOffer(json.promoOffer || '');
        }
      } catch (e) {
        console.error('Failed to fetch promo details:', e);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  async function handleOptOut() {
    if (submittingOptOut) return;
    
    setSubmittingOptOut(true);
    try {
      const res = await fetch('/api/customer/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoSlug: slug })
      });
      
      if (res.ok) {
        alert('You have been opted out of future promotions.');
      } else {
        alert('Failed to opt out. Please contact the store.');
      }
    } catch (e) {
      alert('Network error. Please try again.');
    } finally {
      setSubmittingOptOut(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600">
        <div className="text-white">Loading…</div>
      </div>
    );
  }

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
            Purchase Complete!
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-xl mx-auto">
            Thank you for your purchase, {customerName}!
          </p>
          <p className="text-lg md:text-xl text-white/75 mt-2">
            Your discount has been applied
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white/95 backdrop-blur rounded-3xl p-8 md:p-12 shadow-2xl mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Receipt</h2>
          
          <div className="space-y-6">
            <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
              <span className="text-gray-600 font-medium text-lg md:text-xl">Store</span>
              <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{storeName}</span>
            </div>
            <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
              <span className="text-gray-600 font-medium text-lg md:text-xl">Customer</span>
              <span className="text-gray-900 font-bold text-right text-lg md:text-xl">{customerName}</span>
            </div>
            <div className="flex items-start justify-between py-4 border-b-2 border-gray-200">
              <span className="text-gray-600 font-medium text-lg md:text-xl">Discount Applied</span>
              <span className="text-emerald-600 font-bold text-right text-lg md:text-xl">{promoOffer}</span>
            </div>
            <div className="flex items-start justify-between py-4">
              <span className="text-gray-600 font-medium text-lg md:text-xl">Status</span>
              <span className="text-emerald-600 font-bold text-right text-lg md:text-xl">✓ Completed</span>
            </div>
          </div>

          {/* Opt Out Section */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={optOut}
                onChange={(e) => setOptOut(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900">
                Opt out of future promotional messages from {storeName}
              </span>
            </label>
            
            {optOut && (
              <button
                onClick={handleOptOut}
                disabled={submittingOptOut}
                className="mt-4 w-full h-12 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {submittingOptOut ? 'Processing…' : 'Confirm Opt Out'}
              </button>
            )}
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-8">
          <p className="text-white/90 text-lg md:text-xl mb-4">
            Thank you for shopping at {storeName}!
          </p>
          <p className="text-white/75 text-sm">
            You'll be entered into our retention program for exclusive future offers
          </p>
        </div>
      </div>
    </div>
  );
}
