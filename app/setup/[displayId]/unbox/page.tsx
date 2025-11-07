'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

export default function UnboxPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [hasEverything, setHasEverything] = useState(false);
  const { saveProgress } = useWizardProgress(displayId);
  
  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
    });
  }, [params]);
  
  const handleContinue = () => {
    if (displayId && hasEverything) {
      saveProgress({ currentStep: 2 });
      router.push(`/setup/${displayId}/choose`);
    }
  };
  
  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  const components = [
    { num: 1, name: 'QRDisplay (Base+Face+Card)' },
    { num: 2, name: 'Sample Stand' },
    { num: 3, name: 'Display Stand' },
    { num: 4, name: 'Connecting Bar' },
    { num: 5, name: 'Square Slat Hanging Hook' },
    { num: 6, name: 'VitaDreamz Samples' }
  ];
  
  return (
    <WizardLayout
      currentStep={2}
      totalSteps={8}
      stepLabel="Unbox"
      displayId={displayId}
      nextLabel="Next: Choose Your Setup"
      nextDisabled={!hasEverything}
      onNext={handleContinue}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📦</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          What's in the Box
        </h1>
        <p className="text-pink-200">
          Let's make sure you have everything
        </p>
      </div>
      
      {/* Image */}
      <div className="rounded-lg overflow-hidden mb-6 border-2 border-purple-300">
        <img 
          src="/images/displays/vitadreamz-display-setup-layflat.jpg" 
          alt="All display components laid out"
          className="w-full h-auto"
        />
      </div>
      
      {/* Component checklist */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-lg mb-4">Components:</h2>
        <div className="space-y-3">
          {components.map((component) => (
            <div 
              key={component.num}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {component.num}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">{component.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Confirmation checkbox */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-5 mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasEverything}
            onChange={(e) => setHasEverything(e.target.checked)}
            className="w-6 h-6 mt-0.5 rounded border-2 border-green-400 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
          />
          <div>
            <div className="font-semibold text-green-900">
              ✓ I have everything
            </div>
            <div className="text-sm text-green-700 mt-1">
              All components are present and undamaged
            </div>
          </div>
        </label>
      </div>
      
      {/* Missing items help */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-xl">⚠️</span>
          <div className="text-sm">
            <div className="font-medium text-yellow-900 mb-1">
              Missing something?
            </div>
            <div className="text-yellow-700">
              Click the chat bubble below to contact support. We'll get you what you need!
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
