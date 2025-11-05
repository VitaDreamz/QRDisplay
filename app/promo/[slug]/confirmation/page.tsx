import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function PromoConfirmationPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ verifySlug?: string }>;
}) {
  const { slug } = await params;
  const { verifySlug } = await searchParams;
  
  if (!verifySlug) {
    return redirect(`/promo/${slug}/select`);
  }
  
  // Get the purchase intent
  const intent = await prisma.purchaseIntent.findUnique({
    where: { verifySlug },
    include: {
      customer: true,
      product: true
    }
  });
  
  if (!intent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h1>
          <p className="text-gray-600">Purchase intent not found.</p>
        </div>
      </div>
    );
  }
  
  // Get store info
  const store = await prisma.store.findFirst({
    where: { id: intent.storeId }
  });
  
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
          <p className="text-gray-600">Unable to load store information.</p>
        </div>
      </div>
    );
  }
  
  const savings = intent.originalPrice.toNumber() - intent.finalPrice.toNumber();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Order Confirmed! 🎉
          </h1>
          <p className="text-gray-600">
            Your product is ready for pickup
          </p>
        </div>
        
        {/* Order Details */}
        <div className="bg-purple-50 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4 text-gray-900">Order Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Product:</span>
              <span className="font-semibold text-gray-900">{intent.product.name}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Original Price:</span>
              <span className="text-gray-500 line-through">${intent.originalPrice.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Discount ({intent.discountPercent}% off):</span>
              <span className="text-green-600 font-semibold">-${savings.toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-3 flex justify-between items-baseline">
              <span className="font-semibold text-gray-900">Your Price:</span>
              <span className="text-3xl font-bold text-purple-600">${intent.finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Pickup Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-3 text-gray-900 flex items-center gap-2">
            <span>📍</span> Pickup Location
          </h2>
          <div className="space-y-2">
            <p className="font-semibold text-gray-900">{store.storeName}</p>
            {store.streetAddress && <p className="text-gray-700">{store.streetAddress}</p>}
            {store.city && store.state && (
              <p className="text-gray-700">{store.city}, {store.state} {store.zipCode}</p>
            )}
            {store.adminPhone && (
              <p className="text-gray-700 mt-3">
                <span className="font-medium">Phone:</span> {store.adminPhone}
              </p>
            )}
          </div>
        </div>
        
        {/* Next Steps */}
        <div className="border-l-4 border-purple-500 bg-purple-50 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What Happens Next?</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>The store has been notified of your order</li>
            <li>Visit the store to pick up your product</li>
            <li>Show this confirmation to the staff</li>
            <li>Pay ${intent.finalPrice.toFixed(2)} and enjoy your purchase!</li>
          </ol>
        </div>
        
        {/* Verification Code */}
        <div className="text-center bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2">Your Verification Code</p>
          <p className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
            {verifySlug.toUpperCase().slice(0, 8)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Show this code when you pick up your order
          </p>
        </div>
        
        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Thank you for choosing {store.storeName}!
        </p>
      </div>
    </div>
  );
}
