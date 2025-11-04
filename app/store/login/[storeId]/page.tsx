'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StoreLoginPage({ params }: { params: Promise<{ storeId: string }> }) {
  const [storeId, setStoreId] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [orgName, setOrgName] = useState<string>('');
  const [loginType, setLoginType] = useState<'owner' | 'staff'>('owner');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    params.then(async (p) => {
      setStoreId(p.storeId);
      try {
        const res = await fetch(`/api/store/public?storeId=${encodeURIComponent(p.storeId)}`, { cache: 'no-store' });
        const json = await res.json();
        if (json?.ok) {
          setStoreName(json.storeName || '');
          setOrgName(json.organizationName || '');
        }
      } catch {}
    });
  }, [params]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/store/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          loginType,
          pin
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push('/store/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏪</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {storeName ? `${storeName} Dashboard Login` : 'Store Dashboard Login'}
          </h1>
          {orgName && (
            <p className="text-sm text-gray-600 mb-3">Powered by <span className="font-medium">{orgName}</span></p>
          )}
          <div className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-mono text-sm font-semibold">
            {storeId}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Login Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Login As:</label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-purple-50 hover:border-purple-300">
                <input
                  type="radio"
                  name="loginType"
                  value="owner"
                  checked={loginType === 'owner'}
                  onChange={(e) => setLoginType(e.target.value as 'owner')}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">Store Owner/Manager</div>
                  <div className="text-sm text-gray-500">Full dashboard access</div>
                </div>
              </label>

              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-purple-50 hover:border-purple-300">
                <input
                  type="radio"
                  name="loginType"
                  value="staff"
                  checked={loginType === 'staff'}
                  onChange={(e) => setLoginType(e.target.value as 'staff')}
                  className="w-5 h-5 text-purple-600"
                />
                <div className="ml-3">
                  <div className="font-semibold text-gray-900">Staff Member</div>
                  <div className="text-sm text-gray-500">Team member access</div>
                </div>
              </label>
            </div>
          </div>

          {/* Staff ID Input (only for staff) */}
          {/* Staff ID no longer required for staff login */}

          {/* PIN Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {loginType === 'owner' ? 'Owner PIN' : 'Staff PIN'}
            </label>
            <input
              type="password"
              required
              maxLength={4}
              pattern="[0-9]{4}"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
            />
            <p className="text-xs text-gray-500 mt-2">4-digit PIN</p>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Forgot your PIN?</p>
          <p className="mt-1">Contact support or your store manager</p>
        </div>

        {/* Bookmark Reminder */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">💡 Pro Tip:</p>
          <p className="text-xs text-blue-700 mt-1">
            Bookmark this page for easy access! This link never expires.
          </p>
        </div>
      </div>
    </div>
  );
}
