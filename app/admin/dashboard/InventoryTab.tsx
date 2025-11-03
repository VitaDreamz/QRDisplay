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
};

type Organization = {
  orgId: string;
  name: string;
};

export function InventoryTab({ displays, organizations }: { displays: Display[]; organizations: Organization[] }) {
  const [quantity, setQuantity] = useState(35);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Display | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ status: string; assignedOrgId: string | '' }>({ status: 'inventory', assignedOrgId: '' });
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(displays.filter(d => d.status === 'inventory').map(d => d.displayId));
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

      if (data.success) {
        // Auto-print labels after creation
        const displayIds = data.displays.map((d: any) => d.displayId);
        await printLabels(displayIds);
        
        // Reload page to show new displays
        window.location.reload();
      }
    } catch (error) {
      console.error('Batch creation failed:', error);
      alert('Failed to create batch');
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
      a.download = `qr-labels-OL854-${displayIds.length}.pdf`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Label print failed:', error);
      alert('Failed to generate labels');
    }
  };

  const displayCount = displays.length;
  const nextDisplayId = `QRD-${String(displayCount + 1).padStart(3, '0')}`;

  const openEdit = (d: Display) => {
    setEditing(d);
    setForm({ status: d.status, assignedOrgId: d.assignedOrgId || '' });
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
              <option value="35">35 (1 sheet)</option>
              <option value="70">70 (2 sheets)</option>
              <option value="105">105 (3 sheets)</option>
              <option value="175">175 (5 sheets)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">5 columns × 7 rows per sheet</p>
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
            ✅ Downloads PDF ready for OnlineLabels OL854
          </p>
        </div>

        {/* Printing Tips */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">📋 Printing Tips</summary>
          <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600">
            • Use OnlineLabels.com OL854 (1.25" × 1.25" square, 5×7 grid)<br />
            • Print at 100% scale (do not "fit to page")<br />
            • Use high-quality laser printer for best results<br />
            • Let ink dry before handling<br />
            • Test one sheet before printing bulk
          </div>
        </details>
      </div>

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

        {/* Mobile Cards */}
        <div className="md:hidden divide-y">
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

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selected.length > 0 && selected.length === displays.filter(d => d.status === 'inventory').length}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Display ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">QR Preview</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">URL</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
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
                      disabled={display.status !== 'inventory'}
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
                      <span className="font-mono text-xs">{display.targetUrl.replace('https://', '')}</span>
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
                    {new Date(display.createdAt).toLocaleDateString()}
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

      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-purple-600 text-white p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="font-medium">
              {selected.length} display{selected.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => printLabels(selected)}
                className="bg-white text-purple-600 px-4 py-2 rounded font-medium hover:bg-gray-100"
              >
                📄 Print Labels
              </button>
              <button
                onClick={markSelectedAsSold}
                disabled={bulkProcessing}
                className="bg-white text-purple-600 px-4 py-2 rounded font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                {bulkProcessing ? '⏳ Processing...' : '✓ Mark as Sold'}
              </button>
              <button
                onClick={() => setSelected([])}
                className="bg-purple-700 px-4 py-2 rounded hover:bg-purple-800"
              >
                Clear
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
            <h3 className="text-lg font-semibold mb-4">Edit {editing.displayId}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="inventory">inventory</option>
                  <option value="sold">sold</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brand (assignedOrgId)</label>
                <select
                  value={form.assignedOrgId}
                  onChange={(e) => setForm({ ...form, assignedOrgId: e.target.value })}
                  className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Unassigned</option>
                  {organizations.map(org => (
                    <option key={org.orgId} value={org.orgId}>{org.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
