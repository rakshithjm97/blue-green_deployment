import React, { useState, useEffect } from 'react';
import { PerfRecord } from '../types';
import { fetchWithAuth } from '../utils/api';

const OldData: React.FC<any> = ({ currentUser, onEdit }) => {
  const [data, setData] = useState<PerfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchOldData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter) params.append('product', filter);
        
        const res = await fetchWithAuth(`/api/daily_activity?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch');
        
        const result = await res.json();
        setData(result.data || []);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) fetchOldData();
  }, [filter, currentUser]);

  const filteredData = data.filter(item =>
    !filter || item.product?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Historical Data</h2>
      
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by product..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500 uppercase font-black border-b">
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Email</th>
                <th className="px-6 py-4 text-left">Product</th>
                <th className="px-6 py-4 text-left">Project</th>
                <th className="px-6 py-4 text-left">POD</th>
                <th className="px-6 py-4 text-right">Hours</th>
                {currentUser?.role === 'Admin' && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={currentUser?.role === 'Admin' ? 7 : 6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={currentUser?.role === 'Admin' ? 7 : 6} className="px-6 py-8 text-center text-gray-400">No historical data found</td></tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-600">{item.submittedAt?.split('T')[0] || '-'}</td>
                    <td className="px-6 py-4">{item.email || '-'}</td>
                    <td className="px-6 py-4">{item.product || '-'}</td>
                    <td className="px-6 py-4">{item.projectName || '-'}</td>
                    <td className="px-6 py-4 text-sm">{item.podName || '-'}</td>
                    <td className="px-6 py-4 text-right font-semibold">{item.dedicatedHours || 0}h</td>
                    {currentUser?.role === 'Admin' && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => onEdit(item)}
                          className="px-3 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-black hover:bg-amber-200"
                        >
                          Edit
                        </button>
                      </td>
                    )}
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

export default OldData;