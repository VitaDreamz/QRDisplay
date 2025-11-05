'use client';

import { useState } from 'react';

export default function AdminMigrationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [secret, setSecret] = useState('');

  const runMigration = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/admin/update-product-images?secret=${secret}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to run migration', details: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Admin Migration Tool</h1>
          <p className="text-gray-600 mb-6">Update all product images to use /images/products/ folder</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Secret
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter admin secret"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={runMigration}
              disabled={loading || !secret}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Running Migration...' : 'Update Product Images'}
            </button>
          </div>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h2 className={`font-semibold mb-2 ${result.error ? 'text-red-800' : 'text-green-800'}`}>
                {result.error ? 'Error' : 'Success!'}
              </h2>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">⚠️ Important Notes:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>This is a one-time migration</li>
              <li>Run this after deployment completes</li>
              <li>Updates all VitaDreamz product image paths</li>
              <li>Safe to run multiple times (idempotent)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
