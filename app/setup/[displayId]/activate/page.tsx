'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';
import { SAMPLE_OPTIONS } from '@/lib/constants';

export default function ActivatePage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { saveProgress, clearProgress } = useWizardProgress(displayId);

  // Form state - using same structure as existing activation
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [promoPercentage, setPromoPercentage] = useState('20');
  // Follow up timings per request: Day 4, 8, 12, 16, 20
  const [followupDays, setFollowupDays] = useState({
    day4: true,
    day8: false,
    day12: true,
    day16: false,
    day20: false,
  });
  const [pin, setPin] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSameAsOwner, setAdminSameAsOwner] = useState(false);
  
  const [purchasingManager, setPurchasingManager] = useState('');
  const [purchasingPhone, setPurchasingPhone] = useState('');
  const [purchasingEmail, setPurchasingEmail] = useState('');
  const [purchasingSameAsOwner, setPurchasingSameAsOwner] = useState(false);
  
  const [availableSamples, setAvailableSamples] = useState<string[]>(
    SAMPLE_OPTIONS.map(s => s.value) // Default to all samples
  );
  
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brandInfo, setBrandInfo] = useState<any>(null);

  useEffect(() => {
    params.then(async (p) => {
      setDisplayId(p.displayId);
      
      // Fetch brand info and products
      try {
        console.log('[Activate] Fetching brand info for display:', p.displayId);
        const res = await fetch(`/api/displays/${p.displayId}/brand`);
        if (res.ok) {
          const data = await res.json();
          console.log('[Activate] Brand info:', data);
          setBrandInfo(data);
          
          // Fetch products for this brand
          if (data.orgId) {
            console.log('[Activate] Fetching products for orgId:', data.orgId);
            const productsRes = await fetch(`/api/products?orgId=${data.orgId}`);
            console.log('[Activate] Products response status:', productsRes.status);
            if (productsRes.ok) {
              const productsData = await productsRes.json();
              console.log('[Activate] Products data:', productsData);
              console.log('[Activate] Products fetched:', productsData.products?.length || 0);
              setProducts(productsData.products || []);
            } else {
              const errorText = await productsRes.text();
              console.error('[Activate] Products fetch failed:', productsRes.status, errorText);
            }
          } else {
            console.warn('[Activate] No orgId in brand data');
          }
        } else {
          console.error('[Activate] Brand fetch failed:', res.status);
        }
      } catch (err) {
        console.error('[Activate] Failed to fetch brand info:', err);
      }
    });
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const adminEmailToUse = adminSameAsOwner ? ownerEmail : adminEmail;
    if (!emailRegex.test(adminEmailToUse)) {
      setError('Please enter a valid admin email address');
      setLoading(false);
      return;
    }

    const phoneRegex = /^[\+\d\s\-\(\)]{10,15}$/;
    const adminPhoneToUse = adminSameAsOwner ? ownerPhone : adminPhone;
    if (!phoneRegex.test(adminPhoneToUse)) {
      setError('Please enter a valid admin phone number');
      setLoading(false);
      return;
    }

    const pinRegex = /^\d{4}$/;
    if (!pinRegex.test(pin)) {
      setError('PIN must be exactly 4 digits');
      setLoading(false);
      return;
    }

    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zip)) {
      setError('Please enter a valid 5-digit ZIP code');
      setLoading(false);
      return;
    }

    const stateRegex = /^[A-Z]{2}$/;
    if (!stateRegex.test(state.toUpperCase())) {
      setError('Please enter a valid 2-letter state code');
      setLoading(false);
      return;
    }

    // Build selected follow-up days from UI
    const selectedFollowupDays: number[] = [];
    if (followupDays.day4) selectedFollowupDays.push(4);
    if (followupDays.day8) selectedFollowupDays.push(8);
    if (followupDays.day12) selectedFollowupDays.push(12);
    if (followupDays.day16) selectedFollowupDays.push(16);
    if (followupDays.day20) selectedFollowupDays.push(20);

    if (selectedFollowupDays.length === 0) {
      setError('Please select at least one follow-up day');
      setLoading(false);
      return;
    }

    if (availableSamples.length === 0) {
      setError('Please select at least one sample product');
      setLoading(false);
      return;
    }

    try {
      const promoOffer = `${promoPercentage}% Off In-Store Purchase`;
      const response = await fetch('/api/displays/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayId,
          storeName,
          address,
          city,
          state: state.toUpperCase(),
          zip,
          timezone,
          promoOffer,
          followupDays: selectedFollowupDays,
          pin,
          ownerName,
          ownerPhone,
          ownerEmail,
          adminName: adminSameAsOwner ? ownerName : adminName,
          adminPhone: adminSameAsOwner ? ownerPhone : adminPhone,
          adminEmail: adminSameAsOwner ? ownerEmail : adminEmail,
          purchasingManager: purchasingSameAsOwner ? ownerName : purchasingManager,
          purchasingPhone: purchasingSameAsOwner ? ownerPhone : purchasingPhone,
          purchasingEmail: purchasingSameAsOwner ? ownerEmail : purchasingEmail,
          availableSamples,
          availableProducts,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to activate display');
        setLoading(false);
        return;
      }

      // Success - clear wizard progress and go to success page
      saveProgress({ currentStep: 6, activated: true });
      clearProgress();
      router.push(`/setup/${displayId}/success?storeId=${data.storeId}`);
    } catch (err) {
      setError('An error occurred while activating the display');
      setLoading(false);
    }
  };

  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }

  const isFormValid = storeName && city && state && zip && ownerName && ownerEmail && ownerPhone && pin.length === 4;

  return (
    <WizardLayout
      currentStep={6}
      totalSteps={8}
      stepLabel="Activate"
      displayId={displayId}
      showNext={false}
    >
      <div className="pb-20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Activate Your Store
          </h1>
          <p className="text-gray-600">
            Connect your display to our system
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Store Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Store Name *</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Main Street Pharmacy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State *</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    required
                    maxLength={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 uppercase"
                    placeholder="NY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ZIP Code *</label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  required
                  maxLength={5}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Owner Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Owner Name *</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner Email *</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="owner@store.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner Phone *</label>
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Program Administrator */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-2">Program Administrator</h2>
            <p className="text-sm text-gray-600 mb-4">
              This person will manage the system and receive updates on redemptions and promos.
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={adminSameAsOwner}
                  onChange={(e) => setAdminSameAsOwner(e.target.checked)}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Same as owner</span>
              </label>

              {!adminSameAsOwner && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Admin Name *</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required={!adminSameAsOwner}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Admin Email *</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required={!adminSameAsOwner}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="admin@store.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Admin Phone *</label>
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      required={!adminSameAsOwner}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Purchasing Manager */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-2">Purchasing Manager</h2>
            <p className="text-sm text-gray-600 mb-4">
              Person in charge of purchasing additional samples and larger product sizes.
            </p>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={purchasingSameAsOwner}
                  onChange={(e) => setPurchasingSameAsOwner(e.target.checked)}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Same as owner</span>
              </label>

              {!purchasingSameAsOwner && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchasing Manager Name</label>
                    <input
                      type="text"
                      value={purchasingManager}
                      onChange={(e) => setPurchasingManager(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Bob Johnson"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchasing Manager Email</label>
                    <input
                      type="email"
                      value={purchasingEmail}
                      onChange={(e) => setPurchasingEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="purchasing@store.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchasing Manager Phone</label>
                    <input
                      type="tel"
                      value={purchasingPhone}
                      onChange={(e) => setPurchasingPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="(555) 987-6543"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Admin PIN */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Admin PIN</h2>
            <div>
              <label className="block text-sm font-medium mb-1">4-Digit PIN *</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
                maxLength={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-2xl font-mono text-center"
                placeholder="1234"
              />
              <p className="text-xs text-gray-500 mt-1">
                This PIN is used to log in to your admin dashboard and verify redemptions. Make it easy to remember.
              </p>
            </div>
          </div>

          {/* Sample Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Available Samples</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which sample products your store will offer:
            </p>
            
            <div className="space-y-2">
              {SAMPLE_OPTIONS.map((sample) => (
                <label key={sample.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={availableSamples.includes(sample.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAvailableSamples([...availableSamples, sample.value]);
                      } else {
                        setAvailableSamples(availableSamples.filter(s => s !== sample.value));
                      }
                    }}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600"
                  />
                  <div className="text-sm">
                    <div className="font-medium">{sample.label.split(' - ')[0]}</div>
                    <div className="text-gray-500">{sample.label.split(' - ')[1]}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Available Products for Purchase</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which full-size products your store will carry. When customers redeem their promo code, they'll choose from these products. <span className="text-purple-600 font-medium">(Optional - you can add these later)</span>
            </p>
            
            {!brandInfo ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
                Loading brand information...
              </div>
            ) : products.length === 0 && brandInfo ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500 text-sm">
                <div>No products available yet.</div>
                <div className="text-xs mt-2">You can add products later from your dashboard.</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {products.map((product) => (
                  <label key={product.sku} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={availableProducts.includes(product.sku)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAvailableProducts([...availableProducts, product.sku]);
                        } else {
                          setAvailableProducts(availableProducts.filter(s => s !== product.sku));
                        }
                      }}
                      className="w-5 h-5 mt-0.5 rounded border-gray-300 text-purple-600"
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {product.featured && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">⭐ Featured</span>
                        )}
                      </div>
                      {product.description && (
                        <div className="text-gray-600 mt-0.5">{product.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {product.category && (
                          <span className="text-xs text-gray-500">{product.category}</span>
                        )}
                        <span className="text-xs font-semibold text-gray-900">${parseFloat(product.price).toFixed(2)}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3">
              💡 You can manage your product offerings later from your store dashboard
            </p>
          </div>

          {/* Display Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Display Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Timezone *</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Phoenix">Arizona Time (AZ)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AK)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discount Percentage *</label>
                <select
                  value={promoPercentage}
                  onChange={(e) => setPromoPercentage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="10">10% Off In-Store Purchase</option>
                  <option value="15">15% Off In-Store Purchase</option>
                  <option value="20">20% Off In-Store Purchase</option>
                  <option value="25">25% Off In-Store Purchase</option>
                  <option value="30">30% Off In-Store Purchase</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Customer Follow-up Timing *</label>
                <p className="text-sm text-gray-600 mb-2">Select the days after the initial sample is given to send follow-up texts with promo offers.</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={followupDays.day4}
                      onChange={(e) => setFollowupDays({ ...followupDays, day4: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">Day 4</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={followupDays.day8}
                      onChange={(e) => setFollowupDays({ ...followupDays, day8: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">Day 8</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={followupDays.day12}
                      onChange={(e) => setFollowupDays({ ...followupDays, day12: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">Day 12</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={followupDays.day16}
                      onChange={(e) => setFollowupDays({ ...followupDays, day16: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">Day 16</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={followupDays.day20}
                      onChange={(e) => setFollowupDays({ ...followupDays, day20: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">Day 20</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              loading || !isFormValid
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg'
            }`}
          >
            {loading ? 'Activating...' : '🚀 Activate My Display'}
          </button>
        </form>
      </div>
    </WizardLayout>
  );
}
