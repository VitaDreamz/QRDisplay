"use client";

import { useMemo } from 'react';

export default function SampleSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ displayId: string }>;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const storeName = (searchParams?.storeName as string) || 'your store';
  const sample = (searchParams?.sample as string) || 'your sample';
  const memberId = (searchParams?.memberId as string) || '';

  const bigMember = useMemo(() => memberId || 'MEM-XXX', [memberId]);

  return (
    <div className="min-h-svh bg-[#f7f5fb] text-[#2b2b2b]">
      <div className="max-w-md mx-auto px-5 py-10">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <span className="text-3xl text-emerald-500">✓</span>
          </div>
          <h1 className="text-2xl font-bold">Your Sample is Ready!</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 text-center">
          <p className="text-lg">Show this text message to staff at</p>
          <p className="text-xl font-semibold mt-1">{storeName}</p>
          <p className="text-lg mt-2">to claim your</p>
          <p className="text-xl font-semibold text-purple-700">{sample}</p>

          <div className="mt-6">
            <div className="text-sm text-gray-600">Your Member ID</div>
            <div className="font-mono text-2xl mt-1">{bigMember}</div>
            <div className="text-xs text-gray-500 mt-1">Save this for your records</div>
          </div>

          <div className="mt-6 text-left space-y-2 text-base">
            <div>📱 Check your phone for a text message</div>
            <div>💬 Show the message to store staff</div>
            <div>🎁 Enjoy your free sample!</div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6">
          Questions? Contact support@qrdisplay.com
        </div>
      </div>
    </div>
  );
}
