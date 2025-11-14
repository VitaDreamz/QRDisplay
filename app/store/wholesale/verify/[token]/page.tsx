'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyWholesaleOrderPage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadOrder();
  }, [params.token]);

  async function loadOrder() {
    try {
      const response = await fetch(`/api/store/wholesale/verify/${params.token}`);
      if (!response.ok) throw new Error('Order not found');
      
      const data = await response.json();
      setOrder(data.order);
      
      // Initialize received quantities with expected amounts
      const quantities: Record<string, number> = {};
      data.order.items.forEach((item: any) => {
        quantities[item.id] = item.retailUnits || 0;
      });
      setReceivedQuantities(quantities);
    } catch (error) {
      console.error('Error loading order:', error);
      alert('Invalid or expired verification link');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!confirm('Confirm you have verified all received inventory?')) return;

    setVerifying(true);
    try {
      const response = await fetch(`/api/store/wholesale/verify/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedQuantities,
          notes,
        }),
      });

      if (!response.ok) throw new Error('Verification failed');

      alert('✅ Inventory verified and updated!');
      router.push('/store/dashboard');
    } catch (error: any) {
      console.error('Error verifying order:', error);
      alert(`Failed to verify: ${error.message}`);
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Order not found or already verified</p>
        </div>
      </div>
    );
  }

  const totalExpected = order.items.reduce((sum: number, item: any) => sum + (item.retailUnits || 0), 0);
  const totalReceived = Object.values(receivedQuantities).reduce((sum: number, qty: number) => sum + qty, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Verify Wholesale Order</h1>
              <p className="text-gray-600">Order #{order.orderId}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Store:</strong> {order.store.name}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Delivered:</strong> {new Date(order.deliveredAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Items to Verify */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Verify Received Items</h2>
          <p className="text-sm text-gray-600 mb-4">
            Please confirm the quantity of each product you received. Adjust if any items were short or damaged.
          </p>

          <div className="space-y-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  {item.product?.imageUrl && (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.product?.name || item.productSku}</h3>
                    <p className="text-sm text-gray-600">
                      {item.quantity}x {item.product?.name} ({item.product?.unitsPerBox} units each)
                    </p>
                    <p className="text-sm font-medium text-purple-600 mt-1">
                      Expected: {item.retailUnits} retail units
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReceivedQuantities(prev => ({
                        ...prev,
                        [item.id]: Math.max(0, (prev[item.id] || 0) - 1)
                      }))}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={receivedQuantities[item.id] || 0}
                      onChange={(e) => setReceivedQuantities(prev => ({
                        ...prev,
                        [item.id]: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      className="w-20 text-center border border-gray-300 rounded px-2 py-1 font-bold"
                    />
                    <button
                      onClick={() => setReceivedQuantities(prev => ({
                        ...prev,
                        [item.id]: (prev[item.id] || 0) + 1
                      }))}
                      className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
                
                {receivedQuantities[item.id] !== item.retailUnits && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ Discrepancy: Expected {item.retailUnits}, received {receivedQuantities[item.id]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">Total Expected:</span>
              <span className="text-lg font-bold text-gray-900">{totalExpected} units</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Total Received:</span>
              <span className={`text-lg font-bold ${totalReceived === totalExpected ? 'text-green-600' : 'text-yellow-600'}`}>
                {totalReceived} units
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional - e.g., damaged items, missing boxes)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter any notes about the shipment..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/store/dashboard')}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {verifying ? 'Verifying...' : '✓ Verify & Update Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}
