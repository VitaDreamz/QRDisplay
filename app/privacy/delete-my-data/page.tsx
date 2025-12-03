'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 'phone' | 'verify' | 'success';

export default function DeleteMyDataPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [deletionSummary, setDeletionSummary] = useState<{
    totalRecords: number;
    customersDeleted: number;
    promoRedemptionsDeleted: number;
    purchaseIntentsDeleted: number;
    conversionsAnonymized: number;
  } | null>(null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/privacy/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setRequestId(data.requestId);
      setStep('verify');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/privacy/data-deletion/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setDeletionSummary(data.summary);
      setStep('success');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xl mb-4">
            🔒 Privacy Center
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delete My Data</h1>
          <p className="text-gray-600">
            Under California privacy law (CCPA), you have the right to request deletion of your personal data.
          </p>
        </div>

        {/* Phone Step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the phone number associated with your account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address (optional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                We'll send a confirmation when your data is deleted
              </p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                {errorMessage}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ What will be deleted:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Your customer profile and contact information</li>
                <li>• Sample redemption history</li>
                <li>• Promo redemption records</li>
                <li>• Purchase intent records</li>
                <li>• Associated message logs</li>
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>Note:</strong> Anonymized purchase data may be retained for business reporting purposes.
              </p>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Sending verification code...' : 'Request Data Deletion'}
            </button>
          </form>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div className="text-center bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-800">
                We sent a 6-digit verification code to your phone.
                Please enter it below to confirm your deletion request.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-center text-2xl tracking-widest"
                maxLength={6}
                required
              />
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || verificationCode.length !== 6}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Processing deletion...' : 'Confirm & Delete My Data'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setVerificationCode('');
                setErrorMessage('');
              }}
              className="w-full text-gray-600 py-2 hover:text-gray-800 transition"
            >
              ← Go back
            </button>
          </form>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Deleted Successfully</h2>
              <p className="text-gray-600">
                Your personal data has been removed from our systems.
              </p>
            </div>

            {deletionSummary && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-gray-800 mb-3">Deletion Summary:</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex justify-between">
                    <span>Customer profiles deleted:</span>
                    <span className="font-medium">{deletionSummary.customersDeleted}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Promo redemptions deleted:</span>
                    <span className="font-medium">{deletionSummary.promoRedemptionsDeleted}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Purchase intents deleted:</span>
                    <span className="font-medium">{deletionSummary.purchaseIntentsDeleted}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Conversions anonymized:</span>
                    <span className="font-medium">{deletionSummary.conversionsAnonymized}</span>
                  </li>
                  <li className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">Total records affected:</span>
                    <span className="font-bold">{deletionSummary.totalRecords}</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="text-sm text-gray-500">
              A confirmation has been sent to your phone.
              Your phone number has been added to our opt-out list.
            </div>

            <Link
              href="/"
              className="inline-block bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Return Home
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <div className="space-x-4 text-sm">
            <Link href="/privacy/export-my-data" className="text-blue-600 hover:underline">
              Export My Data
            </Link>
            <span className="text-gray-300">|</span>
            <Link href="/contact" className="text-gray-600 hover:underline">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
