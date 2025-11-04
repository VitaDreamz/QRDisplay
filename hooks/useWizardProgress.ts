'use client';

import { useEffect, useState } from 'react';

export interface WizardProgress {
  displayId: string;
  currentStep: number;
  displayOption: 'A' | 'B' | 'C' | null;
  photoUploaded: boolean;
  activated: boolean;
  timestamp: string;
  assemblySteps?: Record<string, boolean>;
}

const STORAGE_KEY = 'qrdisplay-wizard-progress';

export function useWizardProgress(displayId: string) {
  const [progress, setProgress] = useState<WizardProgress | null>(null);
  const [saved, setSaved] = useState(false);
  
  // Load progress on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${displayId}`);
      if (stored) {
        try {
          setProgress(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse wizard progress:', e);
        }
      }
    }
  }, [displayId]);
  
  // Save progress (debounced)
  const saveProgress = (updates: Partial<WizardProgress>) => {
    const newProgress: WizardProgress = {
      displayId,
      currentStep: 1,
      displayOption: null,
      photoUploaded: false,
      activated: false,
      timestamp: new Date().toISOString(),
      ...progress,
      ...updates
    };
    
    setProgress(newProgress);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}-${displayId}`, JSON.stringify(newProgress));
      
      // Show saved indicator
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };
  
  // Clear progress
  const clearProgress = () => {
    setProgress(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY}-${displayId}`);
    }
  };
  
  return {
    progress,
    saveProgress,
    clearProgress,
    saved
  };
}
