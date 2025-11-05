import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import ProductSelectionClient from './ProductSelectionClient';

export default async function PromoSelectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Find the promo redemption
  const promo = await prisma.promoRedemption.findUnique({
    where: { promoSlug: slug },
    include: {
      customer: true,
      store: true,
      organization: true
    }
  });
  
  if (!promo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Promo Not Found</h1>
          <p className="text-gray-600">This promotional link is invalid or has expired.</p>
        </div>
      </div>
    );
  }
  
  // Check if already used
  if (promo.redeemedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">✅ Already Redeemed</h1>
          <p className="text-gray-600">This promotional offer has already been used.</p>
          <p className="text-sm text-gray-500 mt-2">
            Redeemed on {new Date(promo.redeemedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }
  
  // Get available products for this store
  const availableSkus = promo.store.availableProducts;
  
  if (!availableSkus || availableSkus.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Products Available</h1>
          <p className="text-gray-600">This store hasn't set up their product catalog yet.</p>
          <p className="text-sm text-gray-500 mt-2">Please contact the store for assistance.</p>
        </div>
      </div>
    );
  }
  
  const products = await prisma.product.findMany({
    where: {
      sku: { in: availableSkus },
      active: true
    },
    orderBy: [
      { featured: 'desc' },
      { price: 'asc' }
    ]
  });
  
  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Products Available</h1>
          <p className="text-gray-600">There are no products available at this time.</p>
        </div>
      </div>
    );
  }
  
  // Extract discount percentage from promo offer (e.g., "20%-off 1st Purchase" -> 20)
  const discountMatch = promo.promoOffer.match(/(\d+)%/);
  const discountPercent = discountMatch ? parseInt(discountMatch[1]) : 20;
  
  return (
    <ProductSelectionClient
      promo={{
        slug: promo.promoSlug,
        offer: promo.promoOffer,
        discountPercent
      }}
      customer={{
        firstName: promo.customer.firstName,
        lastName: promo.customer.lastName
      }}
      store={{
        storeName: promo.store.storeName,
        city: promo.store.city,
        state: promo.store.state
      }}
      organization={{
        name: promo.organization.name,
        logoUrl: promo.organization.logoUrl
      }}
      products={products.map(p => ({
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        price: parseFloat(p.price.toString()),
        msrp: p.msrp ? parseFloat(p.msrp.toString()) : null,
        imageUrl: p.imageUrl,
        featured: p.featured
      }))}
    />
  );
}
