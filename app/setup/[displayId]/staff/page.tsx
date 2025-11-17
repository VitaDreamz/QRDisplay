'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WizardLayout } from '@/components/wizard/WizardLayout';
import { useWizardProgress } from '@/hooks/useWizardProgress';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROLES = ['Sales', 'Cashier', 'Manager', 'Marketing', 'Other'];

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  type: string;
  status: string;
  onCallDays: string[];
  onCallHoursStart: string | null;
  onCallHoursStop: string | null;
  verifiedAt: string | null;
}

export default function AddStaffPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayId, setDisplayId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [existingStaff, setExistingStaff] = useState<StaffMember[]>([]);
  const { saveProgress } = useWizardProgress(displayId);

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
    const storeIdParam = searchParams.get('storeId');
    if (storeIdParam) {
      setStoreId(storeIdParam);
    }
  }, [params, searchParams]);

  // Load existing staff when we have displayId
  useEffect(() => {
    if (!displayId) return;

    (async () => {
      try {
        // Get the display info to find the storeId
        const displayRes = await fetch(`/api/displays/${displayId}/info`);
        if (!displayRes.ok) {
          console.error('Could not fetch display info');
          setLoadingStaff(false);
          return;
        }
        const displayData = await displayRes.json();
        const currentStoreId = displayData.storeId;

        if (!currentStoreId) {
          console.log('Display not yet activated, no staff to load');
          setLoadingStaff(false);
          return;
        }

        setStoreId(currentStoreId);

        // Fetch existing staff for this store
        const staffRes = await fetch(`/api/stores/${currentStoreId}/staff`);
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          setExistingStaff(staffData.staff || []);
          console.log('Loaded existing staff:', staffData.staff?.length || 0);
        }
      } catch (err) {
        console.error('Error loading existing staff:', err);
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, [displayId]);

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
      const displayRes = await fetch(`/api/displays/${displayId}/info`);
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
          // Pass storeId explicitly for wizard context; API will also accept cookies when in dashboard
          'x-store-id': storeId
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone: cleanPhone,
          email,
          type: role,
          onCallDays: onCallDays,
          onCallHoursStart: startTime,
          onCallHoursStop: endTime,
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

  const handleSkip = () => {
    saveProgress({ staffAdded: false, currentStep: 10 });
    router.push(`/setup/${displayId}/success${storeId ? `?storeId=${storeId}` : ''}`);
  };

  return (
    <WizardLayout
      currentStep={9}
      totalSteps={10}
      stepLabel="Add Staff"
      displayId={displayId}
      showNext={false}
    >
      <div className="pb-20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">👥</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {existingStaff.length > 0 ? 'Manage Staff Members' : 'Add Your First Staff Member'}
          </h1>
          <p className="text-pink-200">
            {existingStaff.length > 0 
              ? 'Review existing staff and add more if needed'
              : "They'll receive SMS verification"}
          </p>
        </div>

        {/* Existing Staff Section */}
        {loadingStaff ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 text-center">
            <div className="text-gray-500">Loading existing staff...</div>
          </div>
        ) : existingStaff.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center justify-between">
              <span>Existing Staff ({existingStaff.length})</span>
              <span className="text-sm text-green-600">✓ Already Added</span>
            </h2>
            <div className="space-y-3">
              {existingStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-lg">
                        {staff.firstName} {staff.lastName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {staff.phone && `📱 ${staff.phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {staff.email && `✉️ ${staff.email}`}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-medium">
                          {staff.type}
                        </span>
                        {staff.verifiedAt && (
                          <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Add New Staff Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            {existingStaff.length > 0 ? '+ Add Another Staff Member' : 'Add Staff Member'}
          </h2>

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
          <div>
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
            {!success && (
              <>
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
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Skip This Step →
                </button>
              </>
            )}

            {success && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setRole('Sales');
                    setStartTime('09:00');
                    setEndTime('17:00');
                    // Reload staff list
                    (async () => {
                      try {
                        const staffRes = await fetch(`/api/stores/${storeId}/staff`);
                        if (staffRes.ok) {
                          const staffData = await staffRes.json();
                          setExistingStaff(staffData.staff || []);
                        }
                      } catch (err) {
                        console.error('Error reloading staff:', err);
                      }
                    })();
                  }}
                  className="w-full py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg transition-all"
                >
                  + Add Another Staff Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveProgress({ staffAdded: true, currentStep: 10 });
                    router.push(`/setup/${displayId}/success${storeId ? `?storeId=${storeId}` : ''}`);
                  }}
                  className="w-full py-3 border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
                >
                  Continue to Success →
                </button>
              </>
            )}
          </div>
        </form>

        {/* Skip/Continue Button for when there's existing staff */}
        {existingStaff.length > 0 && !success && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                saveProgress({ staffAdded: true, currentStep: 10 });
                router.push(`/setup/${displayId}/success${storeId ? `?storeId=${storeId}` : ''}`);
              }}
              className="w-full py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Continue with Existing Staff →
            </button>
          </div>
        )}
        </div>
      </div>
    </WizardLayout>
  );
}
