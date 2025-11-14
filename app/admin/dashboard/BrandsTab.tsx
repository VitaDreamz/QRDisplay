'use client';

import { useState } from 'react';
import Link from 'next/link';

type Organization = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  type: string;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  customerServiceEmail: string | null;
  customerServicePhone: string | null;
  commissionRate: number;
  brandTier: string;
  brandStatus: string;
  maxStoresPerMonth: number;
  maxSampleProducts: number;
  maxFullSizeProducts: number;
  storesAddedThisMonth: number;
  currentActiveStores: number;
  transactionFeePercent: number;
  monthlyPlatformFee: number;
  approvalStatus: string;
  createdAt: Date;
};

type StoreBrandPartnership = {
  id: string;
  storeId: string;
  store: {
    storeId: string;
    storeName: string;
    city: string | null;
    state: string | null;
  };
};

type Product = {
  sku: string;
  name: string;
  category: string;
};

type BrandDetails = Organization & {
  partnerships: StoreBrandPartnership[];
  products: Product[];
};

export function BrandsTab({ 
  organizations 
}: { 
  organizations: Organization[];
}) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [brandDetails, setBrandDetails] = useState<Record<string, BrandDetails>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const toggleBrand = async (orgId: string) => {
    if (expandedBrand === orgId) {
      setExpandedBrand(null);
      return;
    }

    setExpandedBrand(orgId);

    // Load full details if not already loaded
    if (!brandDetails[orgId]) {
      setLoading(orgId);
      try {
        const res = await fetch(`/api/admin/brands/${orgId}/details`);
        const data = await res.json();
        if (data.success) {
          setBrandDetails(prev => ({ ...prev, [orgId]: data.brand }));
        }
      } catch (err) {
        console.error('Failed to load brand details:', err);
      } finally {
        setLoading(null);
      }
    }
  };

  const clientBrands = organizations.filter(org => org.type === 'client');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Brand Management</h2>
        <Link
          href="/admin/brands/new"
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          + Add New Brand
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y">
          {clientBrands.map((brand) => {
            const isExpanded = expandedBrand === brand.orgId;
            const details = brandDetails[brand.orgId];
            const isLoading = loading === brand.orgId;

            return (
              <div key={brand.id} className="border-b last:border-b-0">
                {/* Brand Header (Collapsed View) */}
                <button
                  onClick={() => toggleBrand(brand.orgId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-600 font-bold text-lg">
                          {brand.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">{brand.name}</h3>
                      <p className="text-sm text-gray-600">{brand.orgId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Stores</div>
                      <div className="font-semibold">{brand.currentActiveStores} / {brand.maxStoresPerMonth}</div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      brand.brandStatus === 'active' ? 'bg-green-100 text-green-800' :
                      brand.brandStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {brand.brandStatus}
                    </span>
                    
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-gray-50 border-t">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-600 mt-2">Loading details...</p>
                      </div>
                    ) : details ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          {/* Contact Information */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600">Support Email:</span> <a href={`mailto:${brand.supportEmail}`} className="text-purple-600 hover:underline">{brand.supportEmail || '—'}</a></div>
                              <div><span className="text-gray-600">Support Phone:</span> {brand.supportPhone || '—'}</div>
                              <div><span className="text-gray-600">Customer Service Email:</span> <a href={`mailto:${brand.customerServiceEmail}`} className="text-purple-600 hover:underline">{brand.customerServiceEmail || '—'}</a></div>
                              <div><span className="text-gray-600">Customer Service Phone:</span> {brand.customerServicePhone || '—'}</div>
                              <div><span className="text-gray-600">Website:</span> <a href={brand.websiteUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">{brand.websiteUrl || '—'}</a></div>
                            </div>
                          </div>

                          {/* Subscription & Limits */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Subscription & Limits</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600">Tier:</span> <span className="font-medium capitalize">{brand.brandTier}</span></div>
                              <div><span className="text-gray-600">Status:</span> <span className="font-medium capitalize">{brand.brandStatus}</span></div>
                              <div><span className="text-gray-600">Approval:</span> <span className="font-medium capitalize">{brand.approvalStatus}</span></div>
                              <div><span className="text-gray-600">Max Stores/Month:</span> {brand.maxStoresPerMonth}</div>
                              <div><span className="text-gray-600">Stores Added This Month:</span> {brand.storesAddedThisMonth}</div>
                              <div><span className="text-gray-600">Current Active Stores:</span> {brand.currentActiveStores}</div>
                              <div><span className="text-gray-600">Max Sample Products:</span> {brand.maxSampleProducts}</div>
                              <div><span className="text-gray-600">Max Full-Size Products:</span> {brand.maxFullSizeProducts}</div>
                            </div>
                          </div>

                          {/* Financial */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Financial</h4>
                            <div className="space-y-1 text-sm">
                              <div><span className="text-gray-600">Commission Rate:</span> {brand.commissionRate}%</div>
                              <div><span className="text-gray-600">Transaction Fee:</span> {brand.transactionFeePercent}%</div>
                              <div><span className="text-gray-600">Monthly Platform Fee:</span> ${brand.monthlyPlatformFee}</div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {/* Partner Stores */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                              Partner Stores ({details.partnerships?.length || 0})
                            </h4>
                            {details.partnerships && details.partnerships.length > 0 ? (
                              <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                                {details.partnerships.map((partnership) => (
                                  <div key={partnership.id} className="flex items-center justify-between py-1 px-2 hover:bg-white rounded">
                                    <span>{partnership.store.storeName}</span>
                                    <span className="text-gray-500 text-xs">
                                      {partnership.store.city}, {partnership.store.state}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No partner stores yet</p>
                            )}
                          </div>

                          {/* Products */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                              Products ({details.products?.length || 0})
                            </h4>
                            {details.products && details.products.length > 0 ? (
                              <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                                {details.products.map((product) => (
                                  <div key={product.sku} className="flex items-center justify-between py-1 px-2 hover:bg-white rounded">
                                    <span className="font-mono text-xs">{product.sku}</span>
                                    <span className="text-gray-700">{product.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No products yet</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="pt-4 border-t">
                            <Link
                              href={`/admin/brands/${brand.orgId}`}
                              className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              View Full Details & Edit
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Failed to load details</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {clientBrands.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No brands yet. Click "Add New Brand" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
