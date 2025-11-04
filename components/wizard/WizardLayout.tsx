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
        </div>
      </div>
      
      {/* Navigation buttons */}
      {(showBack || showNext) && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-md mx-auto flex gap-3">
            {showBack && currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
            )}
            
            {showNext && (
              <button
                onClick={handleNext}
                disabled={nextDisabled}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  nextDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg'
                }`}
              >
                {nextLabel} →
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Support chat bubble */}
      <SupportBubble />
    </div>
  );
}
