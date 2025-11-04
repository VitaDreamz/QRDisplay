'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function StoreLoginContent() {
  const [storeId, setStoreId] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const migrated = searchParams.get('migrated');
    const legacyError = searchParams.get('error');
    if (migrated === '1' || legacyError) {
      setInfo('Magic links are no longer supported. Please use your permanent Store ID + PIN to log in.');
    }
  }, [searchParams]);

  function handleGo(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) return;
    router.push(`/store/login/${encodeURIComponent(storeId.trim().toUpperCase())}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Login</h1>
          <p className="text-gray-600">Use your Store ID + PIN</p>
        </div>

        {info && (
          <div className="mb-6 p-4 border border-amber-200 bg-amber-50 text-amber-900 rounded-lg text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleGo} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store ID
            </label>
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value.toUpperCase())}
              placeholder="SID-001"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-lg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this on your display sticker or activation email
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all"
          >
            Continue to PIN Login
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">Need help?</p>
          <ul className="mt-2 text-xs text-blue-700 list-disc pl-5 space-y-1">
            <li>Your manager or brand rep can provide your Store ID</li>
            <li>Owner PIN and Staff PIN were set during activation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StoreLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <StoreLoginContent />
    </Suspense>
  );
}
