'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ShopifyProduct = {
  shopifyProductId: string;
  shopifyVariantId: string | null;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  tags: string[];
  variantCount: number;
  status: string;
};

type ProductSelection = {
  product: ShopifyProduct;
  sku?: string;
};

export default function ProductImportPage({ params }: { params: { orgId: string } }) {
  const router = useRouter();
  const [step, setStep] = useState<'sample' | 'retail' | 'wholesale'>('sample');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [sampleSelections, setSampleSelections] = useState<Map<string, ProductSelection>>(new Map());
  const [retailSelections, setRetailSelections] = useState<Map<string, ProductSelection>>(new Map());
  const [wholesaleSelections, setWholesaleSelections] = useState<Map<string, ProductSelection>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShopifyProducts();
  }, []);

  const fetchShopifyProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/shopify/fetch-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: params.orgId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch products');
      }

      const data = await response.json();
      setShopifyProducts(data.products);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (product: ShopifyProduct, productType: 'sample' | 'retail' | 'wholesale') => {
    const map = productType === 'sample' ? sampleSelections 
      : productType === 'retail' ? retailSelections 
      : wholesaleSelections;
    
    const setMap = productType === 'sample' ? setSampleSelections 
      : productType === 'retail' ? setRetailSelections 
      : setWholesaleSelections;

    const newMap = new Map(map);
    if (newMap.has(product.shopifyProductId)) {
      newMap.delete(product.shopifyProductId);
    } else {
      newMap.set(product.shopifyProductId, { product });
    }
    setMap(newMap);
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      
      // Combine all selections with their product types
      const allProducts = [
        ...Array.from(sampleSelections.values()).map(({ product, sku }) => ({
          ...product,
          productType: 'sample' as const,
          sku
        })),
        ...Array.from(retailSelections.values()).map(({ product, sku }) => ({
          ...product,
          productType: 'retail' as const,
          sku
        })),
        ...Array.from(wholesaleSelections.values()).map(({ product, sku }) => ({
          ...product,
          productType: 'wholesale' as const,
          sku
        }))
      ];

      if (allProducts.length === 0) {
        alert('Please select at least one product to import');
        return;
      }

      const response = await fetch('/api/admin/shopify/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: params.orgId,
          products: allProducts
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import products');
      }

      const data = await response.json();
      alert(`Successfully imported ${data.imported} products!`);
      router.push(`/admin/brands/${params.orgId}`);
      
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
      console.error('Import error:', err);
    } finally {
      setImporting(false);
    }
  };

  const getCurrentSelections = () => {
    return step === 'sample' ? sampleSelections 
      : step === 'retail' ? retailSelections 
      : wholesaleSelections;
  };

  const getStepTitle = () => {
    return step === 'sample' ? 'Select Sample Products' 
      : step === 'retail' ? 'Select Retail Products' 
      : 'Select Wholesale Products';
  };

  const getStepDescription = () => {
    return step === 'sample' 
      ? 'These products will be used for QR code promo redemptions' 
      : step === 'retail' 
      ? 'These products can be sold individually to customers'
      : 'These products are bulk boxes for wholesale ordering';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Shopify products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchShopifyProducts}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentSelections = getCurrentSelections();
  const totalSelected = sampleSelections.size + retailSelections.size + wholesaleSelections.size;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import Products from Shopify</h1>
        <p className="mt-2 text-gray-600">
          Select which products to import and categorize them as samples, retail, or wholesale
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {['sample', 'retail', 'wholesale'].map((s, idx) => (
              <li key={s} className={`relative ${idx !== 2 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
                <button
                  onClick={() => setStep(s as any)}
                  className="group flex items-center w-full"
                >
                  <span className="flex items-center px-6 py-4 text-sm font-medium">
                    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                      step === s 
                        ? 'bg-indigo-600 text-white' 
                        : (s === 'sample' ? sampleSelections : s === 'retail' ? retailSelections : wholesaleSelections).size > 0
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`ml-4 text-sm font-medium ${
                      step === s ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)} ({
                        (s === 'sample' ? sampleSelections : s === 'retail' ? retailSelections : wholesaleSelections).size
                      })
                    </span>
                  </span>
                </button>
                {idx !== 2 && (
                  <div className="absolute top-0 right-0 hidden h-full w-5 md:block" aria-hidden="true">
                    <svg className="h-full w-full text-gray-300" viewBox="0 0 22 80" fill="none" preserveAspectRatio="none">
                      <path d="M0 -2L20 40L0 82" vectorEffect="non-scaling-stroke" stroke="currentcolor" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{getStepTitle()}</h2>
        <p className="text-gray-600 mb-6">{getStepDescription()}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shopifyProducts.map(product => {
            const isSelected = currentSelections.has(product.shopifyProductId);
            
            return (
              <div
                key={product.shopifyProductId}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600' 
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => toggleSelection(product, step)}
              >
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-md mb-3"
                  />
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">${product.price}</p>
                    {product.variantCount > 1 && (
                      <p className="text-xs text-gray-500 mt-1">{product.variantCount} variants</p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>

        <div className="flex gap-4">
          {step !== 'sample' && (
            <button
              onClick={() => setStep(step === 'wholesale' ? 'retail' : 'sample')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          {step !== 'wholesale' ? (
            <button
              onClick={() => setStep(step === 'sample' ? 'retail' : 'wholesale')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Next: {step === 'sample' ? 'Retail' : 'Wholesale'}
            </button>
          ) : (
            <button
              onClick={handleImport}
              disabled={importing || totalSelected === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : `Import ${totalSelected} Products`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
