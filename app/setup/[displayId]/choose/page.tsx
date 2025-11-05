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
      imagePath: '/images/displays/vitadreamz-display-front.jpg',
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Display Setup
        </h1>
        <p className="text-gray-600">
          Pick the option that works best for your space
        </p>
      </div>
      
      {/* Option Cards */}
      <div className="space-y-4 mb-6">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelectOption(option.id)}
            className={`w-full text-left bg-white rounded-lg shadow-sm border-2 p-5 transition-all hover:shadow-lg hover:scale-102 ${
              selectedOption === option.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            {/* Option Header */}
            <div className="flex items-start gap-4 mb-3">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center text-3xl">
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg text-gray-900 mb-1">
                  Option {option.id}: {option.title}
                </div>
                <div className="text-sm text-gray-600">
                  {option.description}
                </div>
              </div>
            </div>
            
            {/* Product Image */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden mb-3 border border-gray-200">
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
              <span className="text-sm font-medium text-gray-700">Best for:</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {option.bestFor}
              </span>
            </div>
            
            {/* Choose Button */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-purple-600">
                  Choose this setup →
                </span>
                <span className="text-2xl">→</span>
              </div>
            </div>
          </button>
        ))}
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
