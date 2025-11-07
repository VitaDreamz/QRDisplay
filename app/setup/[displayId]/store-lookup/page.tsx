'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

type ShopifyCustomer = {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  address?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
};

type ExistingStore = {
  storeId: string;
  storeName: string;
  city: string;
  state: string;
};

export default function StoreLookupPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress } = useWizardProgress(displayId);

  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupBusinessName, setLookupBusinessName] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const [shopifyCustomer, setShopifyCustomer] = useState<ShopifyCustomer | null>(null);
  const [existingStores, setExistingStores] = useState<ExistingStore[]>([]);

  useEffect(() => {
    params.then((p) => {
      setDisplayId(p.displayId);
    });
  }, [params]);

  const handleSearch = async () => {
    if (!lookupEmail && !lookupPhone && !lookupBusinessName) {
      setSearchError('Please enter an email, phone number, or business name');
      return;
    }

    setSearching(true);
    setSearchError('');
    setShopifyCustomer(null);
    setExistingStores([]);

    try {
      const query = new URLSearchParams();
      if (lookupEmail) query.set('email', lookupEmail);
      if (lookupPhone) query.set('phone', lookupPhone);
      if (lookupBusinessName) query.set('businessName', lookupBusinessName);
      query.set('displayId', displayId);

      const res = await fetch(`/api/stores/lookup?${query}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || 'Search failed');
        return;
      }

      if (data.shopifyCustomer) {
        setShopifyCustomer(data.shopifyCustomer);
      }

      if (data.existingStores && data.existingStores.length > 0) {
        setExistingStores(data.existingStores);
      }

      if (!data.shopifyCustomer && (!data.existingStores || data.existingStores.length === 0)) {
        setSearchError('No account found. You can create a new location below.');
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setSearchError('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddNewLocation = () => {
    // Save that this is a new location for an existing wholesale account
    // Note: Shopify format is firstName="Business Name", lastName="Wholesale"
    // We only use firstName for the business name field
    saveProgress({
      currentStep: 7,
      shopifyCustomerId: shopifyCustomer?.id,
      wholesaleBusinessName: shopifyCustomer?.firstName, // e.g. "Nature's Elite" (without "Wholesale")
      address: shopifyCustomer?.address,
      city: shopifyCustomer?.city,
      state: shopifyCustomer?.province,
      zip: shopifyCustomer?.zip,
      isNewLocation: true,
    });
    router.push(`/setup/${displayId}/activate`);
  };

  const handleCreateNewAccount = () => {
    // No Shopify account found, create entirely new
    saveProgress({
      currentStep: 7,
      shopifyCustomerId: undefined,
      wholesaleBusinessName: undefined,
      isNewLocation: true,
    });
    router.push(`/setup/${displayId}/activate`);
  };

  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }

  return (
    <WizardLayout
      currentStep={6}
      totalSteps={10}
      stepLabel="Store Lookup"
      displayId={displayId}
      showNext={false}
    >
      <div className="pb-20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Do you have a VitaDreamz wholesale account?
          </h1>
          <p className="text-gray-600">
            Let's find your account or create a new one
          </p>
        </div>

        {/* Initial choice */}
        {hasAccount === null && (
          <div className="space-y-4">
            <button
              onClick={() => setHasAccount(true)}
              className="w-full bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 py-4 px-6 rounded-lg font-semibold transition-colors"
            >
              Yes, I have an account
            </button>
            <button
              onClick={() => setHasAccount(false)}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-4 px-6 rounded-lg font-semibold transition-colors"
            >
              No, this is my first location
            </button>
          </div>
        )}

        {/* Search for existing account */}
        {hasAccount === true && !shopifyCustomer && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <button
                onClick={() => {
                  setHasAccount(null);
                  setLookupEmail('');
                  setLookupPhone('');
                  setLookupBusinessName('');
                  setSearchError('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                ← Back
              </button>
            </div>

            <h2 className="font-semibold text-lg">Find Your Account</h2>
            <p className="text-gray-600 text-sm">
              Enter the email, phone number, or business name associated with your wholesale account
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="wholesale@mystore.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div className="text-center text-gray-500 text-sm">OR</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>

            <div className="text-center text-gray-500 text-sm">OR</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={lookupBusinessName}
                onChange={(e) => setLookupBusinessName(e.target.value)}
                placeholder="Nature's Elite"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can enter a partial name - we'll find matches
              </p>
            </div>

            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-red-800 text-sm">{searchError}</div>
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={searching || (!lookupEmail && !lookupPhone && !lookupBusinessName)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        )}

        {/* Account found - continue to next step */}
        {shopifyCustomer && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✓</div>
                <div className="flex-1">
                  <div className="font-semibold text-green-900">Account Found!</div>
                  <div className="text-green-800 text-sm mt-1">
                    {shopifyCustomer.firstName} {shopifyCustomer.lastName}
                    {shopifyCustomer.companyName && (
                      <span className="block">{shopifyCustomer.companyName}</span>
                    )}
                    <span className="block">{shopifyCustomer.email}</span>
                    {shopifyCustomer.phone && <span className="block">{shopifyCustomer.phone}</span>}
                  </div>
                </div>
              </div>
            </div>

            {existingStores.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-900">
                  <strong>Note:</strong> We found {existingStores.length} existing location{existingStores.length > 1 ? 's' : ''} for this account. 
                  You'll set up this display as a new or additional location in the next step.
                </div>
              </div>
            )}

            <button
              onClick={handleAddNewLocation}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue to Store Setup →
            </button>

            <button
              onClick={() => {
                setShopifyCustomer(null);
                setExistingStores([]);
                setLookupEmail('');
                setLookupPhone('');
                setLookupBusinessName('');
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-700"
            >
              ← Search Again
            </button>
          </div>
        )}

        {/* No account */}
        {hasAccount === false && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <button
                onClick={() => setHasAccount(null)}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                ← Back
              </button>
            </div>

            <div className="text-center py-6">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="font-semibold text-lg mb-2">Welcome to VitaDreamz!</h2>
              <p className="text-gray-600 text-sm mb-6">
                Let's create your wholesale account and set up your first location
              </p>

              <button
                onClick={handleCreateNewAccount}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Create New Account
              </button>
            </div>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
