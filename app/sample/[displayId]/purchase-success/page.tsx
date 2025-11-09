'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams();
  const [storeName, setStoreName] = useState('');
  const [product, setProduct] = useState('');
  const [promoSlug, setPromoSlug] = useState('');

  useEffect(() => {
    setStoreName(searchParams.get('storeName') || 'the store');
    setProduct(searchParams.get('product') || 'your product');
    setPromoSlug(searchParams.get('promoSlug') || '');
  }, [searchParams]);

  return (
    <div className="min-h-svh bg-gradient-to-br from-purple-700 via-purple-600 to-blue-600 flex flex-col items-center justify-center p-4">
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
            You're All Set!
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-xl mx-auto mb-6">
            Check your phone for a link to redeem your exclusive offer!
          </p>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto mb-6">
            <p className="text-lg text-white/90 mb-2">
              <span className="font-semibold">Store:</span> {storeName}
            </p>
            <p className="text-lg text-white/90 mb-4">
              <span className="font-semibold">Product:</span> {product}
            </p>
            <div className="text-sm text-white/75 space-y-2">
              <p>📱 We've sent you a text with your redemption link</p>
              <p>🏪 Show it to a staff member in-store to complete your purchase</p>
            </div>
          </div>

          <p className="text-base text-white/75 max-w-md mx-auto">
            By requesting this offer, you agree to receive SMS notifications from {storeName}. 
            You can opt-out anytime by replying STOP.
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-center gap-4 mb-8">
          <div className="text-6xl">🎉</div>
          <div className="text-6xl">🛍️</div>
          <div className="text-6xl">💬</div>
        </div>
      </div>
    </div>
  );
}
