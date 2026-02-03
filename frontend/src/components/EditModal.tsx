import React from 'react';
import { X } from 'lucide-react';
import { PerfRecord } from '../types';

export const EditModal: React.FC<any> = ({ open, item, onChange, onClose, onSave, loading, error }) => {
  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={onSave} className="relative z-50 w-full max-w-3xl bg-white rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Edit Record</h3>
          <button type="button" onClick={onClose} className="text-gray-400"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={item.email || ''} onChange={e => onChange({ ...item, email: e.target.value })} placeholder="Email" className="w-full px-4 py-3 rounded-lg border" />
          <input value={item.product || ''} onChange={e => onChange({ ...item, product: e.target.value })} placeholder="Product" className="w-full px-4 py-3 rounded-lg border" />
          <input value={item.projectName || ''} onChange={e => onChange({ ...item, projectName: e.target.value })} placeholder="Project" className="w-full px-4 py-3 rounded-lg border" />
          <input value={item.natureOfWork || ''} onChange={e => onChange({ ...item, natureOfWork: e.target.value })} placeholder="Nature" className="w-full px-4 py-3 rounded-lg border" />
          <input value={item.task || ''} onChange={e => onChange({ ...item, task: e.target.value })} placeholder="Task" className="w-full px-4 py-3 rounded-lg border" />
          <input value={item.dedicatedHours || ''} onChange={e => onChange({ ...item, dedicatedHours: e.target.value })} placeholder="Hours" className="w-full px-4 py-3 rounded-lg border" />
          <input value={item.podName || ''} onChange={e => onChange({ ...item, podName: e.target.value })} placeholder="POD" className="w-full px-4 py-3 rounded-lg border" />
          <input type="date" value={item.submittedAt ? item.submittedAt.split('T')[0] : ''} onChange={e => onChange({ ...item, submittedAt: e.target.value })} className="w-full px-4 py-3 rounded-lg border" />
        </div>

        {error && <div className="mt-3 text-xs text-red-600 p-2 bg-red-50 rounded">{error}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 font-black text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-black text-sm">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
};

export default EditModal;