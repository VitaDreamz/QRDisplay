'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardProgress } from '@/hooks/useWizardProgress';
import Image from 'next/image';

export default function SetupWelcomePage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [brandInfo, setBrandInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { saveProgress } = useWizardProgress(displayId);
  
  useEffect(() => {
    params.then(async (p) => {
      setDisplayId(p.displayId);
      
      // Fetch brand/organization info
      try {
        const res = await fetch(`/api/displays/${p.displayId}/brand`);
        if (res.ok) {
          const data = await res.json();
          setBrandInfo(data);
        }
      } catch (err) {
        console.error('Failed to load brand info:', err);
      } finally {
        setLoading(false);
      }
      
      // Check for saved progress
      const stored = localStorage.getItem(`qrdisplay-wizard-progress-${p.displayId}`);
      if (stored) {
        const savedProgress = JSON.parse(stored);
        // Show resume modal if progress exists and not completed
        if (savedProgress.currentStep > 1 && !savedProgress.activated) {
          if (confirm(`You have unfinished setup from ${new Date(savedProgress.timestamp).toLocaleDateString()}. Resume where you left off?`)) {
            // Redirect to saved step
            if (savedProgress.currentStep === 2) router.push(`/setup/${p.displayId}/unbox`);
            else if (savedProgress.currentStep === 3) router.push(`/setup/${p.displayId}/choose`);
            else if (savedProgress.currentStep === 4) router.push(`/setup/${p.displayId}/assemble/${savedProgress.displayOption}`);
            else if (savedProgress.currentStep === 5) router.push(`/setup/${p.displayId}/photo`);
            else if (savedProgress.currentStep === 6) router.push(`/setup/${p.displayId}/activate`);
          }
        }
      }
    });
  }, [params, router]);
  
  const handleStartWizard = () => {
    if (displayId) {
      saveProgress({ currentStep: 1, timestamp: new Date().toISOString() });
      router.push(`/setup/${displayId}/unbox`);
    }
  };
  
  const handleSkipToActivation = () => {
    if (displayId) {
      router.push(`/setup/${displayId}/activate`);
    }
  };
  
  if (loading || !displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Organization Branding */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {brandInfo?.logoUrl && (
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={brandInfo.logoUrl}
                  alt={brandInfo.name || 'Brand Logo'}
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {brandInfo?.name || 'QRDisplay'} Display Activation
              </h1>
              <p className="text-sm text-gray-600">Display ID: <span className="font-mono font-semibold">{displayId}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Intro Text */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            How would you like to get started?
          </h2>
          <p className="text-gray-600 text-lg">
            Choose the setup experience that works best for you
          </p>
        </div>

        {/* Two Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Option 1: Start Wizard */}
          <button
            onClick={handleStartWizard}
            className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-purple-500 hover:shadow-xl transition-all p-8 text-left group"
          >
            <div className="text-5xl mb-4">🧭</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
              Start Setup Wizard
            </h3>
            <p className="text-gray-600 mb-4">
              Step-by-step guided walkthrough to set up your display
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✓</span>
                <span>Unbox and assemble instructions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✓</span>
                <span>Upload a setup photo for $10 credit</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✓</span>
                <span>Add staff members</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600">✓</span>
                <span>Complete store activation</span>
              </div>
            </div>
            <div className="mt-6 text-purple-600 font-semibold group-hover:translate-x-1 transition-transform inline-block">
              Start Wizard →
            </div>
          </button>

          {/* Option 2: Skip to Activation */}
          <button
            onClick={handleSkipToActivation}
            className="bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-blue-500 hover:shadow-xl transition-all p-8 text-left group"
          >
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
              Skip to Activation
            </h3>
            <p className="text-gray-600 mb-4">
              Already know what you're doing? Jump straight to activation
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Quick and direct</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Enter store details</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Activate immediately</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <span>Go live in under 2 minutes</span>
              </div>
            </div>
            <div className="mt-6 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform inline-block">
              Go to Activation →
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need assistance? Contact {brandInfo?.supportEmail || 'support'} or call {brandInfo?.supportPhone || 'us'} anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
