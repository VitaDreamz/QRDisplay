'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

type DisplayOption = 'A' | 'B' | 'C';

interface AssemblyStep {
  title: string;
  instruction: string;
  image: string;
  tips?: string[];
}

const assemblySteps: Record<DisplayOption, AssemblyStep[]> = {
  A: [
    {
      title: 'Attach Straight Bar to Sample Stand',
      instruction: 'Flip the Sample Stand over and match 2 of the magnets from the bar with 2 magnets on the side of the Stand you\'d like to attach the display. The bar should click into place securely.',
      image: '🎣 + 📏',
      tips: ['Make sure magnets are facing the right direction', 'Bar should be on the "back" side of the Stand (hidden from the front)']
    },
    {
      title: 'Attach Display to Bar & Stand',
      instruction: 'Place the display upright and level next to the Stand with bar and "click it" into place. It should attach firmly and straight.',
      image: '📱 → 📏',
      tips: ['Display should be level', 'Make sure QR faces customers and the marketing insert is straight']
    },
    {
      title: 'Hang Sample Products',
      instruction: 'Slide the square peg into the hook slat on the sample display, then hang your samples on the hook. Arrange them neatly for best presentation.',
      image: '💊 → 🎣',
      tips: ['Samples should hang evenly', 'Be sure to "pull up" when grabbing samples as pulling down on samples can flip the display']
    }
  ],
  B: [
    {
      title: 'Attach Display Stand',
      instruction: 'Connect the display stand to the back of the QRDisplay using the magnetic attachment. Make sure it\'s secure and the display stands upright.',
      image: '📱 + 🗂️',
      tips: ['Stand should be perpendicular to display', 'Test stability before placing']
    },
    {
      title: 'Position Your Display',
      instruction: 'Place your display in a high-visibility area near the checkout or counter. Ensure the QR code is easily accessible to customers.',
      image: '🏪 → 📱',
      tips: ['Choose eye-level placement', 'Avoid cluttered areas', 'Good lighting is important']
    }
  ],
  C: [
    {
      title: 'Attach Shelf Talker Bar',
      instruction: 'Connect the shelf talker bar to the back of the QRDisplay. This will allow you to hang it on shelves or attach to your POS box.',
      image: '🏷️ + 📱',
      tips: ['Bar should be secure', 'Check alignment before placing']
    },
    {
      title: 'Mount to POS Box or Shelf',
      instruction: 'Hook the shelf talker bar onto your POS box edge or shelf. Adjust positioning so the QR code is visible and accessible to customers.',
      image: '📦 + 🏷️',
      tips: ['Ensure it won\'t fall', 'QR code should face customers', 'Test stability']
    },
    {
      title: 'Arrange Sample Products',
      instruction: 'Place your sample products nearby on the shelf or counter, grouped together for easy access and visibility.',
      image: '💊 + 🏪',
      tips: ['Keep samples close to display', 'Organize by product type']
    }
  ]
};

export default function AssemblePage({ params }: { params: Promise<{ displayId: string; option: DisplayOption }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [option, setOption] = useState<DisplayOption>('A');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { saveProgress } = useWizardProgress(displayId);
  
  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
      setOption(p.option);
    });
  }, [params]);
  
  const steps = assemblySteps[option] || assemblySteps.A;
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  
  const handleNext = () => {
    if (isLastStep) {
      // Go to photo page
      if (displayId) {
        saveProgress({ currentStep: 4 });
        router.push(`/setup/${displayId}/photo`);
      }
    } else {
      // Next assembly step
      setCurrentStepIndex(prev => prev + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    } else {
      router.back();
    }
  };
  
  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  return (
    <WizardLayout
      currentStep={4}
      totalSteps={8}
      stepLabel={`Assembly (${currentStepIndex + 1}/${steps.length})`}
      displayId={displayId}
      onBack={handleBack}
      onNext={handleNext}
      nextLabel={isLastStep ? 'Next: Take a Photo' : 'Next Step'}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔧</div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Option {option}: Assembly
        </h1>
        <div className="text-sm text-pink-200 mb-4">
          Step {currentStepIndex + 1} of {steps.length}
        </div>
        
        {/* Step progress indicators */}
        <div className="flex justify-center gap-2 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-1.5 rounded-full transition-all ${
                index < currentStepIndex
                  ? 'bg-green-500'
                  : index === currentStepIndex
                  ? 'bg-purple-600'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* Current Step Card */}
      <div className="bg-white rounded-lg shadow-lg border-2 border-purple-200 p-6 mb-6">
        {/* Step Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {currentStep.title}
        </h2>
        
        {/* Image/Icon Placeholder */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-12 mb-4 text-center border-2 border-dashed border-purple-300">
          <div className="text-6xl mb-3">{currentStep.image}</div>
          <div className="text-sm text-gray-600">
            Step {currentStepIndex + 1} visual guide
          </div>
          <div className="text-xs text-gray-500 mt-1">
            (Detailed photo/video coming soon)
          </div>
        </div>
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="text-sm text-blue-900 leading-relaxed">
            {currentStep.instruction}
          </div>
        </div>
        
        {/* Tips */}
        {currentStep.tips && currentStep.tips.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="font-medium text-green-900 mb-2 text-sm">
              💡 Pro Tips:
            </div>
            <ul className="space-y-1 text-sm text-green-800">
              {currentStep.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600">▪</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Video Placeholder */}
      <div className="bg-gray-900 rounded-lg p-8 mb-6 text-center">
        <div className="text-5xl mb-3">🎥</div>
        <div className="text-white text-sm mb-2">Video Tutorial</div>
        <div className="text-gray-400 text-xs">
          Coming soon: Watch step-by-step video guide
        </div>
      </div>
      
      {/* Help Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-xl">❓</span>
          <div className="text-sm">
            <div className="font-medium text-yellow-900 mb-1">
              Need help with this step?
            </div>
            <div className="text-yellow-700">
              Click the chat bubble to get live support from our team!
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
