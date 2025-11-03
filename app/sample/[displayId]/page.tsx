'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhoneDisplay } from '@/lib/phone';

type BrandInfo = {
  name: string;
  logoUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  storeName?: string | null;
};

const SAMPLE_OPTIONS = [
  'Slumber Berry - Sleep Gummies (4ct)',
  'Luna Berry - Sleep Gummies (4ct)',
  'Bliss Berry - Relax Gummies (4ct)',
  'Berry Chill - Relax Gummies (4ct)'
];

export default function SampleRequestPage({ params }: { params: Promise<{ displayId: string }> }) {
  const router = useRouter();
  const [displayId, setDisplayId] = useState<string>('');
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [sampleChoice, setSampleChoice] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    (async () => {
      const p = await params;
      setDisplayId(p.displayId);
      try {
        const res = await fetch(`/api/displays/${p.displayId}/brand`, { cache: 'no-store' });
        const data = await res.json();
        setBrand(data);
      } catch (e) {
        console.error('Failed to fetch brand info', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  const headerTitle = useMemo(() => {
    if (!brand) return '';
    const left = brand.name || 'Brand';
    const right = brand.storeName || 'Your Store';
    return `${left} × ${right}`;
  }, [brand]);

  function validate(): boolean {
    const errs: { [k: string]: string } = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) errs.phone = 'Enter a valid 10-digit US phone';

    if (!sampleChoice) errs.sampleChoice = 'Please choose a sample';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) {
      // subtle shake by toggling a class could be added; skip for brevity
      return;
    }

    // Haptic feedback if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { (navigator as any).vibrate?.(20); } catch {}
    }

    try {
      setSubmitting(true);
      const resp = await fetch('/api/samples/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId, firstName, lastName, phone, sampleChoice }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErrors({ form: json.error || 'Something went wrong' });
        setSubmitting(false);
        return;
      }

      const params = new URLSearchParams({
        storeName: brand?.storeName || '',
        sample: sampleChoice,
        memberId: json.memberId || '',
      });
      router.push(`/sample/${displayId}/success?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setErrors({ form: 'Network error. Please try again.' });
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#f7f5fb]">
        <div className="text-[#2b2b2b]">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#f7f5fb] text-[#2b2b2b]">
      <div className="max-w-md mx-auto px-5 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt={brand?.name || 'Brand'} className="w-16 h-16 rounded-lg mx-auto mb-3 bg-white p-2" />
          ) : null}
          <h1 className="text-2xl font-bold leading-tight">{headerTitle}</h1>
          <p className="text-sm mt-1 text-[#6b6b6b]">Free Sample Program</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5">
          <p className="text-base mb-4">Claim your free sample in 30 seconds</p>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm mb-1">First Name</label>
              <input
                className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                placeholder="John"
                type="text"
                autoCapitalize="words"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm mb-1">Last Name</label>
              <input
                className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                placeholder="Doe"
                type="text"
                autoCapitalize="words"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm mb-1">Phone Number</label>
              <input
                className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                placeholder="(555) 123-4567"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
              />
              {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
            </div>

            {/* Sample Choice */}
            <div>
              <label className="block text-sm mb-1">Sample Choice</label>
              <select
                className="w-full h-12 px-4 text-base border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:ring-2 focus:ring-purple-200 focus:outline-none bg-white"
                value={sampleChoice}
                onChange={(e) => setSampleChoice(e.target.value)}
              >
                <option value="" disabled>Select a sample</option>
                {SAMPLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.sampleChoice && <p className="text-red-600 text-sm mt-1">{errors.sampleChoice}</p>}
            </div>

            {errors.form && (
              <div className="text-red-700 text-sm">{errors.form}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold bg-purple-600 text-white rounded-xl active:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Claim My Free Sample →'}
            </button>

            <p className="text-xs text-gray-500 text-center">Standard message rates may apply</p>
          </form>
        </div>
      </div>
    </div>
  );
}
