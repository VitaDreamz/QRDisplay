'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 'phone' | 'verify' | 'success';

interface ExportData {
  exportDate: string;
  dataSubject: { phone: string };
  customerRecords: Array<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    registeredAt: string;
    currentStage: string;
    smsOptedOut: boolean;
    source: string | null;
    status: string | null;
  }>;
  sampleHistory: Array<{
    product: string;
    quantity: number;
    date: string;
  }>;
  promoRedemptions: Array<{
    offer: string;
    redeemedAt: string | null;
    purchaseAmount: number | null;
    discountAmount: number | null;
  }>;
  purchaseIntents: Array<{
    product: string;
    originalPrice: number;
    discountPercent: number;
    finalPrice: number;
    status: string;
    createdAt: string;
    fulfilledAt: string | null;
  }>;
  purchases: Array<{
    orderNumber: string;
    orderTotal: number;
    sampleDate: string;
    purchaseDate: string;
    daysAfterSample: number;
  }>;
  dataCategories: Record<string, string>;
  rights: Record<string, string>;
}

export default function ExportMyDataPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [exportData, setExportData] = useState<ExportData | null>(null);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/privacy/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
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
      const response = await fetch('/api/privacy/data-export/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      setExportData(data.data);
      setStep('success');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const downloadAsJSON = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl mb-4">
            📋 Privacy Center
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Export My Data</h1>
          <p className="text-gray-600">
            Under California privacy law (CCPA), you have the right to access your personal data.
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the phone number associated with your account
              </p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                {errorMessage}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">📊 What you'll receive:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your personal profile information</li>
                <li>• Sample redemption history</li>
                <li>• Promo redemption records</li>
                <li>• Purchase history and conversions</li>
                <li>• Your data rights and how to exercise them</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Sending verification code...' : 'Request My Data'}
            </button>
          </form>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div className="text-center bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-800">
                We sent a 6-digit verification code to your phone.
                Please enter it below to access your data.
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
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
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Loading your data...' : 'View My Data'}
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
        {step === 'success' && exportData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Your Data Export</h2>
              <button
                onClick={downloadAsJSON}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download JSON
              </button>
            </div>

            {/* Customer Info */}
            {exportData.customerRecords.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">👤 Personal Information</h3>
                {exportData.customerRecords.map((customer, i) => (
                  <div key={i} className="text-sm text-gray-600 space-y-1">
                    <p><strong>Name:</strong> {customer.firstName} {customer.lastName}</p>
                    <p><strong>Phone:</strong> {customer.phone}</p>
                    {customer.email && <p><strong>Email:</strong> {customer.email}</p>}
                    <p><strong>Status:</strong> {customer.status}</p>
                    <p><strong>SMS Opted Out:</strong> {customer.smsOptedOut ? 'Yes' : 'No'}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Sample History */}
            {exportData.sampleHistory.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">🎁 Sample History ({exportData.sampleHistory.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {exportData.sampleHistory.map((sample, i) => (
                    <div key={i} className="text-sm text-gray-600 flex justify-between">
                      <span>{sample.product}</span>
                      <span className="text-gray-400">
                        {sample.quantity}x • {new Date(sample.date).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Redemptions */}
            {exportData.promoRedemptions.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">🎟️ Promo Redemptions ({exportData.promoRedemptions.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {exportData.promoRedemptions.map((promo, i) => (
                    <div key={i} className="text-sm text-gray-600 flex justify-between">
                      <span>{promo.offer}</span>
                      <span className="text-gray-400">
                        {promo.redeemedAt ? new Date(promo.redeemedAt).toLocaleDateString() : 'Not redeemed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchases */}
            {exportData.purchases.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">🛒 Purchase History ({exportData.purchases.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {exportData.purchases.map((purchase, i) => (
                    <div key={i} className="text-sm text-gray-600 flex justify-between">
                      <span>Order #{purchase.orderNumber}</span>
                      <span className="text-gray-400">
                        ${purchase.orderTotal.toFixed(2)} • {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Your Rights */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-3">⚖️ Your Rights</h3>
              <ul className="text-sm text-purple-700 space-y-2">
                <li><strong>Deletion:</strong> {exportData.rights.deletion}</li>
                <li><strong>Opt-Out:</strong> {exportData.rights.optOut}</li>
                <li><strong>Correction:</strong> {exportData.rights.correction}</li>
              </ul>
            </div>

            <button
              onClick={() => {
                setStep('phone');
                setPhone('');
                setVerificationCode('');
                setExportData(null);
              }}
              className="w-full text-gray-600 py-2 hover:text-gray-800 transition"
            >
              Start Over
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <div className="space-x-4 text-sm">
            <Link href="/privacy/delete-my-data" className="text-red-600 hover:underline">
              Delete My Data
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
