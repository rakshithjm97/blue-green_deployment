import React, { useState } from 'react';
import SearchableSelect from '../components/SearchableSelect';
import { fetchWithAuth } from '../utils/api';

const Tracker: React.FC<any> = ({ currentUser }) => {
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    product: '',
    projectName: '',
    podName: '',
    modeOfFunctioning: '',
    natureOfWork: '',
    task: '',
    dedicatedHours: '',
    remarks: '',
    // AIMS fields
    conductorLines: '',
    numberOfPoints: '',
    // IVMS fields
    benchmarkForTask: '',
    lineMiles: '',
    lineMilesH1V1: '',
    dedicatedHoursH1V1: '',
    lineMilesH1V0: '',
    dedicatedHoursH1V0: '',
    // ISMS fields
    siteName: '',
    areaHectares: '',
    polygonFeatureCount: '',
    polylineFeatureCount: '',
    pointFeatureCount: '',
    spentHoursOnAboveTask: '',
    density: '',
    // RSMS fields
    timeField: '',
    // IEMS fields
    trackerUpdating: false,
    dataQualityChecking: false,
    trainingFeedback: false,
    trnRemarks: '',
    documentation: false,
    docRemark: '',
    othersMisc: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = {
        date: formData.date,
        modeOfFunctioning: formData.modeOfFunctioning,
        podName: formData.podName,
        product: formData.product,
        projects: [{
          projectName: formData.projectName,
          task: formData.task,
          natureOfWork: formData.natureOfWork,
          dedicatedHours: parseFloat(formData.dedicatedHours) || 0,
          remarks: formData.remarks,
          // AIMS
          conductorLines: formData.conductorLines ? parseFloat(formData.conductorLines) : undefined,
          numberOfPoints: formData.numberOfPoints ? parseFloat(formData.numberOfPoints) : undefined,
          // IVMS
          benchmarkForTask: formData.benchmarkForTask,
          lineMiles: formData.lineMiles ? parseFloat(formData.lineMiles) : undefined,
          lineMilesH1V1: formData.lineMilesH1V1 ? parseFloat(formData.lineMilesH1V1) : undefined,
          dedicatedHoursH1V1: formData.dedicatedHoursH1V1 ? parseFloat(formData.dedicatedHoursH1V1) : undefined,
          lineMilesH1V0: formData.lineMilesH1V0 ? parseFloat(formData.lineMilesH1V0) : undefined,
          dedicatedHoursH1V0: formData.dedicatedHoursH1V0 ? parseFloat(formData.dedicatedHoursH1V0) : undefined,
          // ISMS
          siteName: formData.siteName,
          areaHectares: formData.areaHectares ? parseFloat(formData.areaHectares) : undefined,
          polygonFeatureCount: formData.polygonFeatureCount ? parseFloat(formData.polygonFeatureCount) : undefined,
          polylineFeatureCount: formData.polylineFeatureCount ? parseFloat(formData.polylineFeatureCount) : undefined,
          pointFeatureCount: formData.pointFeatureCount ? parseFloat(formData.pointFeatureCount) : undefined,
          spentHoursOnAboveTask: formData.spentHoursOnAboveTask ? parseFloat(formData.spentHoursOnAboveTask) : undefined,
          density: formData.density ? parseFloat(formData.density) : undefined,
          // RSMS
          timeField: formData.timeField ? parseFloat(formData.timeField) : undefined,
          // IEMS
          trackerUpdating: formData.trackerUpdating,
          dataQualityChecking: formData.dataQualityChecking,
          trainingFeedback: formData.trainingFeedback,
          trnRemarks: formData.trnRemarks,
          documentation: formData.documentation,
          docRemark: formData.docRemark,
          othersMisc: formData.othersMisc,
        }]
      };

      const res = await fetchWithAuth('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to submit');
      
      setMessage('✓ Activity logged successfully!');
      setFormData({
        date: new Date().toISOString().split('T')[0],
        product: '',
        projectName: '',
        podName: '',
        modeOfFunctioning: '',
        natureOfWork: '',
        task: '',
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
    } catch (err: any) {
      setMessage(`✗ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Daily Tracker</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border">
          {/* Date + Basic Selects */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-xs font-black text-gray-500 block mb-2">Date</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-4 py-3 rounded-lg border" />
            </div>
            <SearchableSelect label="Mode" placeholder="Select" value={formData.modeOfFunctioning} onChange={(v: string) => handleSelectChange('modeOfFunctioning', v)} options={['WFO', 'WFH']} />
            <SearchableSelect label="POD" placeholder="Select" value={formData.podName} onChange={(v: string) => handleSelectChange('podName', v)} options={['POD-1 (Aryabhata)', 'POD-2 (Crawlers)', 'POD-3 (Marte)', 'POD-4 (Gaganyaan)', 'POD-5 (Swift)', 'POD-6 (Imagery)']} />
            <SearchableSelect label="Product" placeholder="Select" value={formData.product} onChange={(v: string) => handleSelectChange('product', v)} options={['aims', 'ivms', 'imagery', 'IEMS', 'ISMS', 'RSMS']} />
          </div>

          {/* Basic Project Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <input placeholder="Project Name" name="projectName" value={formData.projectName} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
            <input placeholder="Task" name="task" value={formData.task} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
            <SearchableSelect label="Nature" value={formData.natureOfWork} onChange={(v: string) => handleSelectChange('natureOfWork', v)} options={['Span Validation', 'Span Correction', 'QC', 'Training', 'Others']} />
            <input placeholder="Dedicated Hours" type="number" step="0.5" name="dedicatedHours" value={formData.dedicatedHours} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
          </div>

          <textarea placeholder="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border text-sm h-16 mb-6" />

          {/* AIMS-Specific Fields */}
          {formData.product === 'aims' && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="text-xs font-black text-gray-500">AIMS: Conductor Lines</label>
              <input type="number" step="0.1" placeholder="Conductor Lines" name="conductorLines" value={formData.conductorLines} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-1" />
              <label className="text-xs font-black text-gray-500">AIMS: Number of Points</label>
              <input type="number" step="0.1" placeholder="Number of Points" name="numberOfPoints" value={formData.numberOfPoints} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-1" />
            </div>
          )}

          {/* IVMS-Specific Fields */}
          {formData.product === 'ivms' && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-green-50 rounded-lg border border-green-100">
              <label className="text-xs font-black text-gray-500">IVMS: Benchmark</label>
              <input placeholder="Benchmark for task" name="benchmarkForTask" value={formData.benchmarkForTask} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-2" />
              <label className="text-xs font-black text-gray-500">Line Miles (All)</label>
              <input type="number" step="0.1" placeholder="Line Miles" name="lineMiles" value={formData.lineMiles} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Line Miles (H1V1)</label>
              <input type="number" step="0.1" placeholder="Line Miles H1V1" name="lineMilesH1V1" value={formData.lineMilesH1V1} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Hours (H1V1)</label>
              <input type="number" step="0.1" placeholder="Hours H1V1" name="dedicatedHoursH1V1" value={formData.dedicatedHoursH1V1} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Line Miles (H1V0)</label>
              <input type="number" step="0.1" placeholder="Line Miles H1V0" name="lineMilesH1V0" value={formData.lineMilesH1V0} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Hours (H1V0)</label>
              <input type="number" step="0.1" placeholder="Hours H1V0" name="dedicatedHoursH1V0" value={formData.dedicatedHoursH1V0} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
            </div>
          )}

          {/* ISMS-Specific Fields */}
          {formData.product === 'ISMS' && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <label className="text-xs font-black text-gray-500">ISMS: Site Name</label>
              <input placeholder="Site Name" name="siteName" value={formData.siteName} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-2" />
              <label className="text-xs font-black text-gray-500">Area (hectares)</label>
              <input type="number" step="0.1" placeholder="Area Hectares" name="areaHectares" value={formData.areaHectares} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Polygon Count</label>
              <input type="number" step="0.1" placeholder="Polygon Features" name="polygonFeatureCount" value={formData.polygonFeatureCount} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Polyline Count</label>
              <input type="number" step="0.1" placeholder="Polyline Features" name="polylineFeatureCount" value={formData.polylineFeatureCount} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Point Count</label>
              <input type="number" step="0.1" placeholder="Point Features" name="pointFeatureCount" value={formData.pointFeatureCount} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Spent Hours</label>
              <input type="number" step="0.1" placeholder="Spent Hours" name="spentHoursOnAboveTask" value={formData.spentHoursOnAboveTask} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
              <label className="text-xs font-black text-gray-500">Density</label>
              <input type="number" step="0.1" placeholder="Density" name="density" value={formData.density} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm" />
            </div>
          )}

          {/* RSMS-Specific Fields */}
          {formData.product === 'RSMS' && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-rose-50 rounded-lg border border-rose-100">
              <label className="text-xs font-black text-gray-500">RSMS: Time Field</label>
              <input type="number" step="0.1" placeholder="Time Field" name="timeField" value={formData.timeField} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-2" />
            </div>
          )}

          {/* IEMS-Specific Fields */}
          {formData.product === 'IEMS' && (
            <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="trackerUpdating" checked={formData.trackerUpdating} onChange={handleChange} className="w-4 h-4" />
                <label className="text-xs font-black text-gray-500">Tracker Updating</label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="dataQualityChecking" checked={formData.dataQualityChecking} onChange={handleChange} className="w-4 h-4" />
                <label className="text-xs font-black text-gray-500">Data Quality Checking</label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="trainingFeedback" checked={formData.trainingFeedback} onChange={handleChange} className="w-4 h-4" />
                <label className="text-xs font-black text-gray-500">Training / Feedback</label>
              </div>
              <label className="text-xs font-black text-gray-500">Training Remarks</label>
              <textarea placeholder="Training remarks" name="trnRemarks" value={formData.trnRemarks} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12" />
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" name="documentation" checked={formData.documentation} onChange={handleChange} className="w-4 h-4" />
                <label className="text-xs font-black text-gray-500">Documentation</label>
              </div>
              <label className="text-xs font-black text-gray-500">Doc Remark</label>
              <textarea placeholder="Documentation remark" name="docRemark" value={formData.docRemark} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12" />
              <label className="text-xs font-black text-gray-500">Others/Misc</label>
              <textarea placeholder="Other miscellaneous" name="othersMisc" value={formData.othersMisc} onChange={handleChange} className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12" />
            </div>
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
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Log Activity'}
            </button>
          </div>

        </form>

        <aside className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="text-xs text-gray-500">TODAY'S HOURS</div>
          <div className="text-2xl font-black mt-2">{parseFloat(formData.dedicatedHours) || 0}h</div>

          <div className="mt-6 text-xs text-gray-500">WEEKLY TARGET</div>
          <div className="mt-2 bg-gray-50 p-4 rounded-lg">
            <div className="text-lg font-black">{parseFloat(formData.dedicatedHours) || 0}h</div>
            <div className="text-xs text-gray-400">of 40h</div>
            <div className="text-sm text-orange-500 mt-2">{Math.max(0, 40 - (parseFloat(formData.dedicatedHours) || 0))}h left</div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default Tracker;
          <SearchableSelect
            label="Mode of Functioning"
            placeholder="Select Mode"
            value={formData.modeOfFunctioning}
            onChange={(v) => handleSelectChange('modeOfFunctioning', v)}
            options={['WFO', 'WFH']}
          />
          <SearchableSelect
            label="Nature of Work"
            placeholder="Select Nature"
            value={formData.natureOfWork}
            onChange={(v) => handleSelectChange('natureOfWork', v)}
            options={['Span Validation', 'Span Correction', 'Quality Check', 'Training', 'Others']}
          />
          <SearchableSelect
            label="Task"
            placeholder="Select Task"
            value={formData.task}
            onChange={(v) => handleSelectChange('task', v)}
            options={['Production', 'Quality Check (QC)', 'Training', 'Meeting', 'Others']}
          />
          <div>
            <label className="text-[11px] font-black text-gray-500">Dedicated Hours</label>
            <input
              type="number"
              name="dedicatedHours"
              step="0.5"
              min="0"
              value={formData.dedicatedHours}
              onChange={handleChange}
              placeholder="8.5"
              className="w-full px-4 py-3 rounded-lg border"
            />
          </div>
          </div>

          <div className="mt-6">
            <label className="text-[11px] font-black text-gray-500">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Optional notes about the activity..."
              className="w-full px-4 py-3 rounded-lg border h-24"
            />
          </div>

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
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Log Activity'}
            </button>
          </div>

        </form>

        <aside className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="text-xs text-gray-500">TODAY'S HOURS</div>
          <div className="text-2xl font-black mt-2">0.0h</div>

          <div className="mt-6 text-xs text-gray-500">WEEKLY TARGET</div>
          <div className="mt-2 bg-gray-50 p-4 rounded-lg">
            <div className="text-lg font-black">5.0h</div>
            <div className="text-xs text-gray-400">of 40h</div>
            <div className="text-sm text-orange-500 mt-2">35.0h left</div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default Tracker;