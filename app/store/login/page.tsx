'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function StoreLoginPage() {
  const [storeId, setStoreId] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'invalid': 'Invalid or expired magic link. Please request a new one.',
        'expired': 'Magic link expired. Links are valid for 15 minutes.',
        'used': 'This magic link has already been used. Please request a new one.',
        'server': 'Server error. Please try again.',
        'notfound': 'Store not found. Please check your Store ID.'
      };
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      const res = await fetch('/api/store/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, contact })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to send magic link');
        setSending(false);
        return;
      }

      setSent(true);
    } catch (err) {
      setError('Network error. Please try again.');
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✉️</span>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Magic Link Sent!</h1>
          
          <p className="text-gray-600 mb-6">
            We've sent login links to your registered email and phone number.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Check your:</strong>
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>📧 Email inbox</li>
              <li>📱 Text messages (SMS)</li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            The link will expire in 15 minutes.
          </p>

          <button
            onClick={() => {
              setSent(false);
              setStoreId('');
              setContact('');
            }}
            className="text-purple-600 hover:text-purple-700 font-medium text-sm"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-purple-500 px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Login</h1>
          <p className="text-gray-600">Access your store dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              Found on your display or activation email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email or Phone
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="email@example.com or (555) 123-4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the email or phone used during store activation
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            You'll receive a secure login link via email and SMS
          </p>
        </div>
      </div>
    </div>
  );
}
