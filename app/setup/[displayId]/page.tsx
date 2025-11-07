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
            else if (savedProgress.currentStep === 6) router.push(`/setup/${p.displayId}/store-lookup`);
            else if (savedProgress.currentStep === 7) router.push(`/setup/${p.displayId}/activate`);
            else if (savedProgress.currentStep === 8) router.push(`/setup/${p.displayId}/products`);
            else if (savedProgress.currentStep === 9) router.push(`/setup/${p.displayId}/staff`);
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
      router.push(`/setup/${displayId}/store-lookup`);
    }
  };
  
  if (loading || !displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {brandInfo?.name || 'QRDisplay'} Sampling Program Activation
          </h1>
          <p className="text-purple-200 text-sm">
            Display ID: <span className="font-mono font-semibold text-white">{displayId}</span>
          </p>
        </div>

        {/* Intro Text */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Let's get your Automated Sampling Program set-up in 5mins or less!
          </h2>
          <p className="text-purple-200 text-lg">
            Choose the setup experience that works best for you
          </p>
        </div>

        {/* Two Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Option 1: Start Wizard */}
          <button
            onClick={handleStartWizard}
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg border-2 border-white/20 hover:border-purple-400 hover:shadow-2xl hover:bg-white/15 transition-all p-8 text-left group"
          >
            <div className="text-5xl mb-4">🕐</div>
            <div className="text-purple-200 text-sm mb-2">~5 minutes</div>
            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
              Start Set-up Wizard
            </h3>
            <p className="text-purple-100 mb-4 text-sm">
              Step-by-step guided walkthrough to build your display and tie it directly to your store.
            </p>
            <div className="space-y-2 text-sm text-purple-200">
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">-</span>
                <span>Unbox and assemble instructions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">-</span>
                <span>Bonus $10 Store Credit Opportunity</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">-</span>
                <span>Enter Store Details</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">-</span>
                <span>Set-up Automated Marketing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">-</span>
                <span>Select Products for sampling and sale</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">-</span>
                <span>Add staff members (for staff tracking)</span>
              </div>
            </div>
            <div className="mt-6 text-purple-300 font-semibold group-hover:translate-x-1 transition-transform inline-block">
              Start Wizard →
            </div>
          </button>

          {/* Option 2: Skip to Activation */}
          <button
            onClick={handleSkipToActivation}
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg border-2 border-white/20 hover:border-blue-400 hover:shadow-2xl hover:bg-white/15 transition-all p-8 text-left group"
          >
            <div className="text-5xl mb-4">⚡</div>
            <div className="text-blue-200 text-sm mb-2">~2 mins</div>
            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
              Skip to Activation
            </h3>
            <p className="text-blue-100 mb-4 text-sm">
              Don't need help building your display? Jump straight to activating your store!
            </p>
            <div className="space-y-2 text-sm text-blue-200">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span>Enter Store Details</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span>Set-up Automated Marketing</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span>Select Products for sampling and sale</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">-</span>
                <span>Add staff members (for staff tracking)</span>
              </div>
            </div>
            <div className="mt-6 text-blue-300 font-semibold group-hover:translate-x-1 transition-transform inline-block">
              Go to Activation →
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-purple-200">
            Need assistance? Click the chat bubble on the right of your screen to contact customer support
          </p>
        </div>
      </div>
    </div>
  );
}
