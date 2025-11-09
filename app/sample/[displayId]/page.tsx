'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhoneDisplay } from '@/lib/phone';
import { SAMPLE_OPTIONS } from '@/lib/constants';

type BrandInfo = {
  name: string;
  logoUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  storeName?: string | null;
  availableSamples?: any[]; // Now includes inventory info
  availableProducts?: any[];
  hasSamplesInStock?: boolean;
  hasProductsInStock?: boolean;
  promoOffer?: string;
};

type FlowMode = 'choice' | 'sample' | 'purchase';

export default function SampleRequestPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowMode, setFlowMode] = useState<FlowMode>('sample'); // Default to sample flow

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [sampleChoice, setSampleChoice] = useState<string>('');
  const [productChoice, setProductChoice] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    (async () => {
      const p = await params;
      setDisplayId(p.displayId);
      try {
        const res = await fetch(`/api/displays/${p.displayId}/brand`, { cache: 'no-store' });
        const data = await res.json();
        setBrand(data);
        
        console.log('📊 Brand data received:', data);
        console.log('🎁 Has samples in stock:', data.hasSamplesInStock);
        console.log('🛍️ Has products in stock:', data.hasProductsInStock);
        
        // Determine initial flow mode based on inventory
        // Option 1: Samples in stock but NO products → Sample flow only
        // Option 2: Samples AND products in stock → Show choice
        // Option 3: NO samples but products in stock → Purchase flow only
        
        if (data.hasSamplesInStock && data.hasProductsInStock) {
          console.log('✅ Flow: CHOICE (both available)');
          setFlowMode('choice'); // Show choice between sample and purchase
        } else if (data.hasProductsInStock && !data.hasSamplesInStock) {
          console.log('✅ Flow: PURCHASE ONLY (no samples in stock)');
          setFlowMode('purchase'); // Only products available
        } else {
          console.log('✅ Flow: SAMPLE ONLY (default/no products in stock)');
          setFlowMode('sample'); // Only samples available (or legacy)
        }
      } catch (e) {
        console.error('Failed to fetch brand info', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const headerTitle = useMemo(() => {
    if (!brand) return '';
    const left = brand.name || 'Brand';
    const right = brand.storeName || 'Your Store';
    return `${left} × ${right}`;
  }, [brand]);

  // Filter samples based on what the store has available and in stock
  const availableOptions = useMemo(() => {
    if (!brand?.availableSamples || brand.availableSamples.length === 0) {
      // Fallback to constants if API doesn't return samples
      return SAMPLE_OPTIONS;
    }
    // API now returns samples with inventory info
    return brand.availableSamples;
  }, [brand]);

  // Calculate discount percentage from promo offer
  const promoPercentage = useMemo(() => {
    if (!brand?.promoOffer) return '20';
    const match = brand.promoOffer.match(/(\d+)%/);
    return match ? match[1] : '20';
  }, [brand]);

  function validateSample(): boolean {
    const errs: { [k: string]: string } = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) errs.phone = 'Enter a valid 10-digit US phone';

    if (!sampleChoice) errs.sampleChoice = 'Please choose a sample';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validatePurchase(): boolean {
    const errs: { [k: string]: string } = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) errs.phone = 'Enter a valid 10-digit US phone';

    if (!productChoice) errs.productChoice = 'Please choose a product';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmitSample(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validateSample()) return;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as any).vibrate?.(20); } catch {}
    }

    try {
      setSubmitting(true);
      const resp = await fetch('/api/samples/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId, firstName, lastName, phone, sampleChoice }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors({ form: json.error || 'Something went wrong' });
        setSubmitting(false);
        return;
      }

      const params = new URLSearchParams({
        storeName: brand?.storeName || '',
        sample: sampleChoice,
        memberId: json.memberId || '',
      });
      router.push(`/sample/${displayId}/success?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setErrors({ form: 'Network error. Please try again.' });
      setSubmitting(false);
    }
  }

  async function onSubmitPurchase(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validatePurchase()) return;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as any).vibrate?.(20); } catch {}
    }

    try {
      setSubmitting(true);
      const resp = await fetch('/api/purchase-intent-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId, firstName, lastName, phone, productSku: productChoice }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors({ form: json.error || 'Something went wrong' });
        setSubmitting(false);
        return;
      }

      // Redirect to success page
      const params = new URLSearchParams({
        storeName: brand?.storeName || '',
        product: brand?.availableProducts?.find(p => p.sku === productChoice)?.name || productChoice,
        promoSlug: json.promoSlug || '',
      });
      router.push(`/sample/${displayId}/purchase-success?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setErrors({ form: 'Network error. Please try again.' });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
        <div className="text-white">Loading…</div>
      </div>
    );
  }

  // CHOICE MODE: Show two big cards for sample vs purchase
  if (flowMode === 'choice') {
    return (
      <div className="min-h-svh bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-2xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            {brand?.logoUrl && (
              <img src={brand.logoUrl} alt={brand?.name || 'Brand'} className="w-20 h-20 rounded-xl mx-auto mb-4 bg-white p-3 shadow-lg" />
            )}
            <h1 className="text-3xl font-bold leading-tight mb-2">{headerTitle}</h1>
            <p className="text-xl font-semibold text-pink-200">Choose Your Offer</p>
          </div>

          {/* Two Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Sample Card */}
            <button
              onClick={() => setFlowMode('sample')}
              className="bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-2xl p-8 hover:bg-white/20 hover:border-white/50 transition-all active:scale-[0.98] text-left"
            >
              <div className="text-6xl mb-4">🎁</div>
              <h2 className="text-2xl font-bold mb-3">Redeem a FREE Sample</h2>
              <p className="text-pink-200 text-lg">
                Try our products risk-free and get a special offer on your first purchase!
              </p>
            </button>

            {/* Buy Now Card */}
            <button
              onClick={() => setFlowMode('purchase')}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 hover:from-purple-600 hover:to-pink-600 transition-all active:scale-[0.98] text-left shadow-lg shadow-purple-500/50"
            >
              <div className="text-6xl mb-4">🛍️</div>
              <h2 className="text-2xl font-bold mb-3">BUY NOW</h2>
              <p className="text-white/90 text-lg mb-2">
                Get <span className="font-bold text-2xl">{promoPercentage}% OFF</span> your purchase today!
              </p>
              <p className="text-white/75">
                {brand?.promoOffer || 'Special offer'}
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SAMPLE FLOW
  if (flowMode === 'sample') {
    return (
      <div className="min-h-svh bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-md mx-auto px-5 py-6">
          {/* Header */}
          <div className="text-center mb-6">
            {brand?.logoUrl && (
              <img src={brand.logoUrl} alt={brand?.name || 'Brand'} className="w-16 h-16 rounded-lg mx-auto mb-3 bg-white p-2" />
            )}
            <h1 className="text-2xl font-bold leading-tight">{headerTitle}</h1>
            <p className="text-lg font-semibold mt-2 text-pink-200">Free Sample Program</p>
          </div>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-5">
            <p className="text-base mb-5 text-white/90 leading-relaxed">
              Takes less than 30 seconds to claim a <span className="font-semibold text-pink-200">Free Sample</span> and a <span className="font-semibold text-pink-200">{brand?.promoOffer || '$5'}</span> Deal!
            </p>

            {/* Form */}
            <form onSubmit={onSubmitSample} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name <span className="text-pink-300">*</span>
                </label>
                <input
                  className="w-full h-12 px-4 text-base bg-white/20 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 focus:outline-none"
                  placeholder="John"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                {errors.firstName && <p className="text-pink-300 text-sm mt-1">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name <span className="text-pink-300">*</span>
                </label>
                <input
                  className="w-full h-12 px-4 text-base bg-white/20 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 focus:outline-none"
                  placeholder="Doe"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
                {errors.lastName && <p className="text-pink-300 text-sm mt-1">{errors.lastName}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone <span className="text-pink-300">*</span>
                </label>
                <input
                  className="w-full h-12 px-4 text-base bg-white/20 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 focus:outline-none"
                  placeholder="(555) 123-4567"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                  required
                />
                {errors.phone && <p className="text-pink-300 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Sample Choice - Card Grid */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Choose Your FREE Sample <span className="text-pink-300">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {availableOptions.map((opt) => {
                    const isSelected = sampleChoice === (opt.sku || opt.value);
                    const sampleName = opt.name || opt.label;
                    const sampleSku = opt.sku || opt.value;
                    const sampleImage = opt.imageUrl;
                    const samplePrice = opt.msrp || opt.price || 0;
                    
                    return (
                      <button
                        key={sampleSku}
                        type="button"
                        onClick={() => setSampleChoice(sampleSku)}
                        className={`relative border-2 rounded-xl p-4 text-left transition-all ${
                          isSelected
                            ? 'border-pink-400 bg-pink-500/20 shadow-lg shadow-pink-500/30'
                            : 'border-white/30 bg-white/10 hover:border-white/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Product Image */}
                          {sampleImage && (
                            <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg overflow-hidden">
                              <img
                                src={sampleImage}
                                alt={sampleName}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                          )}
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-white mb-1">
                              {sampleName}
                            </h3>
                            {opt.description && (
                              <p className="text-xs text-white/70 mb-2 line-clamp-2">
                                {opt.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 line-through text-sm">
                                ${samplePrice.toFixed(2)}
                              </span>
                              <span className="text-2xl font-bold text-pink-300">
                                FREE
                              </span>
                            </div>
                          </div>
                          
                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.sampleChoice && <p className="text-pink-300 text-sm mt-2">{errors.sampleChoice}</p>}
              </div>

              {errors.form && (
                <div className="text-pink-300 text-sm bg-red-500/20 border border-red-300/30 rounded-lg p-3">{errors.form}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
              >
                {submitting ? 'Submitting…' : 'Claim My Free Sample'}
              </button>

              <p className="text-xs text-white/60 text-center leading-relaxed">
                By claiming your free sample you agree to receive SMS notifications from {brand?.name || 'VitaDreamz'} regarding your sample and future promo offers. Opt-out any time! Standard message rates may apply.
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // PURCHASE FLOW
  if (flowMode === 'purchase') {
    return (
      <div className="min-h-svh bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 text-white">
        <div className="max-w-md mx-auto px-5 py-6">
          {/* Header */}
          <div className="text-center mb-6">
            {brand?.logoUrl && (
              <img src={brand.logoUrl} alt={brand?.name || 'Brand'} className="w-16 h-16 rounded-lg mx-auto mb-3 bg-white p-2" />
            )}
            <h1 className="text-2xl font-bold leading-tight">{headerTitle}</h1>
            <p className="text-lg font-semibold mt-2 text-pink-200">
              {promoPercentage}% OFF Your Purchase
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl p-5">
            <p className="text-base mb-5 text-white/90 leading-relaxed">
              Get <span className="font-semibold text-pink-200">{promoPercentage}% OFF</span> on your purchase today!
            </p>

            {/* Form */}
            <form onSubmit={onSubmitPurchase} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name <span className="text-pink-300">*</span>
                </label>
                <input
                  className="w-full h-12 px-4 text-base bg-white/20 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 focus:outline-none"
                  placeholder="John"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                {errors.firstName && <p className="text-pink-300 text-sm mt-1">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name <span className="text-pink-300">*</span>
                </label>
                <input
                  className="w-full h-12 px-4 text-base bg-white/20 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 focus:outline-none"
                  placeholder="Doe"
                  type="text"
                  autoCapitalize="words"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
                {errors.lastName && <p className="text-pink-300 text-sm mt-1">{errors.lastName}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone <span className="text-pink-300">*</span>
                </label>
                <input
                  className="w-full h-12 px-4 text-base bg-white/20 border-2 border-white/30 rounded-lg text-white placeholder-white/50 focus:border-pink-300 focus:ring-2 focus:ring-pink-200/50 focus:outline-none"
                  placeholder="(555) 123-4567"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                  required
                />
                {errors.phone && <p className="text-pink-300 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Product Choice - Card Grid */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Select Your Product <span className="text-pink-300">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {brand?.availableProducts?.map((product) => {
                    const isSelected = productChoice === product.sku;
                    const price = parseFloat(product.msrp || product.price);
                    const discountedPrice = price * (1 - parseInt(promoPercentage) / 100);
                    
                    return (
                      <button
                        key={product.sku}
                        type="button"
                        onClick={() => setProductChoice(product.sku)}
                        className={`relative border-2 rounded-xl p-4 text-left transition-all ${
                          isSelected
                            ? 'border-pink-400 bg-pink-500/20 shadow-lg shadow-pink-500/30'
                            : 'border-white/30 bg-white/10 hover:border-white/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Product Image */}
                          {product.imageUrl && (
                            <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg overflow-hidden">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                          )}
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base text-white mb-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-xs text-white/70 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 line-through text-sm">
                                ${price.toFixed(2)}
                              </span>
                              <span className="text-2xl font-bold text-pink-300">
                                ${discountedPrice.toFixed(2)}
                              </span>
                              <span className="text-sm text-pink-200">
                                ({promoPercentage}% OFF)
                              </span>
                            </div>
                          </div>
                          
                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 bg-pink-400 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.productChoice && <p className="text-pink-300 text-sm mt-2">{errors.productChoice}</p>}
              </div>

              {errors.form && (
                <div className="text-pink-300 text-sm bg-red-500/20 border border-red-300/30 rounded-lg p-3">{errors.form}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
              >
                {submitting ? 'Submitting…' : 'Redeem Your Promo'}
              </button>

              <p className="text-xs text-white/60 text-center leading-relaxed">
                By redeeming this offer you agree to receive SMS notifications from {brand?.name || 'VitaDreamz'}. Opt-out any time! Standard message rates may apply.
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
