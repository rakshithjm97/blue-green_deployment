import React, { useState, useEffect } from 'react';
import { PerfRecord } from '../types';
import { fetchWithAuth } from '../utils/api';

const Performance: React.FC<any> = ({ currentUser }) => {
  const [data, setData] = useState<PerfRecord[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({
    totalHours: 0,
    activitiesCount: 0,
    avgHoursPerDay: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const res = await fetchWithAuth(`/api/performance?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      
      const result = await res.json();
      setData(result.data || []);
      setStats({
        totalHours: result.totalHours || 0,
        activitiesCount: result.count || 0,
        avgHoursPerDay: result.avgHoursPerDay || 0,
      });
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchData();
  }, [startDate, endDate, currentUser]);

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Performance Report</h2>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[11px] font-black text-gray-500">Start Date</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={e=>setStartDate(e.target.value)} 
            className="w-full px-4 py-3 rounded-lg border" 
          />
        </div>
        <div>
          <label className="text-[11px] font-black text-gray-500">End Date</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={e=>setEndDate(e.target.value)} 
            className="w-full px-4 py-3 rounded-lg border" 
          />
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-[11px] font-black text-purple-600">Total Hours</div>
          <div className="text-2xl font-black text-purple-900">{stats.totalHours.toFixed(1)}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-[11px] font-black text-blue-600">Activities</div>
          <div className="text-2xl font-black text-blue-900">{stats.activitiesCount}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-xl font-black">Activity Breakdown</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500 uppercase font-black">
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">Project</th>
                <th className="px-6 py-4 text-left">Task</th>
                <th className="px-6 py-4 text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No activities found</td></tr>
              ) : (
                data.map((record, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">{record.submittedAt?.split('T')[0] || '-'}</td>
                    <td className="px-6 py-4">{record.product || '-'}</td>
                    <td className="px-6 py-4">{record.projectName || '-'}</td>
                    <td className="px-6 py-4">{record.task || '-'}</td>
                    <td className="px-6 py-4 text-right font-semibold">{record.dedicatedHours || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Performance;