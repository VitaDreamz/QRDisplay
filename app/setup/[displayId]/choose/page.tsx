'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

type DisplayOption = 'A' | 'B' | 'C';

export default function ChooseDisplayPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [selectedOption, setSelectedOption] = useState<DisplayOption | null>(null);
  const { saveProgress } = useWizardProgress(displayId);
  
  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
    });
  }, [params]);
  
  const handleSelectOption = (option: DisplayOption) => {
    setSelectedOption(option);
    if (displayId) {
      saveProgress({ currentStep: 3, displayOption: option });
      router.push(`/setup/${displayId}/assemble/${option}`);
    }
  };
  
  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  const options = [
    {
      id: 'A' as DisplayOption,
      title: 'Display + Sample Stand',
      icon: '🏪',
      imagePath: '/images/displays/vitadreamz-display-assembled.jpg',
      bestFor: 'Counter/high-traffic areas',
      description: 'Full setup with QR display and sample product stand'
    },
    {
      id: 'B' as DisplayOption,
      title: 'Just the Display',
      icon: '📱',
      imagePath: '/images/displays/vitadreamz-display-front.jpg',
      bestFor: 'Small counters/checkouts',
      description: 'Compact setup with display only'
    },
    {
      id: 'C' as DisplayOption,
      title: 'Shelf Talker (POS Box)',
      icon: '🏷️',
      imagePath: '/images/displays/vitadreamz-display-shelftalker.jpg',
      bestFor: 'Point-of-sale areas',
      description: 'Attach display to your POS box or shelf edge'
    }
  ];
  
  return (
    <WizardLayout
      currentStep={3}
      totalSteps={8}
      stepLabel="Choose Setup"
      displayId={displayId}
      showNext={false}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🏪</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Choose How You Want to Set-up Your Display
        </h1>
        <p className="text-pink-200">
          We'll walk you through which items to grab and how to build it!
        </p>
      </div>
      
      {/* Option Cards */}
      <div className="space-y-4 mb-6">
        {options.map((option) => {
          const isComingSoon = option.id === 'C';
          
          return (
            <button
              key={option.id}
              onClick={() => !isComingSoon && handleSelectOption(option.id)}
              disabled={isComingSoon}
              className={`w-full text-left bg-white/10 backdrop-blur-md rounded-lg shadow-sm border-2 p-5 transition-all relative ${
                isComingSoon
                  ? 'border-gray-500 bg-gray-800/50 opacity-60 cursor-not-allowed'
                  : selectedOption === option.id
                  ? 'border-purple-400 bg-purple-900/30 hover:shadow-lg hover:scale-102'
                  : 'border-white/20 hover:border-purple-400 hover:bg-white/15 hover:shadow-lg hover:scale-102'
              }`}
            >
              {/* Coming Soon Overlay */}
              {isComingSoon && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm z-10">
                  <span className="text-2xl font-bold text-white transform -rotate-12 bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2 rounded-lg shadow-lg">
                    COMING SOON
                  </span>
                </div>
              )}
              
              {/* Option Header */}
              <div className="flex items-start gap-4 mb-3">
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-400/30 to-blue-400/30 rounded-lg flex items-center justify-center text-3xl border border-white/20">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg text-white mb-1">
                    Option {option.id}: {option.title}
                  </div>
                  <div className="text-sm text-purple-200">
                    {option.description}
                  </div>
                </div>
              </div>
            
            {/* Product Image */}
            <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg overflow-hidden mb-3 border border-white/20">
              <div className="relative w-full h-64">
                <Image
                  src={option.imagePath}
                  alt={option.title}
                  fill
                  className="object-contain p-4"
                />
              </div>
            </div>
            
            {/* Best For */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-purple-200">Best for:</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-400/30">
                {option.bestFor}
              </span>
            </div>
            
            {/* Choose Button */}
            <div className="pt-3 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-300">
                  {isComingSoon ? 'Not available yet' : 'Choose this setup →'}
                </span>
                {!isComingSoon && <span className="text-2xl text-purple-300">→</span>}
              </div>
            </div>
          </button>
          );
        })}
      </div>
      
      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-xl">💡</span>
          <div className="text-sm">
            <div className="font-medium text-blue-900 mb-1">
              Not sure which to choose?
            </div>
            <div className="text-blue-700">
              Don't worry! You can always reassemble it differently later. Most stores prefer Option A.
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
