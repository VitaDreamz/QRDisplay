'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

export default function PhotoPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { saveProgress } = useWizardProgress(displayId);
  
  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
    });
  }, [params]);
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload photo
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('displayId', displayId);
      
      const res = await fetch('/api/setup/photo', {
        method: 'POST',
        body: formData
      });
      
      const result = await res.json();
      
      if (result.success) {
        setPhotoUploaded(true);
        saveProgress({ currentStep: 5, photoUploaded: true });
      } else {
        alert('Upload failed: ' + result.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };
  
  const handleContinue = () => {
    if (displayId) {
      saveProgress({ currentStep: 6 });
      router.push(`/setup/${displayId}/store-lookup`);
    }
  };
  
  const handleSkip = () => {
    if (confirm('Are you sure you want to skip the photo? You\'ll miss out on a 50 SMS credit!')) {
      handleContinue();
    }
  };
  
  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }
  
  return (
    <WizardLayout
      currentStep={5}
      totalSteps={8}
      stepLabel="Photo"
      displayId={displayId}
      nextLabel="Continue to Activation"
      onNext={handleContinue}
      showNext={photoUploaded}
    >
      {/* Success Message */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-6 mb-6 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h1 className="text-2xl font-bold mb-2">
          Great! Your display is assembled!
        </h1>
        <p className="text-green-50">
          Now let's get you set up and earning
        </p>
      </div>
      
      {/* Tips Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-lg mb-3">📍 Placement Tips:</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-purple-600">▪</span>
            <span><strong>High-visibility area:</strong> Place near checkout or high-traffic zones</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600">▪</span>
            <span><strong>Keep samples stocked:</strong> Reorder before you run out</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600">▪</span>
            <span><strong>Train your staff:</strong> They'll need to use the PIN system</span>
          </li>
        </ul>
      </div>
      
      {/* Photo Incentive */}
      {!photoUploaded ? (
        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-lg p-6 mb-6">
          <div className="text-center mb-4">
            <div className="text-5xl mb-3">📸</div>
            <h2 className="text-2xl font-bold mb-2">
              Show Us Your Setup!
            </h2>
            <p className="text-yellow-50 text-sm mb-4">
              Upload a photo of your assembled display and earn:
            </p>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4 inline-block">
              <div className="text-4xl font-bold">50 SMS</div>
              <div className="text-sm">Messages</div>
            </div>
          </div>
          
          {/* Upload Area */}
          <div className="bg-white/90 backdrop-blur rounded-lg p-6 text-center">
            {photoPreview ? (
              <div>
                <img 
                  src={photoPreview} 
                  alt="Setup preview" 
                  className="max-w-full h-48 mx-auto rounded-lg mb-3 object-cover"
                />
                {uploading && (
                  <div className="text-gray-600">Uploading...</div>
                )}
              </div>
            ) : (
              <>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="bg-purple-100 hover:bg-purple-200 transition-colors rounded-lg p-8 border-2 border-dashed border-purple-400">
                    <div className="text-5xl mb-3">📷</div>
                    <div className="font-semibold text-purple-900 mb-1">
                      Tap to Take Photo
                    </div>
                    <div className="text-sm text-purple-700">
                      Or choose from your photos
                    </div>
                  </div>
                </label>
                <div className="text-xs text-gray-600 mt-3">
                  Bonus SMS messages for follow-ups
                </div>
              </>
            )}
          </div>
          
          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="w-full mt-4 py-2 text-white/80 hover:text-white text-sm underline"
          >
            Skip for now
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold mb-2">
            Photo Uploaded!
          </h2>
          <div className="bg-white/20 backdrop-blur rounded-lg p-4 inline-block mb-3">
            <div className="text-4xl font-bold">50 SMS</div>
            <div className="text-sm">Messages Earned ✓</div>
          </div>
          <p className="text-green-50 text-sm">
            Thanks for sharing! Your extra SMS messages for customer follow-ups.
          </p>
        </div>
      )}
      
      {/* What's Next */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-2">
          <span className="text-xl">👉</span>
          <div className="text-sm">
            <div className="font-medium text-blue-900 mb-1">
              Next: Activate Your Store
            </div>
            <div className="text-blue-700">
              We'll connect your display to our system and get you ready to start collecting samples!
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
