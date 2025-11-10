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

        // Only show existing stores from our database
        if (data.existingStores && data.existingStores.length > 0) {
          data.existingStores.forEach((store: ExistingStore) => {
            results.push({
              type: 'existing',
              existingStore: store,
              displayText: store.storeName,
              subText: `${store.city}, ${store.state} • Store ID: ${store.storeId}`,
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

  const handleSelectResult = async (result: SearchResult) => {
    if (result.type === 'existing' && result.existingStore) {
      // User selected an existing store - load its full data
      console.log('🏪 Selecting existing store:', result.existingStore.storeId);
      
      try {
        // Fetch complete store details
        const storeRes = await fetch(`/api/stores/lookup?storeId=${result.existingStore.storeId}`);
        if (!storeRes.ok) {
          alert('Failed to load store details. Please try again.');
          return;
        }
        
        const storeData = await storeRes.json();
        const store = storeData.store;
        
        if (!store) {
          alert('Store not found. Please try again.');
          return;
        }
        
        console.log('📦 Fetched full store data:', store);
        
        // Fetch organization data to pre-fill contact details in Step 7
        let orgContactData = {};
        
        try {
          // Get orgId from the display (already assigned when display ships)
          const displayRes = await fetch(`/api/displays/${displayId}`);
          if (displayRes.ok) {
            const displayData = await displayRes.json();
            const orgId = displayData.display?.orgId;
            
            if (orgId) {
              const orgRes = await fetch(`/api/organizations/${orgId}`);
              if (orgRes.ok) {
                const orgData = await orgRes.json();
                console.log('📋 Fetched organization data for pre-fill:', orgData);
                
                orgContactData = {
                  orgOwnerName: orgData.organization?.ownerName,
                  orgOwnerPhone: orgData.organization?.ownerPhone,
                  orgOwnerEmail: orgData.organization?.ownerEmail,
                  orgPurchasingManager: orgData.organization?.purchasingManager,
                  orgPurchasingPhone: orgData.organization?.purchasingPhone,
                  orgPurchasingEmail: orgData.organization?.purchasingEmail,
                  orgCustomerServiceEmail: orgData.organization?.customerServiceEmail,
                  orgCustomerServicePhone: orgData.organization?.customerServicePhone,
                };
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch organization data:', err);
        }
        
        // Extract promo percentages from offer strings (e.g., "20% off first purchase" -> "20")
        const promoMatch = store.promoOffer?.match(/(\d+)%/);
        const returningPromoMatch = store.returningCustomerPromo?.match(/(\d+)%/);
        
        saveProgress({
          currentStep: 7,
          storeName: store.storeName,
          address: store.streetAddress,
          city: store.city,
          state: toStateAbbreviation(store.state), // Convert to 2-letter code
          zip: store.zipCode,
          timezone: store.timezone || 'America/New_York',
          promoPercentage: promoMatch ? promoMatch[1] : '20',
          returningPromoPercentage: returningPromoMatch ? returningPromoMatch[1] : '10',
          // Pre-fill contact info from existing store
          ownerName: store.ownerName,
          ownerPhone: store.ownerPhone,
          ownerEmail: store.ownerEmail,
          adminName: store.adminName,
          adminPhone: store.adminPhone,
          adminEmail: store.adminEmail,
          purchasingManager: store.purchasingManager,
          purchasingPhone: store.purchasingPhone,
          purchasingEmail: store.purchasingEmail,
          pin: store.staffPin,
          // Flags
          isNewLocation: false, // This is an existing store
          existingStoreId: store.storeId,
          orgId: store.orgId, // Save orgId so products step can use it
          shopifyCustomerId: store.shopifyCustomerId,
          ...orgContactData, // Organization data as fallback
        });
        console.log('✅ Saved existing store info to wizard progress');
        router.push(`/setup/${displayId}/activate`);
      } catch (err) {
        console.error('Failed to fetch store details:', err);
        alert('Failed to load store details. Please try again.');
      }
    }
  };

  const handleCreateNewAccount = () => {
    console.log('🆕 Creating new account - no Shopify customer linked');
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
          <h1 className="text-2xl font-bold text-white mb-2">
            Find Your Store
          </h1>
          <p className="text-pink-200 text-sm">
            Search by store name, city, or Store ID
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by store name, city, or Store ID..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 pr-10 text-lg focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          <p className="text-xs text-purple-200 mt-2">
            Enter your store name (e.g., "Nature's Elite"), city, or Store ID (e.g., "SID-019")
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
                No stores found for "{searchQuery}"
              </div>
            </div>
          )}
        </div>

        {/* Create New Account Link */}
        <div className="text-center mt-8 pt-6 border-t border-white/20">
          <p className="text-purple-200 text-sm mb-3">Don't see your store in the system?</p>
          <button
            onClick={handleCreateNewAccount}
            className="text-blue-300 hover:text-blue-200 font-medium underline"
          >
            Set up as a new store
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
