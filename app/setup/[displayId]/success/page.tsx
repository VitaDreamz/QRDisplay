'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

export default function SuccessPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayId, setDisplayId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const { progress } = useWizardProgress(displayId);

  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
      const sid = searchParams.get('storeId');
      if (sid) setStoreId(sid);
    });
  }, [params, searchParams]);

  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }

  return (
    <WizardLayout
      currentStep={9}
      totalSteps={9}
      stepLabel="Success"
      displayId={displayId}
      showBack={false}
      showNext={false}
    >
      {/* Celebration */}
      <div className="text-center mb-8">
        <div className="text-8xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          You're All Set!
        </h1>
        <p className="text-gray-600">
          Your QRDisplay is ready to use
        </p>
      </div>

      {/* Success Checklist */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-6 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
              ✓
            </div>
            <span className="text-green-900 font-medium">Display assembled</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
              ✓
            </div>
            <span className="text-green-900 font-medium">Store activated</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
              ✓
            </div>
            <span className="text-green-900 font-medium">Ready for customers</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              progress?.staffAdded 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-600'
            }`}>
              {progress?.staffAdded ? '✓' : '○'}
            </div>
            <span className={progress?.staffAdded ? 'text-green-900 font-medium' : 'text-gray-600 font-medium'}>
              {progress?.staffAdded ? 'Staff added' : 'Staff setup - skipped'}
            </span>
          </div>
        </div>
      </div>

      {/* Email/SMS Notification */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
        <div className="flex gap-3">
          <span className="text-2xl">📧</span>
          <div>
            <div className="font-semibold text-blue-900 mb-2">
              Check your email & SMS
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Dashboard login link</li>
              <li>• Owner PIN reminder</li>
              <li>• Quick start guide</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dashboard Access */}
      {storeId && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-purple-200 p-6 mb-6">
          <a
            href={`/store/login/${storeId}`}
            className="block w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-bold text-lg text-center shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all mb-4"
          >
            Sign Into Dashboard
          </a>
          {progress?.pin && (
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Your PIN:</div>
              <div className="text-3xl font-mono font-bold text-purple-600 tracking-wider">
                {progress.pin}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Keep this PIN safe - you'll need it to access your dashboard
              </div>
            </div>
          )}
        </div>
      )}

      {/* Staff Option - Only show if they skipped */}
      {!progress?.staffAdded && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold text-lg mb-2">
              Want to add staff members?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add your team now or do it later from your dashboard
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/setup/${displayId}/staff${storeId ? `?storeId=${storeId}` : ''}`)}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Add Staff Now
              </button>
              {storeId && (
                <a
                  href={`/store/login/${storeId}`}
                  className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center block"
                >
                  I'll Do This Later
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-5">
        <h3 className="font-semibold text-purple-900 mb-3">What's Next?</h3>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex items-start gap-2">
            <span>1.</span>
            <span>Place your display in a high-visibility area</span>
          </li>
          <li className="flex items-start gap-2">
            <span>2.</span>
            <span>Train your staff on using the PIN system</span>
          </li>
          <li className="flex items-start gap-2">
            <span>3.</span>
            <span>Keep sample products stocked and accessible</span>
          </li>
          <li className="flex items-start gap-2">
            <span>4.</span>
            <span>Monitor customer engagement from your dashboard</span>
          </li>
        </ul>
      </div>
    </WizardLayout>
  );
}
