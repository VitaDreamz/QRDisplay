import prisma from '@/lib/prisma';
import Link from 'next/link';

export default async function AdminStoresPage() {
  const stores = await prisma.store.findMany({
    include: {
      brandPartnerships: {
        include: {
          brand: true,
        },
      },
      _count: {
        select: {
          staff: true,
        },
      },
    },
    orderBy: {
      storeName: 'asc',
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Store Management</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Store ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand Partnerships</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stores.map((store) => (
              <tr key={store.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium">{store.storeName}</div>
                  <div className="text-sm text-gray-500">{store.city}, {store.state}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono">{store.storeId}</td>
                <td className="px-6 py-4 text-sm">{store._count.staff}</td>
                <td className="px-6 py-4 text-sm">
                  {store.brandPartnerships.length > 0 ? (
                    <div className="space-y-1">
                      {store.brandPartnerships.map((p) => (
                        <div key={p.id} className="text-xs">
                          {p.brand.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Link
                    href={`/admin/stores/${store.storeId}/credit`}
                    className="text-blue-600 hover:underline"
                  >
                    Manage Credit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {stores.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No stores found
          </div>
        )}
      </div>
    </div>
  );
}
