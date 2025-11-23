import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function StoreCreditPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;

  // Get store with brand partnerships and credit transactions
  const store = await prisma.store.findUnique({
    where: { storeId },
    include: {
      brandPartnerships: {
        include: {
          brand: true,
          creditTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      },
    },
  });

  if (!store) {
    notFound();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        Store Credit Management: {store.storeName}
      </h1>
      <p className="text-gray-600 mb-8">{storeId}</p>

      {store.brandPartnerships.length === 0 ? (
        <p className="text-gray-500">No brand partnerships found for this store.</p>
      ) : (
        <div className="space-y-8">
          {store.brandPartnerships.map((partnership) => (
            <div key={partnership.id} className="border rounded-lg p-6 bg-white shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{partnership.brand.name}</h2>
                  <p className="text-gray-600">Partnership ID: {partnership.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    ${Number(partnership.storeCreditBalance).toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600">Current Balance</p>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <Link
                  href={`/admin/stores/${storeId}/credit/${partnership.id}/add`}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  + Add Credit
                </Link>
                <Link
                  href={`/admin/stores/${storeId}/credit/${partnership.id}/deduct`}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  - Deduct Credit
                </Link>
              </div>

              <h3 className="text-lg font-semibold mb-3">Recent Transactions</h3>
              {partnership.creditTransactions.length === 0 ? (
                <p className="text-gray-500 text-sm">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Amount</th>
                        <th className="text-left p-2">Balance</th>
                        <th className="text-left p-2">Reason</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnership.creditTransactions.map((tx) => (
                        <tr key={tx.id} className="border-t">
                          <td className="p-2">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                tx.type === 'earned'
                                  ? 'bg-green-100 text-green-800'
                                  : tx.type === 'used'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={
                                tx.type === 'earned'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }
                            >
                              {tx.type === 'earned' ? '+' : '-'}$
                              {Math.abs(Number(tx.amount)).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-2">
                            ${Number(tx.balance).toFixed(2)}
                          </td>
                          <td className="p-2 max-w-xs truncate">{tx.reason}</td>
                          <td className="p-2">
                            <form
                              action={`/api/admin/credit-transactions/${tx.id}/delete`}
                              method="POST"
                            >
                              <button
                                type="submit"
                                className="text-red-600 hover:underline text-xs"
                                onClick={(e) => {
                                  if (
                                    !confirm(
                                      'Are you sure you want to delete this transaction?'
                                    )
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
