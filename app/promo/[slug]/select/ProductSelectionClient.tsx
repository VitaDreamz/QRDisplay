'use client';

import { useState } from 'react';
import Image from 'next/image';

type Product = {
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  msrp: number | null;
  imageUrl: string | null;
  featured: boolean;
};

type ProductSelectionClientProps = {
  promo: {
    slug: string;
    offer: string;
    discountPercent: number;
  };
  customer: {
    firstName: string;
    lastName: string;
  };
  store: {
    storeName: string;
    city: string | null;
    state: string | null;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
  products: Product[];
};

export default function ProductSelectionClient({
  promo,
  customer,
  store,
  organization,
  products
}: ProductSelectionClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProduct = async () => {
    if (!selectedProduct) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const originalPrice = selectedProduct.price;
      const discountAmount = (originalPrice * promo.discountPercent) / 100;
      const finalPrice = originalPrice - discountAmount;
      
      const response = await fetch('/api/purchase-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoSlug: promo.slug,
          productSku: selectedProduct.sku,
          originalPrice,
          discountPercent: promo.discountPercent,
          finalPrice
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create purchase intent');
      }
      
      // Redirect to confirmation page
      window.location.href = `/promo/${promo.slug}/confirmation?verifySlug=${data.verifySlug}`;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              {organization.logoUrl && (
                <Image
                  src={organization.logoUrl}
                  alt={organization.name}
                  width={120}
                  height={40}
                  className="mb-2"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900">
                Choose Your Product
              </h1>
              <p className="text-gray-600 mt-1">
                Hi {customer.firstName}! Select a product to redeem your {promo.offer} at {store.storeName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {products.map((product) => {
            const originalPrice = product.price;
            const discountAmount = (originalPrice * promo.discountPercent) / 100;
            const finalPrice = originalPrice - discountAmount;
            const isSelected = selectedProduct?.sku === product.sku;
            
            return (
              <div
                key={product.sku}
                onClick={() => setSelectedProduct(product)}
                className={`
                  relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all
                  ${isSelected ? 'ring-4 ring-purple-500 scale-105' : 'hover:shadow-lg'}
                  ${product.featured ? 'border-2 border-purple-300' : ''}
                `}
              >
                {product.featured && (
                  <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    ⭐ FEATURED
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute top-2 left-2 bg-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full z-10">
                    ✓ Selected
                  </div>
                )}
                
                {/* Product Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={200}
                      height={192}
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <div className="text-4xl mb-2">🍬</div>
                      <div className="text-sm text-gray-600">{product.category}</div>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                  )}
                  {product.category && (
                    <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded mb-3">
                      {product.category}
                    </span>
                  )}
                  
                  {/* Pricing */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-gray-400 line-through">
                        ${originalPrice.toFixed(2)}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">
                        {promo.discountPercent}% OFF
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">
                      ${finalPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      You save ${discountAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        {selectedProduct && (
          <div className="sticky bottom-0 bg-white border-t shadow-lg p-4 rounded-t-xl">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <div className="font-semibold text-gray-900">
                  {selectedProduct.name}
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  ${((selectedProduct.price * (100 - promo.discountPercent)) / 100).toFixed(2)}
                </div>
              </div>
              <button
                onClick={handleSelectProduct}
                disabled={submitting}
                className="w-full md:w-auto px-8 py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Processing...' : `Continue with ${selectedProduct.name.split('-')[0].trim()}`}
              </button>
            </div>
          </div>
        )}
        
        {/* Store Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Pick up in-store at:</p>
          <p className="font-semibold text-gray-900">
            {store.storeName}
            {store.city && store.state && ` • ${store.city}, ${store.state}`}
          </p>
          <p className="mt-2 text-xs">
            You'll receive a confirmation with pickup instructions
          </p>
        </div>
      </div>
    </div>
  );
}
