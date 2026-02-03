import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../utils/api';

const TeamControl: React.FC<any> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    const load = async ()=>{
      setLoading(true);
      try{
        const res = await fetchWithAuth('/api/users');
        if (!res.ok) throw new Error('Failed');
        const js = await res.json();
        setUsers(js.data || []);
      }catch(err){ console.error(err); }
      finally{ setLoading(false); }
    };
    load();
  },[]);

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Team Control</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? <div>Loading...</div> : users.map((u,i)=> (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center font-black text-lg">{(u.name||u.email||'U').slice(0,2).toUpperCase()}</div>
            <div className="mt-3 font-black">{u.name || u.email}</div>
            <div className="text-xs text-gray-400">{u.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamControl;
