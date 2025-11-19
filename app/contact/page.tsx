import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us | QRDisplay',
  description: 'Get in touch with QRDisplay support team',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact QRDisplay</h1>
          <p className="text-lg text-gray-600">We're here to help!</p>
        </div>

        <div className="space-y-6">
          {/* Email Support */}
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📧</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Support</h2>
                <p className="text-gray-600 mb-3">
                  For general inquiries, technical support, or partnership questions:
                </p>
                <a 
                  href="mailto:support@qrdisplay.com" 
                  className="text-purple-600 hover:text-purple-700 font-medium text-lg underline"
                >
                  support@qrdisplay.com
                </a>
                <p className="text-sm text-gray-500 mt-2">
                  We typically respond within 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* SMS Opt-out Help */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📱</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">SMS Messages</h2>
                <p className="text-gray-600 mb-3">
                  Received an SMS from a store using QRDisplay?
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Reply <strong>STOP</strong> to unsubscribe from that store's messages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Reply <strong>START</strong> to resubscribe</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Reply <strong>HELP</strong> for assistance</span>
                  </li>
                </ul>
                <p className="text-sm text-gray-500 mt-3">
                  Note: Messages are sent by individual stores, not QRDisplay directly
                </p>
              </div>
            </div>
          </div>

          {/* Store Partners */}
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🏪</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">For Store Partners</h2>
                <p className="text-gray-600 mb-3">
                  Already using QRDisplay? Log in to your dashboard:
                </p>
                <a 
                  href="/store/login" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Store Login
                </a>
              </div>
            </div>
          </div>

          {/* Business Inquiries */}
          <div className="bg-orange-50 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💼</div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Brand Partnerships</h2>
                <p className="text-gray-600 mb-3">
                  Interested in becoming a QRDisplay brand partner?
                </p>
                <a 
                  href="mailto:partnerships@qrdisplay.com" 
                  className="text-purple-600 hover:text-purple-700 font-medium text-lg underline"
                >
                  partnerships@qrdisplay.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p>QRDisplay - Connecting brands with retail stores</p>
          <p className="mt-1">© {new Date().getFullYear()} QRDisplay. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
