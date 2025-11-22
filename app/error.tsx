'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-700 via-red-600 to-orange-600 px-4">
      <div className="text-center">
        {/* SampleHound Dog Head Logo */}
        <div className="mb-8 flex justify-center">
          <img 
            src="/images/Logos/SampleHoundLogo.png" 
            alt="SafeHound" 
            className="h-32 w-auto opacity-90"
          />
        </div>
        
        {/* Error Message */}
        <h1 className="text-8xl font-bold text-white mb-4">Oops!</h1>
        <h2 className="text-3xl font-semibold text-white mb-4">Something went wrong</h2>
        <p className="text-xl text-red-100 mb-8 max-w-md mx-auto">
          We encountered an unexpected error. Don't worry, we're on it!
        </p>
        
        {/* Error Details (for debugging) */}
        {error.message && (
          <div className="mb-8 max-w-2xl mx-auto">
            <details className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-left">
              <summary className="cursor-pointer text-white font-semibold mb-2">
                Error Details
              </summary>
              <p className="text-red-100 text-sm font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-red-200 text-xs mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </details>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-colors shadow-lg"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-red-800 text-white rounded-lg font-semibold hover:bg-red-900 transition-colors shadow-lg"
          >
            Go Home
          </Link>
          <Link
            href="/store/login"
            className="px-6 py-3 bg-orange-700 text-white rounded-lg font-semibold hover:bg-orange-800 transition-colors shadow-lg"
          >
            Store Login
          </Link>
        </div>
        
        {/* Footer */}
        <p className="mt-12 text-sm text-red-200">
          Powered by SafeHound
        </p>
      </div>
    </div>
  );
}
