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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex flex-col">
      {/* Progress bar at top */}
      <ProgressBar 
        currentStep={currentStep} 
        totalSteps={totalSteps} 
        stepLabel={stepLabel}
      />
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-4 py-6 ${currentStep === 8 ? 'max-w-4xl' : 'max-w-md'}`}>
          {children}
          
          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8 pb-4">
            {showBack && currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 h-12 px-6 text-white bg-white/20 backdrop-blur-sm border-2 border-white/50 rounded-lg font-semibold hover:bg-white/30 hover:border-white/70 active:scale-[0.98] transition-all shadow-lg"
              >
                ← Back
              </button>
            )}
            {showNext && (
              <button
                onClick={handleNext}
                disabled={nextDisabled}
                className="flex-1 h-12 px-6 text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/50"
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
