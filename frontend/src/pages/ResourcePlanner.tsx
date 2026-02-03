import React, { useState, useEffect } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { fetchWithAuth } from '../utils/api';

const ResourcePlanner: React.FC<any> = ({ currentUser }) => {
  const [filterOptions, setFilterOptions] = useState<any>({
    products: [],
    projectNames: [],
    natureOfWork: [],
    tasks: [],
    podNames: [],
  });
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [podName, setPodName] = useState('');
  const [product, setProduct] = useState('');
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState('');
  const [nature, setNature] = useState('');
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Fetch filter options on mount
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await fetchWithAuth('/api/daily_activity/filters');
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            products: data.products || [],
            projectNames: data.projectNames || [],
            natureOfWork: data.natureOfWork || [],
            tasks: data.tasks || [],
            podNames: data.podNames || []
          });
        }
      } catch (err) {
        console.error('Failed to load filter options:', err);
      } finally {
        setFiltersLoading(false);
      }
    };
    loadFilters();
  }, []);

  const submitPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const payload = { date, podName, product, projectName, modeOfFunctioning: mode, natureOfWork: nature, task };
      const res = await fetchWithAuth('/api/resource', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to save plan');
      setMsg('✓ Plan committed successfully');
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setPodName('');
      setProduct('');
      setProjectName('');
      setMode('');
      setNature('');
      setTask('');
    } catch (err: any) {
      setMsg(`✗ ${err?.message || 'Error submitting plan'}`);
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
          <SearchableSelect label="POD Name" placeholder="Select POD" value={podName} onChange={(v)=>setPodName(v)} options={filterOptions.podNames} />
          <SearchableSelect label="Mode of Functioning" placeholder="Select mode" value={mode} onChange={(v)=>setMode(v)} options={['WFO', 'WFH']} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <SearchableSelect label="Product" placeholder="Select product" value={product} onChange={(v)=>setProduct(v)} options={filterOptions.products} />
          <SearchableSelect label="Project Name" placeholder="Select project" value={projectName} onChange={(v)=>setProjectName(v)} options={filterOptions.projectNames} />
        </div>

        <div className="mt-4">
          <SearchableSelect label="Nature of Work" placeholder="Nature of work" value={nature} onChange={(v)=>setNature(v)} options={filterOptions.natureOfWork} />
        </div>

        <div className="mt-4">
          <SearchableSelect label="Task" placeholder="Select task" value={task} onChange={(v)=>setTask(v)} options={filterOptions.tasks} />
        </div>

        {msg && <div className="mt-4 text-sm text-gray-700">{msg}</div>}
        <button disabled={loading} className="mt-6 w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black">{loading? 'Committing...':'COMMIT PLAN'}</button>
      </form>
    </div>
  );
};

export default ResourcePlanner;
