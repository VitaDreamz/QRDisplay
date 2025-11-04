'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

export default function SetupWelcomePage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const { progress, saveProgress } = useWizardProgress(displayId);
  
  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
      
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
  
  const handleStart = () => {
    if (displayId) {
      saveProgress({ currentStep: 1, timestamp: new Date().toISOString() });
      router.push(`/setup/${displayId}/unbox`);
    }
  };
  
  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  return (
    <WizardLayout
      currentStep={1}
      totalSteps={8}
      stepLabel="Welcome"
      displayId={displayId}
      showBack={false}
      showNext={false}
    >
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to QRDisplay!
        </h1>
        <p className="text-gray-600">
          Let's get your display set up in minutes
        </p>
      </div>
      
      {/* Display ID Badge */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 mb-6">
        <div className="text-sm text-purple-700 font-medium mb-1">Your Display ID</div>
        <div className="text-2xl font-mono font-bold text-purple-900">{displayId}</div>
      </div>
      
      {/* What You'll Need */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">What you'll need:</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📱</div>
            <div>
              <div className="font-medium">Smartphone</div>
              <div className="text-sm text-green-600">✓ You have it!</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="text-2xl">🌐</div>
            <div>
              <div className="font-medium">Internet connection</div>
              <div className="text-sm text-gray-500">WiFi or cellular data</div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="text-2xl">⏱️</div>
            <div>
              <div className="font-medium">5 minutes</div>
              <div className="text-sm text-gray-500">Quick and easy setup</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* What We'll Do */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
        <h3 className="font-semibold mb-3">What we'll do together:</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-blue-600">▶</span>
            <span>Unbox and identify components</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">▶</span>
            <span>Choose your display setup</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">▶</span>
            <span>Assemble your display</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">▶</span>
            <span>Activate your store</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">▶</span>
            <span>Start collecting samples!</span>
          </li>
        </ul>
      </div>
      
      {/* Big Start Button */}
      <button
        onClick={handleStart}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-bold text-lg shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all hover:scale-105"
      >
        Let's Go! 🚀
      </button>
      
      <p className="text-center text-sm text-gray-500 mt-4">
        Need help? Click the chat bubble anytime →
      </p>
    </WizardLayout>
  );
}
