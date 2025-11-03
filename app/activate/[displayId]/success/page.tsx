import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function ActivationSuccess({
  searchParams,
  params,
}: {
  searchParams: Promise<{ storeId?: string; displayId?: string }>;
  params: Promise<{ displayId: string }>;
}) {
  const search = await searchParams;
  const { displayId } = await params;
  const storeId = search.storeId;

  if (!storeId) {
    redirect('/');
  }

  // Fetch store with organization details
  const store = await prisma.store.findUnique({
    where: { storeId },
    include: {
      organization: true,
    },
  });

  if (!store) {
    redirect('/');
  }

  const brandName = store.organization.name;
  const brandEmail = store.organization.type === 'platform' 
    ? 'support@qrdisplay.com' 
    : `info@${store.organization.slug}.com`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-lg shadow-lg px-8 py-10">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <svg
              className="h-12 w-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Success Message - Branded */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3 text-center">
            Your {brandName} Display is now active and ready for customers!
          </h1>

          {/* Store Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-5 mb-6 mt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600 mb-1">Store</p>
                <p className="text-sm font-bold text-gray-900">{store.storeName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Store ID</p>
                <p className="text-sm font-bold text-gray-900">{store.storeId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Display ID</p>
                <p className="text-sm font-bold text-gray-900">{displayId}</p>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-gray-50 rounded-lg px-6 py-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">What's Next?</h2>
            <ol className="space-y-4 text-gray-700">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-medium">Place your QR Display & Samples in a visible location at your store</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-medium">Encourage customers who are interested to scan the QR Code to claim their sample</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-medium">Check your email and phone for Sample Requests, Follow-up Reports & Customer Feedback</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Help Section - Branded */}
          <div className="border-t border-gray-200 pt-6 pb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Questions or need help?</p>
            <a 
              href={`mailto:${brandEmail}`}
              className="text-lg font-semibold text-blue-600 hover:text-blue-700"
            >
              📧 {brandEmail}
            </a>
          </div>

          {/* Footer - Powered by QRDisplay */}
          <div className="border-t border-gray-200 pt-4 text-center">
            <p className="text-xs text-gray-400">Powered by QRDisplay</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Save your Store ID <span className="font-semibold text-gray-700">{store.storeId}</span> for future reference
          </p>
        </div>
      </div>
    </div>
  );
}
