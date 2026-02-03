import React, { useState, useEffect } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { fetchWithAuth } from '../utils/api';
import { X } from 'lucide-react';

const Tracker: React.FC<any> = ({ currentUser }) => {
  const [filterOptions, setFilterOptions] = useState<any>({
    products: [],
    projectNames: [],
    natureOfWork: [],
    tasks: [],
    podNames: [],
  });
  const [filtersLoading, setFiltersLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [modeOfFunctioning, setModeOfFunctioning] = useState('');
  const [podName, setPodName] = useState('');
  const [product, setProduct] = useState('');
  
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  const createEmptyProject = () => ({
    id: Math.random(),
    projectName: '',
    task: '',
    natureOfWork: '',
    dedicatedHours: '',
    remarks: '',
    conductorLines: '',
    numberOfPoints: '',
    benchmarkForTask: '',
    lineMiles: '',
    lineMilesH1V1: '',
    dedicatedHoursH1V1: '',
    lineMilesH1V0: '',
    dedicatedHoursH1V0: '',
    siteName: '',
    areaHectares: '',
    polygonFeatureCount: '',
    polylineFeatureCount: '',
    pointFeatureCount: '',
    spentHoursOnAboveTask: '',
    density: '',
    timeField: '',
    trackerUpdating: false,
    dataQualityChecking: false,
    trainingFeedback: false,
    trnRemarks: '',
    documentation: false,
    docRemark: '',
    othersMisc: '',
  });

  const addProject = () => {
    setProjects([...projects, createEmptyProject()]);
  };

  const removeProject = (id: number) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const updateProject = (id: number, field: string, value: any) => {
    setProjects(projects.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) {
      setMessage('✗ Please select a product');
      return;
    }
    
    if (projects.length === 0) {
      setMessage('✗ Please add at least one project');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const payload = {
        date,
        modeOfFunctioning,
        podName,
        product,
        projects: projects.map(p => ({
          projectName: p.projectName,
          task: p.task,
          natureOfWork: p.natureOfWork,
          dedicatedHours: parseFloat(p.dedicatedHours) || 0,
          remarks: p.remarks || null,
          conductorLines: p.conductorLines ? parseFloat(p.conductorLines) : null,
          numberOfPoints: p.numberOfPoints ? parseFloat(p.numberOfPoints) : null,
          benchmarkForTask: p.benchmarkForTask || null,
          lineMiles: p.lineMiles ? parseFloat(p.lineMiles) : null,
          lineMilesH1V1: p.lineMilesH1V1 ? parseFloat(p.lineMilesH1V1) : null,
          dedicatedHoursH1V1: p.dedicatedHoursH1V1 ? parseFloat(p.dedicatedHoursH1V1) : null,
          lineMilesH1V0: p.lineMilesH1V0 ? parseFloat(p.lineMilesH1V0) : null,
          dedicatedHoursH1V0: p.dedicatedHoursH1V0 ? parseFloat(p.dedicatedHoursH1V0) : null,
          siteName: p.siteName || null,
          areaHectares: p.areaHectares ? parseFloat(p.areaHectares) : null,
          polygonFeatureCount: p.polygonFeatureCount ? parseFloat(p.polygonFeatureCount) : null,
          polylineFeatureCount: p.polylineFeatureCount ? parseFloat(p.polylineFeatureCount) : null,
          pointFeatureCount: p.pointFeatureCount ? parseFloat(p.pointFeatureCount) : null,
          spentHoursOnAboveTask: p.spentHoursOnAboveTask ? parseFloat(p.spentHoursOnAboveTask) : null,
          density: p.density ? parseFloat(p.density) : null,
          timeField: p.timeField ? parseFloat(p.timeField) : null,
          trackerUpdating: p.trackerUpdating || false,
          dataQualityChecking: p.dataQualityChecking || false,
          trainingFeedback: p.trainingFeedback || false,
          trnRemarks: p.trnRemarks || null,
          documentation: p.documentation || false,
          docRemark: p.docRemark || null,
          othersMisc: p.othersMisc || null,
        }))
      };

      const res = await fetchWithAuth('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }
      
      const result = await res.json();
      setMessage(`✓ Activity logged successfully! (${result.count} projects saved)`);
      setDate(new Date().toISOString().split('T')[0]);
      setModeOfFunctioning('');
      setPodName('');
      setProduct('');
      setProjects([]);
    } catch (err: any) {
      console.error('Submit error:', err);
      setMessage(`✗ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalHours = projects.reduce((sum, p) => sum + (parseFloat(p.dedicatedHours) || 0), 0);

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Daily Tracker</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border">
          {/* Top-level selectors */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-black text-gray-500 block mb-2">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-lg border" />
            </div>
            <SearchableSelect label="Mode" placeholder="Select" value={modeOfFunctioning} onChange={setModeOfFunctioning} options={['WFO', 'WFH']} />
            <SearchableSelect label="POD" placeholder="Select" value={podName} onChange={setPodName} options={filterOptions.podNames} />
            <SearchableSelect label="Product" placeholder="Select" value={product} onChange={(p) => {
              setProduct(p);
              if (projects.length > 0 && projects[0].product !== p) {
                setProjects([createEmptyProject()]);
              }
            }} options={filterOptions.products} />
          </div>

          {/* Project Management Section - Show only after product selection */}
          {product && (
            <>
              {/* Projects List */}
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm mb-4">No projects added yet</p>
                  <button
                    type="button"
                    onClick={addProject}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100"
                  >
                    + Add Project
                  </button>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {projects.map((proj) => (
                    <div key={proj.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeProject(proj.id)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                      >
                        <X size={18} />
                      </button>

                      {/* Basic Project Fields */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <SearchableSelect
                          label="Project Name"
                          placeholder="Select"
                          value={proj.projectName}
                          onChange={(v) => updateProject(proj.id, 'projectName', v)}
                          options={filterOptions.projectNames}
                        />
                        <SearchableSelect
                          label="Task"
                          placeholder="Select"
                          value={proj.task}
                          onChange={(v) => updateProject(proj.id, 'task', v)}
                          options={filterOptions.tasks}
                        />
                        <SearchableSelect
                          label="Nature"
                          placeholder="Select"
                          value={proj.natureOfWork}
                          onChange={(v) => updateProject(proj.id, 'natureOfWork', v)}
                          options={filterOptions.natureOfWork}
                        />
                        <div>
                          <label className="text-xs font-black text-gray-500 block mb-2">Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="0"
                            value={proj.dedicatedHours}
                            onChange={(e) => updateProject(proj.id, 'dedicatedHours', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm"
                          />
                        </div>
                      </div>

                      <textarea
                        placeholder="Remarks"
                        value={proj.remarks}
                        onChange={(e) => updateProject(proj.id, 'remarks', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-sm h-16 mb-4"
                      />

                      {/* Product-Specific Fields */}
                      {product === 'aims' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <label className="text-xs font-black text-gray-500">Conductor Lines</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.conductorLines || ''}
                            onChange={(e) => updateProject(proj.id, 'conductorLines', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Number of Points</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.numberOfPoints || ''}
                            onChange={(e) => updateProject(proj.id, 'numberOfPoints', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                        </div>
                      )}

                      {product === 'ivms' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-green-50 rounded-lg border border-green-100">
                          <label className="text-xs font-black text-gray-500 col-span-2">Benchmark</label>
                          <input
                            placeholder="Benchmark for task"
                            value={proj.benchmarkForTask || ''}
                            onChange={(e) => updateProject(proj.id, 'benchmarkForTask', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm col-span-2"
                          />
                          <label className="text-xs font-black text-gray-500">Line Miles (All)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.lineMiles || ''}
                            onChange={(e) => updateProject(proj.id, 'lineMiles', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Line Miles (H1V1)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.lineMilesH1V1 || ''}
                            onChange={(e) => updateProject(proj.id, 'lineMilesH1V1', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Hours (H1V1)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.dedicatedHoursH1V1 || ''}
                            onChange={(e) => updateProject(proj.id, 'dedicatedHoursH1V1', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Line Miles (H1V0)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.lineMilesH1V0 || ''}
                            onChange={(e) => updateProject(proj.id, 'lineMilesH1V0', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Hours (H1V0)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.dedicatedHoursH1V0 || ''}
                            onChange={(e) => updateProject(proj.id, 'dedicatedHoursH1V0', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                        </div>
                      )}

                      {product === 'ISMS' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <label className="text-xs font-black text-gray-500 col-span-2">Site Name</label>
                          <input
                            placeholder="Site Name"
                            value={proj.siteName || ''}
                            onChange={(e) => updateProject(proj.id, 'siteName', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm col-span-2"
                          />
                          <label className="text-xs font-black text-gray-500">Area (hectares)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.areaHectares || ''}
                            onChange={(e) => updateProject(proj.id, 'areaHectares', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Polygon Count</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.polygonFeatureCount || ''}
                            onChange={(e) => updateProject(proj.id, 'polygonFeatureCount', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Polyline Count</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.polylineFeatureCount || ''}
                            onChange={(e) => updateProject(proj.id, 'polylineFeatureCount', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Point Count</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.pointFeatureCount || ''}
                            onChange={(e) => updateProject(proj.id, 'pointFeatureCount', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Spent Hours</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.spentHoursOnAboveTask || ''}
                            onChange={(e) => updateProject(proj.id, 'spentHoursOnAboveTask', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                          <label className="text-xs font-black text-gray-500">Density</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.density || ''}
                            onChange={(e) => updateProject(proj.id, 'density', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm"
                          />
                        </div>
                      )}

                      {product === 'RSMS' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-rose-50 rounded-lg border border-rose-100">
                          <label className="text-xs font-black text-gray-500 col-span-2">Time Field</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={proj.timeField || ''}
                            onChange={(e) => updateProject(proj.id, 'timeField', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm col-span-2"
                          />
                        </div>
                      )}

                      {product === 'IEMS' && (
                        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                          <div className="col-span-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={proj.trackerUpdating || false}
                              onChange={(e) => updateProject(proj.id, 'trackerUpdating', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label className="text-xs font-black text-gray-500">Tracker Updating</label>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={proj.dataQualityChecking || false}
                              onChange={(e) => updateProject(proj.id, 'dataQualityChecking', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label className="text-xs font-black text-gray-500">Data Quality Checking</label>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={proj.trainingFeedback || false}
                              onChange={(e) => updateProject(proj.id, 'trainingFeedback', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label className="text-xs font-black text-gray-500">Training / Feedback</label>
                          </div>
                          <label className="text-xs font-black text-gray-500 col-span-2">Training Remarks</label>
                          <textarea
                            placeholder="Training remarks"
                            value={proj.trnRemarks || ''}
                            onChange={(e) => updateProject(proj.id, 'trnRemarks', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12"
                          />
                          <div className="col-span-2 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={proj.documentation || false}
                              onChange={(e) => updateProject(proj.id, 'documentation', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label className="text-xs font-black text-gray-500">Documentation</label>
                          </div>
                          <label className="text-xs font-black text-gray-500 col-span-2">Doc Remark</label>
                          <textarea
                            placeholder="Documentation remark"
                            value={proj.docRemark || ''}
                            onChange={(e) => updateProject(proj.id, 'docRemark', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12"
                          />
                          <label className="text-xs font-black text-gray-500 col-span-2">Others/Misc</label>
                          <textarea
                            placeholder="Other miscellaneous"
                            value={proj.othersMisc || ''}
                            onChange={(e) => updateProject(proj.id, 'othersMisc', e.target.value)}
                            className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Project Button */}
              {projects.length > 0 && (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={addProject}
                    className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 border border-blue-200"
                  >
                    + Add Project
                  </button>
                </div>
              )}
            </>
          )}

          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${
              message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading || !product || projects.length === 0}
              className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Log Activity'}
            </button>
          </div>

        </form>

        <aside className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="text-xs text-gray-500">TODAY'S HOURS</div>
          <div className="text-2xl font-black mt-2">{totalHours}h</div>

          <div className="mt-6 text-xs text-gray-500">WEEKLY TARGET</div>
          <div className="mt-2 bg-gray-50 p-4 rounded-lg">
            <div className="text-lg font-black">{totalHours}h</div>
            <div className="text-xs text-gray-400">of 40h</div>
            <div className="text-sm text-orange-500 mt-2">{Math.max(0, 40 - totalHours)}h left</div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default Tracker;
