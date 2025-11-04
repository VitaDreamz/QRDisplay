'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SAMPLE_OPTIONS } from '@/lib/constants';

interface BrandInfo {
  name: string;
  logoUrl: string | null;
  supportEmail: string;
  supportPhone: string | null;
}

export default function ActivateDisplay({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [brandInfo, setBrandInfo] = useState<BrandInfo | null>(null);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [promoPercentage, setPromoPercentage] = useState('20');
  const [followupDays, setFollowupDays] = useState({
    day2: false,
    day4: true,
    day8: false,
    day12: true,
    day14: false,
  });
  const [pin, setPin] = useState('');
  
  // Owner (business owner/main decision maker)
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  // Program Administrator (day-to-day manager)
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSameAsOwner, setAdminSameAsOwner] = useState(false);
  
  // Purchasing Manager
  const [purchasingManager, setPurchasingManager] = useState('');
  const [purchasingPhone, setPurchasingPhone] = useState('');
  const [purchasingEmail, setPurchasingEmail] = useState('');
  const [purchasingSameAsOwner, setPurchasingSameAsOwner] = useState(false);
  
  // Available Samples
  const [availableSamples, setAvailableSamples] = useState<string[]>([]);

    // Unwrap params Promise and fetch brand info
    useEffect(() => {
      params.then(async (p) => {
        setDisplayId(p.displayId);
      
        // Fetch display and brand info
        try {
          const res = await fetch(`/api/displays/${p.displayId}/brand`);
          if (res.ok) {
            const data = await res.json();
            setBrandInfo(data);
          }
        } catch (err) {
          console.error('Failed to fetch brand info:', err);
        }
      });
    }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate admin email (or owner email if admin is same as owner)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const adminEmailToUse = adminSameAsOwner ? ownerEmail : adminEmail;
    if (!emailRegex.test(adminEmailToUse)) {
      setError('Please enter a valid admin email address');
      setLoading(false);
      return;
    }

    // Validate admin phone (or owner phone if admin is same as owner)
    const phoneRegex = /^[\+\d\s\-\(\)]{10,15}$/;
    const adminPhoneToUse = adminSameAsOwner ? ownerPhone : adminPhone;
    if (!phoneRegex.test(adminPhoneToUse)) {
      setError('Please enter a valid admin phone number');
      setLoading(false);
      return;
    }

    // Validate PIN (4 digits)
    const pinRegex = /^\d{4}$/;
    if (!pinRegex.test(pin)) {
      setError('PIN must be exactly 4 digits');
      setLoading(false);
      return;
    }

    // Validate ZIP (5 digits)
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zip)) {
      setError('Please enter a valid 5-digit ZIP code');
      setLoading(false);
      return;
    }

    // Validate state (2 uppercase letters)
    const stateRegex = /^[A-Z]{2}$/;
    if (!stateRegex.test(state)) {
      setError('Please enter a valid 2-letter state code (e.g., NY)');
      setLoading(false);
      return;
    }

    // Convert followup days to array
    const selectedFollowupDays: number[] = [];
    if (followupDays.day2) selectedFollowupDays.push(2);
    if (followupDays.day4) selectedFollowupDays.push(4);
    if (followupDays.day8) selectedFollowupDays.push(8);
    if (followupDays.day12) selectedFollowupDays.push(12);
    if (followupDays.day14) selectedFollowupDays.push(14);

    if (selectedFollowupDays.length !== 2) {
      setError('Please select exactly two follow-up days');
      setLoading(false);
      return;
    }

    // Validate available samples (require at least 1)
    if (availableSamples.length === 0) {
      setError('Please select at least one sample product that your store will offer');
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
          state,
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

      // Success - redirect to success page
      router.push(`/activate/${displayId}/success?storeId=${data.storeId}&storeName=${encodeURIComponent(data.storeName)}`);
    } catch (err) {
      setError('An error occurred while activating the display');
      setLoading(false);
    }
  };

  if (!displayId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow px-6 py-8">
          <div className="mb-8 text-center">
            {brandInfo?.logoUrl && (
              <div className="mb-6">
                <img 
                  src={brandInfo.logoUrl} 
                  alt={`${brandInfo.name} logo`}
                  className="h-20 w-20 mx-auto rounded-lg object-contain"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Activate Your {brandInfo?.name || 'Sample'} Display
            </h1>
            <p className="text-gray-600">Display ID: {displayId}</p>
            <p className="text-sm text-gray-500 mt-2">
              Please fill out this form to activate your Sample Display kit and start your automated sampling program!
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Store Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    id="storeName"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Main Street Pharmacy"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="address"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-3">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="New York"
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="NY"
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      id="zip"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      maxLength={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Owner Information</h2>
              <p className="text-sm text-gray-600 mb-4">Business owner / main decision maker</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label htmlFor="ownerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Phone *
                  </label>
                  <input
                    type="tel"
                    id="ownerPhone"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="ownerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    id="ownerEmail"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="owner@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Program Administrator Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Program Administrator</h2>
              <p className="text-sm text-gray-600 mb-4">Day-to-day manager who will oversee the sampling program (receives notifications and manages dashboard)</p>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={adminSameAsOwner}
                    onChange={(e) => setAdminSameAsOwner(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Same as owner</span>
                </label>

                {!adminSameAsOwner && (
                  <>
                    <div>
                      <label htmlFor="adminName" className="block text-sm font-medium text-gray-700 mb-1">
                        Administrator Name *
                      </label>
                      <input
                        type="text"
                        id="adminName"
                        required={!adminSameAsOwner}
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Jane Smith"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Administrator Phone *
                      </label>
                      <input
                        type="tel"
                        id="adminPhone"
                        required={!adminSameAsOwner}
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div>
                      <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Administrator Email *
                      </label>
                      <input
                        type="email"
                        id="adminEmail"
                        required={!adminSameAsOwner}
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="admin@example.com"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Purchasing Manager Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Purchasing Manager</h2>
              <p className="text-sm text-gray-600 mb-4">Person responsible for inventory ordering and restocking</p>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={purchasingSameAsOwner}
                    onChange={(e) => setPurchasingSameAsOwner(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Same as owner (saves time for small shops)</span>
                </label>

                {!purchasingSameAsOwner && (
                  <>
                    <div>
                      <label htmlFor="purchasingManager" className="block text-sm font-medium text-gray-700 mb-1">
                        Purchasing Manager Name
                      </label>
                      <input
                        type="text"
                        id="purchasingManager"
                        value={purchasingManager}
                        onChange={(e) => setPurchasingManager(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Bob Johnson"
                      />
                    </div>

                    <div>
                      <label htmlFor="purchasingPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Purchasing Manager Phone
                      </label>
                      <input
                        type="tel"
                        id="purchasingPhone"
                        value={purchasingPhone}
                        onChange={(e) => setPurchasingPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="(555) 987-6543"
                      />
                    </div>

                    <div>
                      <label htmlFor="purchasingEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Purchasing Manager Email
                      </label>
                      <input
                        type="email"
                        id="purchasingEmail"
                        value={purchasingEmail}
                        onChange={(e) => setPurchasingEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="purchasing@example.com"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sample Selection */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Selection</h2>
              <p className="text-sm text-gray-600 mb-4">
                Which samples does your store carry? Check all that apply. Customers will only see the samples you select.
              </p>
              
              <div className="space-y-3 border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
                {SAMPLE_OPTIONS.map(sample => (
                  <label 
                    key={sample.value} 
                    className="flex items-start gap-3 cursor-pointer hover:bg-white p-3 rounded-md transition-colors"
                  >
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
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{sample.label}</span>
                  </label>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                <span>💡</span>
                <span>You can update these selections later in your dashboard</span>
              </p>
            </div>

            {/* Settings */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Display Settings</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone *
                  </label>
                  <select
                    id="timezone"
                    required
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
                  <label htmlFor="promoPercentage" className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage *
                  </label>
                  <select
                    id="promoPercentage"
                    value={promoPercentage}
                    onChange={(e) => setPromoPercentage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="10">10% Off In-Store Purchase</option>
                    <option value="15">15% Off In-Store Purchase</option>
                    <option value="20">20% Off In-Store Purchase</option>
                    <option value="25">25% Off In-Store Purchase</option>
                    <option value="30">30% Off In-Store Purchase</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose the discount percentage customers receive on their first in-store purchase
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Automated Customer Follow-up Schedule *
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Select when to send follow-up messages to customers after they initially scan your QR code (select 2):
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={followupDays.day2}
                        onChange={(e) => setFollowupDays({ ...followupDays, day2: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">2 days after scan</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={followupDays.day4}
                        onChange={(e) => setFollowupDays({ ...followupDays, day4: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">4 days after scan</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={followupDays.day8}
                        onChange={(e) => setFollowupDays({ ...followupDays, day8: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">8 days after scan</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={followupDays.day12}
                        onChange={(e) => setFollowupDays({ ...followupDays, day12: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">12 days after scan</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={followupDays.day14}
                        onChange={(e) => setFollowupDays({ ...followupDays, day14: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">14 days after scan</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                    4-Digit PIN *
                  </label>
                  <input
                    type="text"
                    id="pin"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                    pattern="\d{4}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1234"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    For Verifying Samples & Promo Redemptions. Make it easy to remember (e.g., 1234, 2468)
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Activating...' : 'Activate Display'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Questions? Contact support at{' '}
              {brandInfo ? (
                <>
                  <a href={`mailto:${brandInfo.supportEmail}`} className="text-blue-600 hover:text-blue-700">
                    {brandInfo.supportEmail}
                  </a>
                  {brandInfo.supportPhone && (
                    <>
                      {' or '}
                      <a href={`tel:${brandInfo.supportPhone}`} className="text-blue-600 hover:text-blue-700">
                        {brandInfo.supportPhone}
                      </a>
                    </>
                  )}
                </>
              ) : (
                'support@qrdisplay.com'
              )}
            </p>
        </div>
      </div>
    </div>
  );
}
