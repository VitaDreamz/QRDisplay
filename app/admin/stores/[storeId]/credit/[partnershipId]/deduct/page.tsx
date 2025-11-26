import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

export default async function DeductCreditPage({
  params,
}: {
  params: Promise<{ storeId: string; partnershipId: string }>;
}) {
  const { storeId, partnershipId } = await params;

  const partnership = await prisma.storeBrandPartnership.findUnique({
    where: { id: partnershipId },
    include: {
      store: true,
      brand: true,
    },
  });

  if (!partnership || partnership.store.storeId !== storeId) {
    notFound();
  }

  async function handleDeductCredit(formData: FormData) {
    'use server';

    const amount = parseFloat(formData.get('amount') as string);
    const reason = formData.get('reason') as string;

    if (!amount || amount <= 0 || !reason) {
      return;
    }

    // Get current balance
    const currentPartnership = await prisma.storeBrandPartnership.findUnique({
      where: { id: partnershipId },
    });

    if (!currentPartnership) {
      return;
    }

    const newBalance = Number(currentPartnership.storeCreditBalance) - amount;

    // Create transaction and update balance
    await prisma.$transaction([
      prisma.storeCreditTransaction.create({
        data: {
          storeId: currentPartnership.storeId,
          brandPartnershipId: partnershipId,
          amount: -amount, // Negative amount for deductions
          type: 'adjustment',
          reason,
          balance: newBalance,
        },
      }),
      prisma.storeBrandPartnership.update({
        where: { id: partnershipId },
        data: { storeCreditBalance: newBalance },
      }),
    ]);

    redirect(`/admin/stores/${storeId}/credit`);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Deduct Store Credit</h1>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-gray-600">Store: <span className="font-medium">{partnership.store.storeName}</span></p>
        <p className="text-sm text-gray-600">Brand: <span className="font-medium">{partnership.brand.name}</span></p>
        <p className="text-sm text-gray-600">Current Balance: <span className="font-medium text-green-600">${Number(partnership.storeCreditBalance).toFixed(2)}</span></p>
      </div>

      <form action={handleDeductCredit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-1">
            Amount to Deduct ($)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            step="0.01"
            min="0.01"
            required
            className="w-full border rounded px-3 py-2"
            placeholder="10.00"
          />
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium mb-1">
            Reason
          </label>
          <textarea
            id="reason"
            name="reason"
            required
            rows={3}
            className="w-full border rounded px-3 py-2"
            placeholder="Manual credit adjustment by admin"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Deduct Credit
          </button>
          <a
            href={`/admin/stores/${storeId}/credit`}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 text-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
