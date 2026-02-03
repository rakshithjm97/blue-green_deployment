import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';

const TeamReport: React.FC<any> = ({ currentUser }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    const load = async ()=>{
      setLoading(true);
      try{
        const res = await fetchWithAuth('/api/team-report');
        if (!res.ok) throw new Error('Failed');
        const js = await res.json();
        setData(js.data || []);
      }catch(err){
        console.error(err);
      }finally{ setLoading(false); }
    };
    load();
  },[]);

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">POD Resource Report</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? <div>Loading...</div> : data.length === 0 ? <div className="text-gray-500">No data</div> : data.map((d, i)=> (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-black">{d.name || d.pod || 'POD'}</div>
                <div className="text-xs text-gray-500">{d.email}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Weekly Hours</div>
                <div className="text-xl font-black">{d.totalHours || 0}h</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamReport;
