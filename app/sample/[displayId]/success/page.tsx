import prisma from '@/lib/prisma';

export default async function SampleSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ displayId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Get member ID from URL (await searchParams in Next.js 16)
  const resolvedSearchParams = await searchParams;
  const memberId = (resolvedSearchParams?.memberId as string) || '';
  
  if (!memberId) {
    return (
      <div className="min-h-svh bg-[#f7f5fb] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">Member ID not found. Please try submitting the form again.</p>
        </div>
      </div>
    );
  }
  
  // Fetch customer
  const customer = await prisma.customer.findUnique({
    where: { memberId }
  });
  
  if (!customer) {
    return (
      <div className="min-h-svh bg-[#f7f5fb] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">Customer not found. Please contact support.</p>
        </div>
      </div>
    );
  }
  
  // Fetch store data
  const store = await prisma.store.findUnique({
    where: { storeId: customer.storeId },
    select: {
      storeName: true,
      promoOffer: true
    }
  });
  
  // Fetch organization data using id (customer.orgId is now a CUID)
  const organization = await prisma.organization.findUnique({
    where: { id: customer.orgId }
  });
  
  if (!store || !organization) {
    return (
      <div className="min-h-svh bg-[#f7f5fb] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">Store or organization data not found. Please contact support.</p>
        </div>
      </div>
    );
  }
  
  // Extract real data
  const brandName = organization.name;
  const storeName = store.storeName;
  const sampleChoice = customer.sampleChoice;
  const promoOffer = store.promoOffer;
  // TypeScript types may be cached; use type assertion for supportEmail
  const supportEmail = (organization as any).supportEmail || 'support@qrdisplay.com';

  return (
    <div className="min-h-svh bg-[#f7f5fb] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Dynamic Headline */}
        <h1 className="text-3xl font-bold text-center mb-2">
          Your {brandName} Sample is Almost Ready!
        </h1>
        
        {/* Instructions */}
        <p className="text-center text-gray-700 mb-8">
          Find a staff member at <span className="font-semibold">{storeName}</span> and 
          show them the text you just received to claim 
          your <span className="font-semibold text-purple-600">{sampleChoice}</span>.
        </p>
        
        {/* Member ID Card */}
        <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-sm text-gray-600 mb-2">Your Member ID</p>
          <p className="text-3xl font-bold font-mono text-purple-600 mb-1">
            {customer.memberId}
          </p>
          <p className="text-xs text-gray-500">save this for your records</p>
        </div>
        
        {/* Checklist */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-bold mb-4">Quick Check List</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-sm">Check your phone for a text message</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-sm">Click the link and ask the store staff for the PIN</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-sm">Take your free sample home</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-0.5">🎁</span>
              <p className="text-sm">
                Enjoy your sample? Return to claim a{' '}
                <span className="font-semibold text-purple-600">{promoOffer}</span> offer!
              </p>
            </div>
          </div>
        </div>
        
        {/* Support */}
        <p className="text-center text-sm text-gray-500">
          Questions? Contact{' '}
          <a href={`mailto:${supportEmail}`} className="text-purple-600 hover:underline">
            {supportEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
