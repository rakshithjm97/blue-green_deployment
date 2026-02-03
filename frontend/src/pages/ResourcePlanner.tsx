import React, { useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { fetchWithAuth } from '../utils/api';

const ResourcePlanner: React.FC<any> = ({ currentUser }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [podName, setPodName] = useState('');
  const [product, setProduct] = useState('');
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState('');
  const [nature, setNature] = useState('');
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const submitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const payload = { date, podName, product, projectName, modeOfFunctioning: mode, natureOfWork: nature, task };
      const res = await fetchWithAuth('/api/resource-planning', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed');
      setMsg('Plan committed');
    } catch (err: any) {
      setMsg(err?.message || 'Error');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Daily Plan</h2>
      <form onSubmit={submitPlan} className="bg-white rounded-2xl p-8 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-black text-gray-500">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-4 py-3 rounded-lg border" />
          </div>
          <SearchableSelect label="POD Name" placeholder="Select POD" value={podName} onChange={(v)=>setPodName(v)} options={['POD-1 (Aryabhata)','POD-2 (Crawlers)','POD-3 (Marte)','POD-4 (Gaganyaan)']} />
          <div>
            <label className="text-[11px] font-black text-gray-500">Mode of Functioning</label>
            <select value={mode} onChange={e=>setMode(e.target.value)} className="w-full px-4 py-3 rounded-lg border">
              <option value="">Select mode</option>
              <option>WFO</option>
              <option>WFH</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <SearchableSelect label="Product" placeholder="Select product" value={product} onChange={(v)=>setProduct(v)} options={["aims","ivms","imagery","IEMS","ISMS","RSMS"]} />
          <input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="Project Name" className="w-full px-4 py-3 rounded-lg border" />
        </div>

        <div className="mt-4">
          <SearchableSelect label="Nature of Work" placeholder="Nature of work" value={nature} onChange={(v)=>setNature(v)} options={["Span Validation","Span Correction","QC","Training","Others"]} />
        </div>

        <div className="mt-4">
          <input value={task} onChange={e=>setTask(e.target.value)} placeholder="Task" className="w-full px-4 py-3 rounded-lg border" />
        </div>

        {msg && <div className="mt-4 text-sm text-gray-700">{msg}</div>}
        <button disabled={loading} className="mt-6 w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black">{loading? 'Committing...':'COMMIT PLAN'}</button>
      </form>
    </div>
  );
};

export default ResourcePlanner;
