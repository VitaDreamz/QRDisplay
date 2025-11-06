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
  const { progress, saveProgress, clearProgress } = useWizardProgress(displayId);

  // Form state - using same structure as existing activation
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [promoPercentage, setPromoPercentage] = useState('20');
  const [returningPromoPercentage, setReturningPromoPercentage] = useState('10');
  // Follow up timings per request: Day 4, 8, 12, 16, 20
  const [followupDays, setFollowupDays] = useState({
    day4: true,
    day8: false,
    day12: true,
    day16: false,
    day20: false,
  });
  // Retention follow-up timing: 15, 30, 45, 60, 90 days
  const [retentionDays, setRetentionDays] = useState({
    day15: false,
    day30: false,
    day45: true,
    day60: false,
    day90: true,
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
  
  // Products are now selected on the next step (Products page)
  const [products, setProducts] = useState<any[]>([]);
  const [brandInfo, setBrandInfo] = useState<any>(null);

  // Load saved progress and pre-fill form fields
  useEffect(() => {
    if (progress) {
      console.log('📋 Loading saved progress:', progress);
      if (progress.storeName) setStoreName(progress.storeName);
      if (progress.address) setAddress(progress.address);
      if (progress.city) setCity(progress.city);
      if (progress.state) setState(progress.state);
      if (progress.zip) setZip(progress.zip);
      if (progress.timezone) setTimezone(progress.timezone);
      if (progress.promoPercentage) setPromoPercentage(progress.promoPercentage);
      if (progress.returningPromoPercentage) setReturningPromoPercentage(progress.returningPromoPercentage);
      if (progress.followupDays) setFollowupDays(progress.followupDays);
      if (progress.retentionDays) setRetentionDays(progress.retentionDays);
      if (progress.pin) setPin(progress.pin);
      if (progress.ownerName) setOwnerName(progress.ownerName);
      if (progress.ownerPhone) setOwnerPhone(progress.ownerPhone);
      if (progress.ownerEmail) setOwnerEmail(progress.ownerEmail);
      if (progress.adminName) setAdminName(progress.adminName);
      if (progress.adminPhone) setAdminPhone(progress.adminPhone);
      if (progress.adminEmail) setAdminEmail(progress.adminEmail);
      if (progress.adminSameAsOwner !== undefined) setAdminSameAsOwner(progress.adminSameAsOwner);
      if (progress.purchasingManager) setPurchasingManager(progress.purchasingManager);
      if (progress.purchasingPhone) setPurchasingPhone(progress.purchasingPhone);
      if (progress.purchasingEmail) setPurchasingEmail(progress.purchasingEmail);
      if (progress.purchasingSameAsOwner !== undefined) setPurchasingSameAsOwner(progress.purchasingSameAsOwner);
    }
  }, [progress]);

  useEffect(() => {
    params.then(async (p) => {
      setDisplayId(p.displayId);
      
      // Simplified: Just fetch products directly for VitaDreamz
      try {
        console.log('[Activate] Fetching products for VitaDreamz');
        const orgId = 'ORG-VITADREAMZ';
        const productsRes = await fetch(`/api/products?orgId=${orgId}`);
        console.log('[Activate] Products response status:', productsRes.status);
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          console.log('[Activate] Products fetched:', productsData.products?.length || 0);
          setProducts(productsData.products || []);
        } else {
          const errorText = await productsRes.text();
          console.error('[Activate] Products fetch failed:', productsRes.status, errorText);
        }
      } catch (err) {
        console.error('[Activate] Failed to fetch products:', err);
      }
    });
  }, [params]);
  // Move activation submit to next step; this page now only collects store/admin details
  const goToProductsStep = () => {
    // Persist current form fields to progress and navigate
    saveProgress({
      currentStep: 7,
      storeName,
      address,
      city,
      state,
      zip,
      timezone,
      promoPercentage,
      returningPromoPercentage,
      followupDays,
      retentionDays,
      pin,
      ownerName,
      ownerPhone,
      ownerEmail,
      adminName,
      adminPhone,
      adminEmail,
      adminSameAsOwner,
      purchasingManager,
      purchasingPhone,
      purchasingEmail,
      purchasingSameAsOwner,
    });
    router.push(`/setup/${displayId}/products`);
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
      totalSteps={9}
      stepLabel="Store Details"
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

  <form className="space-y-6">
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

          {/* Samples and Products moved to next step */}

          {/* Automated-Marketing Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Automated-Marketing Settings</h2>
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
                <label className="block text-sm font-medium mb-1">1st Purchase Promo *</label>
                <select
                  value={promoPercentage}
                  onChange={(e) => setPromoPercentage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="0">No Promo</option>
                  <option value="5">5% Off In-Store Purchase</option>
                  <option value="10">10% Off In-Store Purchase</option>
                  <option value="15">15% Off In-Store Purchase</option>
                  <option value="20">20% Off In-Store Purchase</option>
                  <option value="25">25% Off In-Store Purchase</option>
                  <option value="30">30% Off In-Store Purchase</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">Discount for first-time customers</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Initial Follow-up Timing *</label>
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

              <div>
                <label className="block text-sm font-medium mb-1">Returning Customer Promo *</label>
                <select
                  value={returningPromoPercentage}
                  onChange={(e) => setReturningPromoPercentage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="0">No Promo</option>
                  <option value="5">5% Off In-Store Purchase</option>
                  <option value="10">10% Off In-Store Purchase</option>
                  <option value="15">15% Off In-Store Purchase</option>
                  <option value="20">20% Off In-Store Purchase</option>
                  <option value="25">25% Off In-Store Purchase</option>
                  <option value="30">30% Off In-Store Purchase</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">Discount for repeat customers</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Retention Follow-up Timing *</label>
                <p className="text-sm text-gray-600 mb-2">Select when to send follow-up messages after a customer makes a purchase (select 2).</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retentionDays.day15}
                      onChange={(e) => setRetentionDays({ ...retentionDays, day15: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">15 Days</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retentionDays.day30}
                      onChange={(e) => setRetentionDays({ ...retentionDays, day30: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">30 Days</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retentionDays.day45}
                      onChange={(e) => setRetentionDays({ ...retentionDays, day45: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">45 Days</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retentionDays.day60}
                      onChange={(e) => setRetentionDays({ ...retentionDays, day60: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">60 Days</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retentionDays.day90}
                      onChange={(e) => setRetentionDays({ ...retentionDays, day90: e.target.checked })}
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm">90 Days</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Next Button to Products Step */}
          <button
            type="button"
            disabled={loading || !isFormValid}
            onClick={goToProductsStep}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
              loading || !isFormValid
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg'
            }`}
          >
            Set-up Your Products
          </button>
        </form>
      </div>
    </WizardLayout>
  );
}
