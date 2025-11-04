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
  const [followupDays, setFollowupDays] = useState({ day4: true, day12: true });
  const [pin, setPin] = useState('');
  
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSameAsOwner, setAdminSameAsOwner] = useState(true);
  
  const [purchasingManager, setPurchasingManager] = useState('');
  const [purchasingPhone, setPurchasingPhone] = useState('');
  const [purchasingEmail, setPurchasingEmail] = useState('');
  const [purchasingSameAsOwner, setPurchasingSameAsOwner] = useState(true);
  
  const [availableSamples, setAvailableSamples] = useState<string[]>(
    SAMPLE_OPTIONS.map(s => s.value) // Default to all samples
  );

  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
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

    const selectedFollowupDays = [4, 12]; // Default to day 4 and 12

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

          {/* Staff PIN */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Staff PIN</h2>
            
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
                Staff will use this PIN to redeem samples
              </p>
            </div>
          </div>

          {/* Sample Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Available Samples</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select which products your store will offer:
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
