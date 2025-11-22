import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 via-purple-600 to-blue-600 px-4">
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
        <h1 className="text-8xl font-bold text-white mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-xl text-purple-100 mb-8 max-w-md mx-auto">
          Oops! The page you're looking for seems to have wandered off.
        </p>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg"
          >
            Go Home
          </Link>
          <Link
            href="/store/login"
            className="px-6 py-3 bg-purple-800 text-white rounded-lg font-semibold hover:bg-purple-900 transition-colors shadow-lg"
          >
            Store Login
          </Link>
        </div>
        
        {/* Footer */}
        <p className="mt-12 text-sm text-purple-200">
          Powered by SafeHound
        </p>
      </div>
    </div>
  );
}
