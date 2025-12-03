import Link from 'next/link';

export const metadata = {
  title: 'Privacy Center | QRDisplay',
  description: 'Manage your privacy preferences and exercise your data rights under CCPA.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xl mb-4">
            🔐 Privacy Center
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Privacy Rights</h1>
          <p className="text-lg text-gray-600">
            We respect your privacy. Manage your data and exercise your rights under California law.
          </p>
        </div>

        {/* Rights Cards */}
        <div className="space-y-4 mb-10">
          {/* Export Data */}
          <Link href="/privacy/export-my-data" className="block">
            <div className="border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
                    Export My Data
                  </h2>
                  <p className="text-gray-600 mt-1">
                    View and download a copy of all personal data we have about you.
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Delete Data */}
          <Link href="/privacy/delete-my-data" className="block">
            <div className="border border-gray-200 rounded-xl p-6 hover:border-red-500 hover:shadow-md transition group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🗑️</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-red-600 transition">
                    Delete My Data
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Request permanent deletion of your personal information from our systems.
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Opt Out */}
          <Link href="/contact?category=sms" className="block">
            <div className="border border-gray-200 rounded-xl p-6 hover:border-purple-500 hover:shadow-md transition group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📵</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition">
                    Opt Out of Communications
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Stop receiving SMS messages by replying STOP or contacting us.
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* CCPA Information */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">🏛️ Your Rights Under California Law (CCPA)</h3>
          <ul className="text-gray-600 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="text-green-500">✓</span>
              <span><strong>Right to Know:</strong> You can request disclosure of what personal information we collect, use, and share about you.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-500">✓</span>
              <span><strong>Right to Delete:</strong> You can request deletion of personal information we have collected from you.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-500">✓</span>
              <span><strong>Right to Opt-Out:</strong> You can opt out of the sale of your personal information (we do not sell your data).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-500">✓</span>
              <span><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights.</span>
            </li>
          </ul>
        </div>

        {/* Data We Collect */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">📊 Categories of Data We Collect</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Personal Identifiers</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Name</li>
                <li>• Phone number</li>
                <li>• Email address</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Transaction Information</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Sample redemptions</li>
                <li>• Promo usage</li>
                <li>• Purchase history</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="text-center text-gray-600">
          <p className="mb-2">Questions about your privacy?</p>
          <Link href="/contact" className="text-purple-600 font-semibold hover:underline">
            Contact Us →
          </Link>
        </div>
      </div>
    </div>
  );
}
