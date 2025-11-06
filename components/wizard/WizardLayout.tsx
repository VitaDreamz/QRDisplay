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
      
      {/* Support chat bubble */}
      <SupportBubble />
    </div>
  );
}
