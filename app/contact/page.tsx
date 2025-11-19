'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '', category: 'general' });
      
      // Reset success message after 5 seconds
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xl mb-4">
            QRDisplay
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Get in Touch</h1>
          <p className="text-lg text-gray-600">We're here to help! Send us a message.</p>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What can we help you with?
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="general">General Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="sms">SMS Messages / Opt-out</option>
              <option value="store">Store Partner Support</option>
              <option value="partnership">Brand Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="john@example.com"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="How can we help?"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Tell us more about your question or concern..."
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-purple-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'sending' ? '📤 Sending...' : '📨 Send Message'}
          </button>

          {/* Status Messages */}
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              ✅ Message sent successfully! We'll get back to you within 24 hours.
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              ❌ {errorMessage || 'Failed to send message. Please try again or email us directly.'}
            </div>
          )}
        </form>

        {/* Alternative Contact Methods */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-semibold text-gray-900 text-center mb-4">Other Ways to Reach Us</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Direct Email */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📧</span>
                <h4 className="font-semibold text-gray-900">Email</h4>
              </div>
              <a 
                href="mailto:jbonutto@gmail.com" 
                className="text-purple-600 hover:text-purple-700 font-medium text-sm underline break-all"
              >
                jbonutto@gmail.com
              </a>
            </div>

            {/* Store Login */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏪</span>
                <h4 className="font-semibold text-gray-900">Store Partners</h4>
              </div>
              <a 
                href="/store/login" 
                className="text-purple-600 hover:text-purple-700 font-medium text-sm underline"
              >
                Store Login →
              </a>
            </div>
          </div>

          {/* SMS Info */}
          <div className="bg-blue-50 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">SMS Messages</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Received an SMS from a store using QRDisplay? 
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Reply <strong>STOP</strong> to unsubscribe</li>
                  <li>• Reply <strong>START</strong> to resubscribe</li>
                  <li>• Reply <strong>HELP</strong> for info</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          <p className="font-semibold text-gray-900 mb-1">QRDisplay</p>
          <p>Connecting brands with retail stores</p>
          <p className="mt-2">© {new Date().getFullYear()} QRDisplay. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
