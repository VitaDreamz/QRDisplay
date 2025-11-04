'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROLES = ['Sales', 'Cashier', 'Manager', 'Marketing', 'Other'];

export default function AddStaffPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales');
  const [onCallDays, setOnCallDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  useEffect(() => {
    params.then(p => {
      setDisplayId(p.displayId);
    });
  }, [params]);

  const toggleDay = (day: string) => {
    if (onCallDays.includes(day)) {
      setOnCallDays(onCallDays.filter(d => d !== day));
    } else {
      setOnCallDays([...onCallDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    const phoneRegex = /^\d{10}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Phone must be 10 digits');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }

    try {
      // First, get the storeId from the display
      const displayRes = await fetch(`/api/displays/${displayId}`);
      if (!displayRes.ok) {
        throw new Error('Could not find store');
      }
      const displayData = await displayRes.json();
      const storeId = displayData.storeId;

      if (!storeId) {
        throw new Error('Display not yet activated');
      }

      // Add staff member
      const response = await fetch('/api/store/staff', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': `store-id=${storeId}` // Simulate being logged in as store owner
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: cleanPhone,
          email,
          type: role,
          onCallDays: onCallDays.join(','),
          onCallStart: startTime,
          onCallEnd: endTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to add staff member');
        setLoading(false);
        return;
      }

      // Success
      setSuccess(true);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setOnCallDays([]);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  if (!displayId) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>;
  }

  const isFormValid = firstName && lastName && phone && email && role;

  return (
    <WizardLayout
      currentStep={8}
      totalSteps={8}
      stepLabel="Add Staff"
      displayId={displayId}
      showNext={false}
    >
      <div className="pb-20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👥</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Add Your First Staff Member
          </h1>
          <p className="text-gray-600">
            They'll receive SMS verification
          </p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="text-green-800 font-medium mb-1">✓ Staff member added!</div>
            <div className="text-sm text-green-700">
              They'll receive an SMS with verification instructions.
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="text-red-800 text-sm">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Staff Information</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="5551234567"
                />
                <p className="text-xs text-purple-600 mt-1">
                  Their PIN will be the last 4 digits: {phone.slice(-4) || '****'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="john@store.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule (Optional) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="font-semibold text-lg mb-4">Schedule (Optional)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">On-Call Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        onCallDays.includes(day)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                loading || !isFormValid
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg'
              }`}
            >
              {loading ? 'Adding...' : '+ Add Staff Member'}
            </button>

            {success && (
              <button
                type="button"
                onClick={() => {
                  // Get storeId and redirect to dashboard
                  fetch(`/api/displays/${displayId}`)
                    .then(res => res.json())
                    .then(data => {
                      if (data.storeId) {
                        router.push(`/store/login/${data.storeId}`);
                      }
                    });
                }}
                className="w-full py-3 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
              >
                Done - Go to Dashboard →
              </button>
            )}
          </div>
        </form>
      </div>
    </WizardLayout>
  );
}
