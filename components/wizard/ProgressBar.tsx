'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
}

export function ProgressBar({ currentStep, totalSteps, stepLabel }: ProgressBarProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);
  
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Step indicator */}
        <div className="text-sm opacity-90 mb-2">
          Step {currentStep} of {totalSteps}
          {stepLabel && ` • ${stepLabel}`}
        </div>
        
        {/* Progress bar */}
        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-white h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Percentage */}
        <div className="text-right text-xs opacity-75 mt-1">
          {percentage}% Complete
        </div>
      </div>
    </div>
  );
}
