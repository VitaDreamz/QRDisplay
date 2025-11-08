'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateWholesaleAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Business Information
    businessName: '',
    businessType: 'retail', // retail, restaurant, spa, etc.
    taxId: '',
    
    // Primary Contact
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    
    // Billing Address
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'US',
    
    // Shipping Address (can be same as billing)
    sameAsbilling: true,
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'US',
    
    // Sales Rep Assignment
    salesRepName: '',
    salesRepEmail: '',
    salesRepPhone: '',
    
    // Additional Info
    hearAboutUs: '',
    estimatedMonthlyVolume: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/shopify/create-wholesale-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`✅ Wholesale account created successfully!\n\nCustomer ID: ${result.customerId}\nEmail: ${formData.contactEmail}`);
        router.push('/admin/brands/ORG-VITADREAMZ/wholesale-customers');
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create account');
      }
    } catch (err: any) {
      console.error('Error:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-purple-600 hover:text-purple-700 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create Wholesale Business Account</h1>
          <p className="text-gray-600 mt-2">
            Set up a new wholesale customer account in Shopify with all necessary information
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Business Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Business Name *</label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., ABC Retail Store"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={(e) => updateField('businessType', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="retail">Retail Store</option>
                  <option value="restaurant">Restaurant/Bar</option>
                  <option value="spa">Spa/Wellness Center</option>
                  <option value="gym">Gym/Fitness Center</option>
                  <option value="hotel">Hotel/Resort</option>
                  <option value="distributor">Distributor</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tax ID (Optional)</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => updateField('taxId', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Primary Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => updateField('contactName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="john@business.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Billing Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={formData.billingAddress1}
                  onChange={(e) => updateField('billingAddress1', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Address Line 2</label>
                <input
                  type="text"
                  value={formData.billingAddress2}
                  onChange={(e) => updateField('billingAddress2', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Suite 100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.billingCity}
                  onChange={(e) => updateField('billingCity', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Los Angeles"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">State *</label>
                <input
                  type="text"
                  required
                  value={formData.billingState}
                  onChange={(e) => updateField('billingState', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                <input
                  type="text"
                  required
                  value={formData.billingZip}
                  onChange={(e) => updateField('billingZip', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="90001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country *</label>
                <select
                  value={formData.billingCountry}
                  onChange={(e) => updateField('billingCountry', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Shipping Address</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sameAsbilling}
                  onChange={(e) => updateField('sameAsbilling', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Same as billing</span>
              </label>
            </div>
            
            {!formData.sameAsBinding && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Address Line 1 *</label>
                  <input
                    type="text"
                    required={!formData.sameAsBinding}
                    value={formData.shippingAddress1}
                    onChange={(e) => updateField('shippingAddress1', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.shippingAddress2}
                    onChange={(e) => updateField('shippingAddress2', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Suite 100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <input
                    type="text"
                    required={!formData.sameAsBinding}
                    value={formData.shippingCity}
                    onChange={(e) => updateField('shippingCity', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Los Angeles"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State *</label>
                  <input
                    type="text"
                    required={!formData.sameAsBinding}
                    value={formData.shippingState}
                    onChange={(e) => updateField('shippingState', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    required={!formData.sameAsBinding}
                    value={formData.shippingZip}
                    onChange={(e) => updateField('shippingZip', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="90001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country *</label>
                  <select
                    value={formData.shippingCountry}
                    onChange={(e) => updateField('shippingCountry', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Sales Rep Assignment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Sales Rep Assignment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Sales Rep Name</label>
                <input
                  type="text"
                  value={formData.salesRepName}
                  onChange={(e) => updateField('salesRepName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sales Rep Email</label>
                <input
                  type="email"
                  value={formData.salesRepEmail}
                  onChange={(e) => updateField('salesRepEmail', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="jane@vitadreamz.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sales Rep Phone</label>
                <input
                  type="tel"
                  value={formData.salesRepPhone}
                  onChange={(e) => updateField('salesRepPhone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Additional Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">How did they hear about us?</label>
                <input
                  type="text"
                  value={formData.hearAboutUs}
                  onChange={(e) => updateField('hearAboutUs', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Referral, Trade Show, Website"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Monthly Volume</label>
                <select
                  value={formData.estimatedMonthlyVolume}
                  onChange={(e) => updateField('estimatedMonthlyVolume', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select range...</option>
                  <option value="<500">Less than $500</option>
                  <option value="500-1000">$500 - $1,000</option>
                  <option value="1000-2500">$1,000 - $2,500</option>
                  <option value="2500-5000">$2,500 - $5,000</option>
                  <option value="5000+">$5,000+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Internal Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Any additional notes about this customer..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold"
            >
              {loading ? 'Creating Account...' : 'Create Wholesale Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
