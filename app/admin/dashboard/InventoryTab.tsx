'use client';

import { useState } from 'react';

type Display = {
  id: string;
  displayId: string;
  qrPngUrl: string | null;
  targetUrl: string | null;
  status: string;
  assignedOrgId?: string | null;
  createdAt: Date;
  activatedAt?: Date | null;
  store?: {
    id: string;
    storeName: string;
    storeId: string;
  } | null;
};

type Organization = {
  orgId: string;
  name: string;
};

export function InventoryTab({ displays, organizations }: { displays: Display[]; organizations: Organization[] }) {
  const [quantity, setQuantity] = useState(24);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Display | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ status: string; assignedOrgId: string | '' }>({ status: 'inventory', assignedOrgId: '' });
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState<{ type: 'status' | 'organization' | 'reset' | 'delete'; value: string } | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [printHistory, setPrintHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, rows: Display[]) => {
    if (e.target.checked) {
      setSelected(rows.map(d => d.displayId));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (displayId: string) => {
    setSelected(prev =>
      prev.includes(displayId)
        ? prev.filter(id => id !== displayId)
        : [...prev, displayId]
    );
  };

  const createBatch = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/displays/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      if (data.success) {
        // Auto-print labels after creation
        const displayIds = data.displays.map((d: any) => d.displayId);
        await printLabels(displayIds);
        
        // Reload page to show new displays
        window.location.reload();
      }
    } catch (error) {
      console.error('Batch creation failed:', error);
      alert(`Failed to create batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  const printLabels = async (displayIds: string[]) => {
    try {
      const res = await fetch('/api/admin/displays/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayIds })
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-labels-OL2681-${displayIds.length}.pdf`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Label print failed:', error);
      alert('Failed to generate labels');
    }
  };

  const loadPrintHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/labels/history');
      const data = await res.json();
      if (data.success) {
        setPrintHistory(data.history);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      alert('Failed to load print history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const reprintBatch = async (batchDisplayIds: string[]) => {
    await printLabels(batchDisplayIds);
  };

  const displayCount = displays.length;
  const nextDisplayId = `QRD-${String(displayCount + 1).padStart(3, '0')}`;

  const openEdit = (d: Display) => {
    setEditing(d);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/displays/${editing.displayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: form.status,
          assignedOrgId: form.assignedOrgId || null,
        })
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update display');
      }
      // Refresh to reflect updates
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const markSelectedAsSold = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Mark ${selected.length} display(s) as sold to VitaDreamz?`)) return;
    
    setBulkProcessing(true);
    try {
      // Update each display sequentially
      for (const displayId of selected) {
        const res = await fetch(`/api/admin/displays/${displayId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'sold',
            assignedOrgId: 'ORG-VITADREAMZ',
          })
        });
        if (!res.ok) {
          console.error(`Failed to update ${displayId}`);
        }
      }
      alert(`Successfully marked ${selected.length} display(s) as sold!`);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Bulk update failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Filter displays by org
  const filteredDisplays = orgFilter === 'all'
    ? displays
    : displays.filter(d => d.assignedOrgId === orgFilter);

  const selectedDisplays = new Set(selected);
  const selectedRows = filteredDisplays.filter(d => selectedDisplays.has(d.displayId));
  const hasActivatedDisplays = selectedRows.some(d => d.status === 'active');

  const handleBulkUpdate = async () => {
    if (!bulkAction || selected.length === 0) return;
    setBulkUpdating(true);
    try {
      const res = await fetch('/api/admin/displays/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayIds: selected,
          action: bulkAction.type,
          value: bulkAction.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Bulk update failed');
      // Refresh listing
      window.location.reload();
    } catch (err) {
      console.error('Bulk update failed:', err);
      alert('Bulk update failed');
    } finally {
      setBulkUpdating(false);
    }
  };

  return (
    <div>
      {/* Batch Creator */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Create Display Batch</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="24">24 (1 sheet)</option>
              <option value="48">48 (2 sheets)</option>
              <option value="72">72 (3 sheets)</option>
              <option value="120">120 (5 sheets)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">4 columns × 6 rows per sheet</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Starting ID</label>
            <input
              value={nextDisplayId}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
          </div>

          <div className="flex items-end">
            <button
              onClick={createBatch}
              disabled={creating}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {creating ? 'Creating...' : 'Create Batch & Generate Labels'}
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            ✅ Creates displays in database<br />
            ✅ Generates QR codes<br />
            ✅ Downloads PDF ready for OnlineLabels OL2681
          </p>
        </div>

        {/* Printing Tips */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">📋 Printing Tips</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600">
            • Use OnlineLabels.com OL2681 (1.5" × 1.5" square, 4×6 grid)<br />
            • Print at 100% scale (do not "fit to page")<br />
            • Use high-quality laser printer for best results<br />
            • Let ink dry before handling<br />
            • Test one sheet before printing bulk
          </div>
        </details>
      </div>

      {/* Print History */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Label Print History</h2>
          <button
            onClick={loadPrintHistory}
            disabled={loadingHistory}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400 text-sm"
          >
            {loadingHistory ? 'Loading...' : showHistory ? 'Refresh History' : 'View History'}
          </button>
        </div>

        {showHistory && (
          <div className="overflow-x-auto">
            {printHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No print history yet. Create your first batch above!</p>
            ) : (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Labels</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sheets</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display IDs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {printHistory.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{batch.batchId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(batch.printedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {batch.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          {batch.sheets}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        <details className="cursor-pointer">
                          <summary className="hover:text-purple-600">
                            {batch.displayIds[0]} ... {batch.displayIds[batch.displayIds.length - 1]}
                          </summary>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-40 overflow-y-auto">
                            {batch.displayIds.join(', ')}
                          </div>
                        </details>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => reprintBatch(batch.displayIds)}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium underline"
                        >
                          Reprint PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Bulk Actions (selection) */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-blue-900">
              {selected.length} display{selected.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelected([])}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Clear selection
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Delete All Button */}
            <button
              onClick={() => { setBulkAction({ type: 'delete', value: 'delete' }); setShowBulkConfirm(true); }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
            >
              Delete All
            </button>

            {/* Reset All Button */}
            {hasActivatedDisplays && (
              <button
                onClick={() => { setBulkAction({ type: 'reset', value: 'reset' }); setShowBulkConfirm(true); }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm font-medium"
              >
                Reset All
              </button>
            )}

            {/* Print Selected Labels */}
            <button
              onClick={() => printLabels(selected)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
            >
              Print Labels
            </button>
          </div>
        </div>
      )}

      {/* Displays Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Display Inventory ({filteredDisplays.length})</h2>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="all">All Brands</option>
            {organizations.map(org => (
              <option key={org.orgId} value={org.orgId}>{org.name}</option>
            ))}
          </select>
        </div>

        {/* Mobile Cards - Scrollable */}
        <div className="md:hidden divide-y max-h-[600px] overflow-y-auto">
          {filteredDisplays.map((display) => (
            <div key={display.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <input
                  type="checkbox"
                  checked={selected.includes(display.displayId)}
                  onChange={() => handleSelect(display.displayId)}
                  className="mt-1"
                />
                <span className="font-mono font-bold text-base ml-3 flex-1">{display.displayId}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  display.status === 'active' ? 'bg-green-100 text-green-800' :
                  display.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {display.status}
                </span>
              </div>
              {display.qrPngUrl && (
                <div className="flex items-center space-x-3 mt-2">
                  <img src={display.qrPngUrl} className="w-16 h-16" alt="QR" />
                  <div className="text-sm text-gray-600 flex-1">
                    {display.targetUrl || 'No URL'}
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                {new Date(display.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table - Scrollable */}
        <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left bg-gray-50">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e, filteredDisplays)}
                    checked={selected.length > 0 && selected.length === filteredDisplays.length}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">Display ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">QR Preview</th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">URL</th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">Store</th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">Last Action</th>
                <th className="px-4 py-3 text-left text-sm font-semibold bg-gray-50">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDisplays.map((display) => (
                <tr key={display.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(display.displayId)}
                      onChange={() => handleSelect(display.displayId)}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold">{display.displayId}</td>
                  <td className="px-4 py-3">
                    {display.qrPngUrl && (
                      <img src={display.qrPngUrl} className="w-12 h-12" alt="QR" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {display.targetUrl ? (
                      <a 
                        href={display.targetUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-purple-600 hover:text-purple-800 hover:underline"
                      >
                        {display.targetUrl.replace('https://', '')}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      display.status === 'active' ? 'bg-green-100 text-green-800' :
                      display.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                      display.status === 'inventory' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {display.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {display.store?.storeName || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {display.activatedAt 
                      ? new Date(display.activatedAt).toLocaleDateString()
                      : new Date(display.createdAt).toLocaleDateString()
                    }
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(display)}
                      className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Bulk Modal */}
      {showBulkConfirm && bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Confirm Bulk Action</h3>
            <p className="text-gray-700 mb-4">
              {bulkAction.type === 'reset' && (
                <>
                  Reset <strong>{selected.length}</strong> display{selected.length !== 1 ? 's' : ''}?
                  <div className="mt-3 text-sm">
                    This will:
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Clear store associations</li>
                      <li>Set status to "Inventory"</li>
                      <li>Make displays available for reactivation</li>
                    </ul>
                  </div>
                </>
              )}
              {bulkAction.type === 'delete' && (
                <>
                  <strong className="text-red-600">Permanently delete {selected.length} display{selected.length !== 1 ? 's' : ''}?</strong>
                  <div className="mt-3 text-sm">
                    This will:
                    <ul className="list-disc ml-5 mt-2 space-y-1">
                      <li>Remove displays from the database</li>
                      <li>Delete all associated QR codes</li>
                      <li>Clear all store associations</li>
                      <li><strong className="text-red-600">This action cannot be undone</strong></li>
                    </ul>
                  </div>
                </>
              )}
            </p>
            <div className={`border rounded p-3 mb-6 ${
              bulkAction.type === 'delete' ? 'bg-red-50 border-red-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-sm ${
                bulkAction.type === 'delete' ? 'text-red-800' :
                'text-orange-800'
              }`}>
                ⚠️ This will update all selected displays immediately.
                {bulkAction.type === 'reset' && ' Store data will remain for audit purposes.'}
                {bulkAction.type === 'delete' && ' This action is permanent and cannot be undone!'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBulkConfirm(false); setBulkAction(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkUpdating}
                className={`flex-1 px-4 py-2 rounded-md text-white ${
                  bulkAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                } disabled:opacity-60`}
              >
                {bulkUpdating ? 'Working...' : bulkAction.type === 'delete' ? 'Delete Permanently' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">{editing.displayId}</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  editing.status === 'active' ? 'bg-green-100 text-green-800' :
                  editing.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                  editing.status === 'inventory' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {editing.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Store:</span>
                <span className="font-medium">{editing.store?.storeName || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Last Action:</span>
                <span className="font-medium">
                  {editing.activatedAt 
                    ? new Date(editing.activatedAt).toLocaleDateString()
                    : new Date(editing.createdAt).toLocaleDateString()
                  }
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Reset Button - only show if activated */}
              {editing.activatedAt && (
                <button
                  onClick={() => {
                    setBulkAction({ type: 'reset', value: 'reset' });
                    setSelected([editing.displayId]);
                    setShowBulkConfirm(true);
                    setEditing(null);
                  }}
                  className="w-full px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 font-medium"
                >
                  Reset Display
                </button>
              )}

              {/* Delete Button */}
              <button
                onClick={() => {
                  setBulkAction({ type: 'delete', value: 'delete' });
                  setSelected([editing.displayId]);
                  setShowBulkConfirm(true);
                  setEditing(null);
                }}
                className="w-full px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                Delete Display
              </button>

              {/* Close Button */}
              <button
                onClick={() => setEditing(null)}
                className="w-full px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
