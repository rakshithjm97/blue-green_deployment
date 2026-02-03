import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';

const TeamControl: React.FC<any> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'User',
    pod: ''
  });

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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.name) {
      setAddError('All fields are required');
      return;
    }
    if (newUser.password.length < 8) {
      setAddError('Password must be at least 8 characters');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      // Backend may store pod under `pod_name` column; send both for compatibility.
      const payload = { ...newUser, pod_name: newUser.pod };
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to create user');
      }
      
      // Reload users list
      const listRes = await fetchWithAuth('/api/users');
      if (listRes.ok) {
        const js = await listRes.json();
        setUsers(js.data || []);
      }
      
      // Reset form and close modal (ensure `pod` remains present to match state shape)
      setNewUser({ email: '', password: '', name: '', role: 'User', pod: '' });
      setShowAddModal(false);
    } catch (err: any) {
      setAddError(err.message || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black">Team Control</h2>
        {(currentUser?.role === 'Admin' || currentUser?.role === 'Internal Admin') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition"
          >
            <Plus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? <div>Loading...</div> : users.map((u,i)=> (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center font-black text-lg">{(u.name||u.email||'U').slice(0,2).toUpperCase()}</div>
            <div className="mt-3 font-black">{u.name || u.email}</div>
            <div className="text-xs text-gray-400">{u.role} { (u.pod || (u.pod_name as any)) ? `• ${u.pod || (u.pod_name as any)}` : ''}</div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Add New User</h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  placeholder="Min 8 characters"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                >
                  <option value="User">User</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Internal Admin">Internal Admin</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">POD</label>
                <input
                  type="text"
                  value={newUser.pod}
                  onChange={(e) => setNewUser({...newUser, pod: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300"
                  placeholder="e.g. POD-1 (Aryabhata)"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-400 transition"
                >
                  {addLoading ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-bold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamControl;
