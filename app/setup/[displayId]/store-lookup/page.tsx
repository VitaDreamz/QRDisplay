'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';
import { toStateAbbreviation } from '@/lib/states';

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

type SearchResult = {
  type: 'shopify' | 'existing';
  shopifyCustomer?: ShopifyCustomer;
  existingStore?: ExistingStore;
  displayText: string;
  subText: string;
};

export default function StoreLookupPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress } = useWizardProgress(displayId);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showAllResults, setShowAllResults] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Limit visible results (like Shopify does)
  const INITIAL_RESULTS_LIMIT = 7;
  const visibleResults = showAllResults 
    ? searchResults 
    : searchResults.slice(0, INITIAL_RESULTS_LIMIT);

  useEffect(() => {
    params.then((p) => {
      setDisplayId(p.displayId);
    });
  }, [params]);

  // Debounced search as user types
  useEffect(() => {
    if (!displayId) return;
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const query = new URLSearchParams();
        query.set('query', searchQuery);
        query.set('displayId', displayId);

        const res = await fetch(`/api/stores/lookup?${query}`);
        const data = await res.json();

        if (!res.ok) {
          setSearchResults([]);
          setShowResults(false);
          return;
        }

        const results: SearchResult[] = [];

        // Add ALL Shopify customers (filtered to wholesale only on backend)
        if (data.shopifyCustomers && data.shopifyCustomers.length > 0) {
          data.shopifyCustomers.forEach((customer: ShopifyCustomer) => {
            results.push({
              type: 'shopify',
              shopifyCustomer: customer,
              displayText: customer.firstName, // Business name
              subText: `${customer.city || 'Unknown City'}, ${customer.province || 'Unknown State'}`, // Just location, no email/phone
            });
          });
        }

        // Add existing stores
        if (data.existingStores && data.existingStores.length > 0) {
          data.existingStores.forEach((store: ExistingStore) => {
            results.push({
              type: 'existing',
              existingStore: store,
              displayText: store.storeName,
              subText: `${store.city}, ${store.state} • Already in system`,
            });
          });
        }

        setSearchResults(results);
        setTotalResults(results.length);
        setShowResults(results.length > 0);
        setShowAllResults(false); // Reset when new search happens
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, displayId]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'shopify' && result.shopifyCustomer) {
      // Save Shopify customer info and continue (convert state to abbreviation)
      saveProgress({
        currentStep: 7,
        shopifyCustomerId: result.shopifyCustomer.id,
        wholesaleBusinessName: result.shopifyCustomer.firstName,
        address: result.shopifyCustomer.address,
        city: result.shopifyCustomer.city,
        state: toStateAbbreviation(result.shopifyCustomer.province), // Convert to 2-letter code
        zip: result.shopifyCustomer.zip,
        isNewLocation: true,
      });
      router.push(`/setup/${displayId}/activate`);
    } else if (result.type === 'existing' && result.existingStore) {
      // For existing stores, we might want to show more info or prevent duplicate
      // For now, let's just show the account was found
      alert('This location is already set up in our system. Please contact support if you need to update it.');
    }
  };

  const handleCreateNewAccount = () => {
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
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Find Your Wholesale Account
          </h1>
          <p className="text-gray-600 text-sm">
            Search by business name, email, or phone number
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, email, or phone..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-10 text-lg focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Enter your business name (e.g., "Nature's Elite"), email address, or phone number
          </p>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[500px] overflow-y-auto">
              {visibleResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 transition-colors"
                >
                  <div className="font-medium text-gray-900">{result.displayText}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{result.subText}</div>
                </button>
              ))}
              
              {/* Show More Button (like Shopify) */}
              {!showAllResults && searchResults.length > INITIAL_RESULTS_LIMIT && (
                <button
                  onClick={() => setShowAllResults(true)}
                  className="w-full text-left px-4 py-3 text-blue-600 hover:bg-blue-50 font-medium transition-colors border-t border-gray-200"
                >
                  Show {searchResults.length - INITIAL_RESULTS_LIMIT} more
                </button>
              )}
            </div>
          )}

          {/* No Results */}
          {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
              <div className="text-gray-600 text-sm text-center">
                No accounts found for "{searchQuery}"
              </div>
            </div>
          )}
        </div>

        {/* Create New Account Link */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm mb-3">Can't find your account?</p>
          <button
            onClick={handleCreateNewAccount}
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Create a new wholesale account
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
