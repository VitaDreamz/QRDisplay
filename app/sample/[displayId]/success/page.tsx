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
      <div className="min-h-svh bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md text-center border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
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
      <div className="min-h-svh bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md text-center border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
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
      <div className="min-h-svh bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md text-center border border-red-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
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
    <div className="min-h-svh bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-md w-full border border-purple-200">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        {/* Dynamic Headline */}
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Your {brandName} Sample is Almost Ready!
        </h1>
        
        {/* Instructions */}
        <p className="text-center text-gray-700 mb-8">
          Find a staff member at <span className="font-semibold text-purple-700">{storeName}</span> and 
          show them the text you just received to claim 
          your <span className="font-semibold text-purple-600">{sampleChoice}</span>.
        </p>
        
        {/* Member ID Card */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-6 mb-8 text-center shadow-md">
          <p className="text-sm text-purple-700 mb-2 font-medium">Your Member ID</p>
          <p className="text-3xl font-bold font-mono bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1">
            {customer.memberId}
          </p>
          <p className="text-xs text-purple-600">save this for your records</p>
        </div>
        
        {/* Checklist */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 border border-purple-200">
          <h3 className="font-bold mb-4 text-purple-900">Quick Check List</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-sm text-gray-700">Check your phone for a text message</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-sm text-gray-700">Click the link and ask the store staff for the PIN</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-500 mt-0.5">✅</span>
              <p className="text-sm text-gray-700">Take your free sample home</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-0.5">🎁</span>
              <p className="text-sm text-gray-700">
                Enjoy your sample? Return to claim a{' '}
                <span className="font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{promoOffer}</span> offer!
              </p>
            </div>
          </div>
        </div>
        
        {/* Support */}
        <p className="text-center text-sm text-gray-600">
          Questions? Contact{' '}
          <a href={`mailto:${supportEmail}`} className="text-purple-600 hover:text-purple-700 underline font-medium">
            {supportEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
