'use client';

import { useRouter } from 'next/navigation';
import { ProgressBar } from './ProgressBar';
import { SupportBubble } from './SupportBubble';

interface WizardLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  displayId: string;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  nextPath?: string;
}

export function WizardLayout({
  children,
  currentStep,
  totalSteps,
  stepLabel,
  displayId,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
  showNext = true,
  nextPath
}: WizardLayoutProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };
  
  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (nextPath) {
      router.push(nextPath);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Progress bar at top */}
      <ProgressBar 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
        stepLabel={stepLabel}
      />
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">
          {children}
          
          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8 pb-4">
            {showBack && currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 h-12 px-6 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                ← Back
              </button>
            )}
            {showNext && (
              <button
                onClick={handleNext}
                disabled={nextDisabled}
                className="flex-1 h-12 px-6 text-white bg-purple-600 rounded-lg font-semibold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nextLabel} →
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Support chat bubble */}
      <SupportBubble />
    </div>
  );
}
