import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import ViewContainer from './components/ViewContainer';
import Sidebar from './components/Sidebar';
import SearchableSelect from './components/SearchableSelect';
import { fetchWithAuth } from './utils/api';
import Dashboard from './pages/Dashboard';
import Tracker from './pages/Tracker';
import Performance from './pages/Performance';
import OldData from './pages/OldData';
import ResourcePlanner from './pages/ResourcePlanner';
import TeamReport from './pages/TeamReport';
import TeamControl from './pages/TeamControl';

const API_BASE = (() => {
  if (typeof window === 'undefined') return '';
  const { hostname, protocol, port } = window.location;
  
  // Helper: check if hostname is IPv4
  const isIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
  
  // If frontend is on a dev port, backend is usually same host on 5000
  if ((port === '3000' || port === '5173' || port === '4174' || port === '8080' || port === '4200') && isIPv4) {
    return `${protocol}//${hostname}:5000`;
  }
  
  // Localhost detection
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
  if (isLocal) return `${protocol}//${hostname}:5000`;
  
  return '';
})();

// Team Structure & Hierarchy
const TEAM_STRUCTURE = {
  managers: {
    'manager1': { pods: ['POD-1 (Aryabhata)', 'POD-4 (Gaganyaan)'], teamLeads: ['team_lead_1', 'team_lead_2'] },
    'manager2': { pods: ['POD-5 (Swift)', 'POD-2 (Crawlers)'], teamLeads: ['team_lead_3', 'team_lead_4'] },
    'manager3': { pods: ['POD-3 (Marte)', 'POD-6 (Imagery)'], teamLeads: ['team_lead_5', 'team_lead_6'] },
  },
  teamLeads: {
    'team_lead_1': { pod: 'POD-1 (Aryabhata)', manager: 'manager1' },
    'team_lead_2': { pod: 'POD-4 (Gaganyaan)', manager: 'manager1' },
    'team_lead_3': { pod: 'POD-5 (Swift)', manager: 'manager2' },
    'team_lead_4': { pod: 'POD-2 (Crawlers)', manager: 'manager2' },
    'team_lead_5': { pod: 'POD-3 (Marte)', manager: 'manager3' },
    'team_lead_6': { pod: 'POD-6 (Imagery)', manager: 'manager3' },
  }
};

// --- Styles ---
const MODERN_INPUT_CLASSES = "w-full px-5 py-4 rounded-xl border border-gray-200 hover:border-gray-400 focus:border-gray-900 focus:bg-white focus:ring-4 focus:ring-gray-100 outline-none font-bold text-sm bg-white transition-all duration-300 placeholder:text-gray-300";
const MODERN_LABEL_CLASSES = "text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 block transition-colors group-focus-within:text-gray-900";

// Using shared components and `fetchWithAuth` from `./components` and `./utils/api`.

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{email: string, name: string, role: string, id: string} | null>(() => {
    try {
      const s = localStorage.getItem('current_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  
  const [authToken, setAuthToken] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
  const [currentView, setCurrentView] = useState<'home' | 'tracker' | 'performance' | 'resourcePlanner' | 'teamControl' | 'teamReport' | 'oldData'>('home');
  
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ email: 'admin@aidash.com', password: 'password123' });
  
  const [backendStatus, setBackendStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  
  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotErr, setForgotErr] = useState('');
  
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  
  // User creation state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', role: 'User' });
  
  
  
  // Old Data view is delegated to `pages/OldData` which manages its own state/fetching.
  
  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [filterOptions, setFilterOptions] = useState<any>({
    products: [],
    projectNames: [],
    tasks: [],
    natureOfWork: [],
    podNames: []
  });
  
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetchWithAuth('/api/daily_activity/filters');
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            products: data.products || [],
            projectNames: data.projectNames || [],
            tasks: data.tasks || [],
            natureOfWork: data.natureOfWork || [],
            podNames: data.podNames || []
          });
        }
      } catch (err) {
        console.error('Error fetching filters:', err);
      }
    };
    fetchFilters();
  }, []);
  
  const openEditModal = (it: any) => { setEditingItem({ ...it }); setEditError(''); setEditModalOpen(true); };
  const closeEditModal = () => { setEditModalOpen(false); setEditingItem(null); setEditError(''); };
  
  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;
    setEditLoading(true);
    try {
      const res = await fetchWithAuth(`/api/daily_activity/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      if (!res.ok) throw new Error('Update failed');
      // Updated successfully; the individual page component should refresh its data.
      closeEditModal();
    } catch (err: any) {
      setEditError(err?.message || 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };
  
  // Check backend health
  const checkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      setBackendStatus(response.ok ? 'connected' : 'error');
    } catch (e) {
      setBackendStatus('error');
    }
  };
  
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (authToken) localStorage.setItem('access_token', authToken);
    else localStorage.removeItem('access_token');
  }, [authToken]);
  
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('current_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);
  
  // ✅ Auto-fill reset_token from URL: /?reset_token=xxxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('reset_token');
    if (t) {
      setResetToken(t);
      setShowForgot(true);
    }
  }, []);
  
  // Page components handle their own data fetching and state.
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (response.ok && data.status === 'success') {
        setAuthToken(data.access_token);
        setCurrentUser(data.user);
      } else {
        setLoginError(data.message || 'Login failed');
      }
    } catch (err) {
      setLoginError(`Network Error: Could not connect to API at ${API_BASE || 'origin'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErr('');
    setForgotMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      if (response.ok) {
        setForgotMsg('Check your email for a reset link');
        setForgotEmail('');
      } else {
        setForgotErr('Failed to send reset email');
      }
    } catch {
      setForgotErr('Network error');
    }
  };
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetErr('');
    setResetMsg('');
    try {
      const response = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, new_password: newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setResetMsg('Password reset successfully! You can now login.');
        setResetToken('');
        setNewPassword('');
        setTimeout(() => setShowForgot(false), 2000);
      } else {
        setResetErr(data.message || 'Reset failed');
      }
    } catch (err: any) {
      setResetErr(err.message || 'Error');
    }
  };
  
  // Page components manage their own submissions, users, and performance calculations.

  // Dashboard metrics - compute weekly hours by fetching last 7 days of activities
  const [weeklyHours, setWeeklyHours] = useState<number>(0);
  const [weeklyLoading, setWeeklyLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!currentUser) {
      setWeeklyHours(0);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setWeeklyLoading(true);
      try {
        // compute start/end for last 7 days (YYYY-MM-DD)
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 6);
        start.setHours(0,0,0,0);
        const end = new Date();
        end.setHours(23,59,59,999);

        const startISO = start.toISOString().split('T')[0];
        const endISO = end.toISOString().split('T')[0];

        const res = await fetchWithAuth(`/api/daily_activity?start_date=${startISO}&end_date=${endISO}`);
        if (!res.ok) throw new Error('Failed to fetch activities');
        const json = await res.json();
        const rows: any[] = Array.isArray(json.data) ? json.data : [];

        // reuse `now`/`start` computed above for date range check

        const total = rows.reduce((acc, r) => {
          try {
            const dateStr = r.submittedAt || r.activityDate || r.date;
            if (!dateStr) return acc;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return acc;
            if (d >= start && d <= now) {
              const h = parseFloat(r.dedicatedHours) || 0;
              return acc + h;
            }
          } catch (e) {
            return acc;
          }
          return acc;
        }, 0 as number);

        if (!cancelled) setWeeklyHours(Math.round(total * 100) / 100);
      } catch (e) {
        if (!cancelled) setWeeklyHours(0);
      } finally {
        if (!cancelled) setWeeklyLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [currentUser, authToken]);

  const remainingHours = Math.max(0, 40 - weeklyHours);
  const weeklyProgressPercent = weeklyHours > 0 ? Math.min(100, Math.round((weeklyHours / 40) * 100)) : 0;
  
  // LOGIN VIEW
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="mb-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">C</div>
              <h1 className="text-4xl font-black mb-2">CORE.</h1>
              <p className="text-sm text-gray-500">Daily Activity Tracker</p>
            </div>
            
            {!showForgot ? (
              <form onSubmit={handleLogin}>
                <div className="mb-4 group">
                  <label className={MODERN_LABEL_CLASSES}>Email</label>
                  <input
                    value={loginForm.email}
                    onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                    className={MODERN_INPUT_CLASSES}
                    disabled={loading}
                  />
                </div>
                
                <div className="mb-6 group">
                  <label className={MODERN_LABEL_CLASSES}>Password</label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                    className={MODERN_INPUT_CLASSES}
                    disabled={loading}
                  />
                </div>
                
                {loginError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{loginError}</span></div>}
                
                <button
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-700 to-pink-600 text-white font-black hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="w-full text-sm text-purple-600 hover:text-purple-700 font-bold"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            ) : resetToken ? (
              <form onSubmit={handleResetPassword}>
                <div className="mb-4 group">
                  <label className={MODERN_LABEL_CLASSES}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={MODERN_INPUT_CLASSES}
                  />
                </div>
                {resetErr && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{resetErr}</div>}
                {resetMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{resetMsg}</div>}
                <button className="w-full py-4 rounded-xl bg-purple-700 text-white font-black">Reset Password</button>
                <button type="button" onClick={() => { setShowForgot(false); setResetToken(''); }} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">Back</button>
              </form>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="mb-4 group">
                  <label className={MODERN_LABEL_CLASSES}>Email</label>
                  <input
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className={MODERN_INPUT_CLASSES}
                    placeholder="Enter your email"
                  />
                </div>
                {forgotErr && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{forgotErr}</div>}
                {forgotMsg && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{forgotMsg}</div>}
                <button className="w-full py-4 rounded-xl bg-purple-700 text-white font-black">Send Reset Link</button>
                <button type="button" onClick={() => setShowForgot(false)} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">Back</button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // MAIN APP VIEW
  
  return (
    <div className="min-h-screen bg-[#fafbfc] flex text-gray-900 font-sans">
      <Sidebar 
        currentUser={currentUser} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        onLogout={() => { setCurrentUser(null); localStorage.removeItem('access_token'); }}
      />
      
      {/* Main Content */}
      <main className="flex-1 ml-72 min-h-screen">
        <div className="p-16 max-w-[1400px] mx-auto">
          <ViewContainer>
            {currentView === 'home' && <Dashboard currentUser={currentUser} backendStatus={backendStatus} weeklyHours={weeklyHours} remainingHours={remainingHours} weeklyProgressPercent={weeklyProgressPercent} />}
            {currentView === 'tracker' && <Tracker currentUser={currentUser} />}
            {currentView === 'performance' && <Performance currentUser={currentUser} />}
            {currentView === 'oldData' && <OldData currentUser={currentUser} onEdit={openEditModal} />}
            {currentView === 'resourcePlanner' && <ResourcePlanner currentUser={currentUser} />}
            {currentView === 'teamControl' && <TeamControl currentUser={currentUser} />}
            {currentView === 'teamReport' && <TeamReport currentUser={currentUser} />}
          </ViewContainer>
        </div>
      </main>
      
      {/* Edit Modal */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Edit Entry</h3>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            
            {editError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{editError}</div>}
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* POD Name */}
                <SearchableSelect 
                  label="POD Name"
                  options={filterOptions.podNames}
                  value={editingItem.podName || ''}
                  onChange={(val) => setEditingItem({...editingItem, podName: val})}
                  placeholder="Select POD"
                />

                {/* Mode of Functioning */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-2">Mode of Functioning</label>
                  <input 
                    value={editingItem.modeOfFunctioning || ''} 
                    onChange={e => setEditingItem({...editingItem, modeOfFunctioning: e.target.value})} 
                    className="w-full px-4 py-3 rounded-lg border" 
                    placeholder="WFO/WFH/Hybrid"
                  />
                </div>

                {/* Product */}
                <SearchableSelect 
                  label="Product"
                  options={filterOptions.products}
                  value={editingItem.product || ''}
                  onChange={(val) => setEditingItem({...editingItem, product: val})}
                  placeholder="Select Product"
                />

                {/* Project Name */}
                <SearchableSelect 
                  label="Project Name"
                  options={filterOptions.projectNames}
                  value={editingItem.projectName || ''}
                  onChange={(val) => setEditingItem({...editingItem, projectName: val})}
                  placeholder="Select Project"
                />

                {/* Nature of Work */}
                <SearchableSelect 
                  label="Nature of Work"
                  options={filterOptions.natureOfWork}
                  value={editingItem.natureOfWork || ''}
                  onChange={(val) => setEditingItem({...editingItem, natureOfWork: val})}
                  placeholder="Select Nature"
                />

                {/* Task */}
                <SearchableSelect 
                  label="Task"
                  options={filterOptions.tasks}
                  value={editingItem.task || ''}
                  onChange={(val) => setEditingItem({...editingItem, task: val})}
                  placeholder="Select Task"
                />

                {/* Hours */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-2">Hours</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={editingItem.dedicatedHours || ''} 
                    onChange={e => setEditingItem({...editingItem, dedicatedHours: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-3 rounded-lg border" 
                  />
                </div>
              </div>

              {/* Remarks - Full Width */}
              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Remarks</label>
                <textarea 
                  value={editingItem.remarks || ''} 
                  onChange={e => setEditingItem({...editingItem, remarks: e.target.value})} 
                  className="w-full px-4 py-3 rounded-lg border h-24" 
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="submit" disabled={editLoading} className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-bold">{editLoading ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={closeEditModal} className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-bold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
