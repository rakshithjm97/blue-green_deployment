import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, Send, TrendingUp, Database, Users, LogOut, Layers, Activity, Cpu, ChevronDown, Plus, Trash2, Edit2, X, AlertCircle } from 'lucide-react';

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

/**
 * Searchable Select Component
 */
const SearchableSelect = ({ options, value, onChange, placeholder, label, className }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredOptions = useMemo(() => options.filter((opt: string) => opt.toLowerCase().includes(searchTerm.toLowerCase())), [options, searchTerm]);
  
  return (
    <div className="relative group" ref={containerRef}>
      {label && <label className={MODERN_LABEL_CLASSES}>{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : value}
          placeholder={value || placeholder}
          className={`${className || MODERN_INPUT_CLASSES} pr-10`}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? filteredOptions.map((opt: string, idx: number) => (
            <div
              key={idx}
              onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(''); }}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm font-bold"
            >
              {opt}
            </div>
          )) : <div className="px-4 py-3 text-gray-400 text-sm">No options</div>}
        </div>
      )}
    </div>
  );
};

const ViewContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">{children}</div>
);

const fetchWithAuth = async (path: string, init?: RequestInit) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers = { ...(init?.headers as any || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  return fetch((path.startsWith('http') ? path : `${API_BASE}${path}`), { ...(init || {}), headers });
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<{email: string, name: string, role: string, id: string} | null>(() => {
    try {
      const s = localStorage.getItem('current_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  
  const [authToken, setAuthToken] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
  const [currentView, setCurrentView] = useState<'home' | 'tracker' | 'performance' | 'resourcePlanning' | 'users' | 'teamReport' | 'oldData'>('home');
  
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginForm, setLoginForm] = useState({ email: 'admin@aidash.com', password: 'password123' });
  
  const [perfData, setPerfData] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
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
  
  const [planningForm, setPlanningForm] = useState({ date: new Date().toISOString().split('T')[0], podName: '', modeOfFunctioning: '', product: '', projectName: '', natureOfWork: '', task: '' });
  const initialProjectEntry = {
    task: '', dedicatedHours: '', projectName: '', natureOfWork: '', subTask: '', remarks: '',
    // AIMS fields
    conductorLines: '', numberOfPoints: '',
    // IVMS fields
    benchmarkForTask: '', lineMiles: '', lineMilesH1V1: '', dedicatedHoursH1V1: '', lineMilesH1V0: '', dedicatedHoursH1V0: '',
    // ISMS fields
    siteName: '', areaHectares: '', polygonFeatureCount: '', polylineFeatureCount: '', pointFeatureCount: '', spentHoursOnAboveTask: '', density: '',
    // RSMS fields
    timeField: '',
    // Vendor POC / IEMS fields
    trackerUpdating: false, dataQualityChecking: false, trainingFeedback: false, trnRemarks: '', documentation: false, docRemark: '', othersMisc: ''
  };
  const [trackerForm, setTrackerForm] = useState<any>({ date: new Date().toISOString().split('T')[0], modeOfFunctioning: '', podName: '', product: '', projects: [{ ...initialProjectEntry }] });
  
  // Old Data View State
  const [oldDataList, setOldDataList] = useState<any[]>([]);
  const [oldDataFilters, setOldDataFilters] = useState({
    product: '',
    projectName: '',
    natureOfWork: '',
    task: '',
    podName: ''
  });
  const [oldDataFilterOptions, setOldDataFilterOptions] = useState({
    products: [],
    projectNames: [],
    natureOfWork: [],
    tasks: [],
    podNames: []
  });
  const [oldDataLoading, setOldDataLoading] = useState(false);
  
  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
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
      setOldDataList(prev => prev.map(p => (p.id === editingItem.id ? { ...p, ...editingItem } : p)));
      closeEditModal();
    } catch (err: any) {
      setEditError(err?.message || 'Update failed');
    } finally {
      setEditLoading(false);
    }
  };
  
  // Project management functions
  const updateProject = (idx: number, patch: any) => {
    const next = [...(trackerForm.projects || [])];
    next[idx] = { ...(next[idx] || initialProjectEntry), ...patch };
    setTrackerForm({ ...trackerForm, projects: next });
  };

  const addProject = () => {
    const next = [...(trackerForm.projects || [])];
    next.push({ ...initialProjectEntry });
    setTrackerForm({ ...trackerForm, projects: next });
  };

  const removeProject = (idx: number) => {
    const next = [...(trackerForm.projects || [])];
    next.splice(idx, 1);
    if (next.length === 0) next.push({ ...initialProjectEntry });
    setTrackerForm({ ...trackerForm, projects: next });
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
  
  // Fetch performance data
  const fetchPerformance = async () => {
    if (!currentUser) return;
    try {
      const params = new URLSearchParams({
        email: currentUser.email,
        role: currentUser.role,
        start_date: dateFilter.startDate,
        end_date: dateFilter.endDate
      });
      const response = await fetchWithAuth(`/api/performance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPerfData(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  // Fetch old data filters
  const fetchOldDataFilters = async () => {
    if (!currentUser) return;
    try {
      const response = await fetchWithAuth(`/api/daily_activity/filters`);
      if (response.ok) {
        const data = await response.json();
        setOldDataFilterOptions(data.data || {});
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  // Fetch old data
  const fetchOldData = async () => {
    if (!currentUser) return;
    setOldDataLoading(true);
    try {
      const params = new URLSearchParams({
        ...(oldDataFilters.product && { product: oldDataFilters.product }),
        ...(oldDataFilters.projectName && { project_name: oldDataFilters.projectName }),
        ...(oldDataFilters.natureOfWork && { nature_of_work: oldDataFilters.natureOfWork }),
        ...(oldDataFilters.task && { task: oldDataFilters.task }),
        ...(oldDataFilters.podName && { pod_name: oldDataFilters.podName }),
      });
      const response = await fetchWithAuth(`/api/daily_activity?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOldDataList(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
    setOldDataLoading(false);
  };
  
  // Fetch users
  const fetchUsers = async () => {
    if (!(currentUser?.role === 'Admin' || currentUser?.role === 'Internal Admin')) return;
    try {
      const response = await fetchWithAuth(`/api/users`);
      if (response.ok) {
        const data = await response.json();
        setUserList(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {
    if (currentUser) {
      if (currentView === 'performance') fetchPerformance();
      if (currentView === 'users') fetchUsers();
      if (currentView === 'oldData') {
        fetchOldDataFilters();
        fetchOldData();
      }
    }
  }, [currentUser, currentView, dateFilter, oldDataFilters]);
  
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
  
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      if (response.ok) {
        setShowAddUser(false);
        setNewUserForm({ name: '', email: '', password: '', role: 'User' });
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Delete user?')) return;
    try {
      await fetchWithAuth(`/api/users/${userId}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleSubmitTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setSubmitError('');
    try {
      const response = await fetchWithAuth(`/api/tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackerForm)
      });
      if (response.ok) {
        setTrackerForm({ date: new Date().toISOString().split('T')[0], modeOfFunctioning: '', podName: '', product: '', projects: [{ ...initialProjectEntry }] });
        setSubmitError('');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitPlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setSubmitError('');
    try {
      const response = await fetchWithAuth(`/api/resource-planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planningForm)
      });
      if (response.ok) {
        setPlanningForm({ date: new Date().toISOString().split('T')[0], podName: '', modeOfFunctioning: '', product: '', projectName: '', natureOfWork: '', task: '' });
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate weekly hours
  const getWeeklyHours = (data: any[]) => {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return data.reduce((total, record) => {
      if (record.submitted_at) {
        const recordDate = new Date(record.submitted_at);
        if (recordDate >= startOfWeek && recordDate <= endOfWeek) {
          return total + (record.hours || 0);
        }
      }
      return total;
    }, 0);
  };
  
  const weeklyHours = useMemo(() => getWeeklyHours(perfData), [perfData]);
  const remainingHours = Math.max(0, 40 - weeklyHours);
  const weeklyProgressPercent = Math.min(100, (weeklyHours / 40) * 100);
  
  // Get filtered perf data based on role
  const getFilteredPerfData = () => {
    if (!currentUser) return [];
    if (currentUser.role === 'Admin') return perfData;
    if (currentUser.role === 'Manager') {
      const key = currentUser.email.split('@')[0];
      const managerData = TEAM_STRUCTURE.managers[key as keyof typeof TEAM_STRUCTURE.managers];
      if (managerData) {
        return perfData.filter(r => managerData.pods.includes(r.podName));
      }
    }
    if (currentUser.role === 'Team Lead') {
      const key = currentUser.email.split('@')[0];
      const leadData = TEAM_STRUCTURE.teamLeads[key as keyof typeof TEAM_STRUCTURE.teamLeads];
      if (leadData) {
        return perfData.filter(r => r.podName === leadData.pod);
      }
    }
    return perfData.filter(r => r.email === currentUser.email);
  };
  
  const filteredPerfData = useMemo(() => getFilteredPerfData(), [perfData, currentUser]);
  
  // Calculate team members
  const teamMembers = useMemo(() => {
    if (filteredPerfData.length === 0) return [];
    const memberMap = new Map<string, any>();
    filteredPerfData.forEach(item => {
      const email = item.email || 'unknown';
      if (!memberMap.has(email)) {
        memberMap.set(email, {
          email,
          name: item.email?.split('@')[0] || 'User',
          entries: 0,
          totalHours: 0,
          avgDaily: 0
        });
      }
      const member = memberMap.get(email);
      member.entries += 1;
      member.totalHours += item.hours || 0;
      member.avgDaily = member.totalHours / member.entries;
    });
    return Array.from(memberMap.values());
  }, [filteredPerfData]);
  
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
  const SidebarItem = ({ icon: Icon, label, onClick, active = false }: any) => (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer group transition-all duration-300 relative overflow-hidden ${active ? 'bg-gray-900 text-white shadow-xl scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'}`}>
      {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 rounded-full" />}
      <Icon size={19} className={`${active ? 'text-purple-400' : 'text-gray-400'}`} />
      <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-[#fafbfc] flex text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-100 fixed inset-y-0 left-0 bg-white z-20 flex flex-col p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-white font-black">C</div>
          <div>
            <span className="font-black text-2xl">CORE.</span>
            <div className="text-xs text-gray-400">Restricted Access</div>
          </div>
        </div>
        
        <div className="space-y-2 flex-1">
          <SidebarItem icon={Home} label="Terminal Home" onClick={() => setCurrentView('home')} active={currentView === 'home'} />
          <SidebarItem icon={Send} label="Activity Logger" onClick={() => setCurrentView('tracker')} active={currentView === 'tracker'} />
          <SidebarItem icon={Activity} label="Metrics" onClick={() => setCurrentView('performance')} active={currentView === 'performance'} />
          <SidebarItem icon={Database} label="Old Data" onClick={() => setCurrentView('oldData')} active={currentView === 'oldData'} />
          <SidebarItem icon={Layers} label="Resource Planner" onClick={() => setCurrentView('resourcePlanning')} active={currentView === 'resourcePlanning'} />
          {currentUser.role === 'Admin' && <SidebarItem icon={Users} label="Users" onClick={() => setCurrentView('users')} active={currentView === 'users'} />}
          <SidebarItem icon={TrendingUp} label="Team Report" onClick={() => setCurrentView('teamReport')} active={currentView === 'teamReport'} />
        </div>
        
        <div className="border-t border-gray-50 pt-6">
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('access_token'); }} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 px-4 py-3 rounded-xl font-black text-xs">
            <LogOut size={16} /> END SESSION
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 ml-72 min-h-screen">
        <div className="p-16 max-w-[1400px] mx-auto">
          <ViewContainer>
            {currentView === 'home' && (
              <div>
                <h1 className="text-4xl font-black mb-8">Welcome, {currentUser.name}</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-sm text-gray-500 font-black mb-2">WEEKLY HOURS</div>
                    <div className="text-4xl font-black mb-4">{weeklyHours.toFixed(1)}h</div>
                    <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-gradient-to-r from-purple-700 to-pink-600 h-2 rounded-full" style={{width: `${weeklyProgressPercent}%`}}></div></div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-sm text-gray-500 font-black mb-2">REMAINING</div>
                    <div className="text-4xl font-black">{remainingHours.toFixed(1)}h</div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-sm text-gray-500 font-black mb-2">STATUS</div>
                    <div className={`text-xl font-black ${backendStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {backendStatus === 'connected' ? '✓ Connected' : '✗ Disconnected'}
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="text-sm text-gray-500 font-black mb-2">ROLE</div>
                    <div className="text-xl font-black">{currentUser.role}</div>
                  </div>
                </div>
              </div>
            )}
            
            {currentView === 'tracker' && (
              <div>
                <h2 className="text-2xl font-black mb-6">Activity Logger</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <form onSubmit={handleSubmitTracker} className="bg-white rounded-2xl p-8 shadow-sm border">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="text-xs font-black text-gray-500 block mb-2">Date</label>
                          <input type="date" value={trackerForm.date} onChange={e => setTrackerForm({...trackerForm, date: e.target.value})} className="w-full px-4 py-3 rounded-lg border" />
                        </div>
                        <SearchableSelect label="Mode" placeholder="Select" value={trackerForm.modeOfFunctioning} onChange={(v: string) => setTrackerForm({...trackerForm, modeOfFunctioning: v})} options={['WFO', 'WFH']} />
                        <SearchableSelect label="POD" placeholder="Select" value={trackerForm.podName} onChange={(v: string) => setTrackerForm({...trackerForm, podName: v})} options={['POD-1 (Aryabhata)', 'POD-2 (Crawlers)', 'POD-3 (Marte)', 'POD-4 (Gaganyaan)', 'POD-5 (Swift)', 'POD-6 (Imagery)']} />
                        <SearchableSelect label="Product" placeholder="Select" value={trackerForm.product} onChange={(v: string) => setTrackerForm({...trackerForm, product: v})} options={['aims', 'ivms', 'imagery', 'IEMS', 'ISMS', 'RSMS']} />
                      </div>
                      
                      <h3 className="text-lg font-black mb-4">Projects</h3>
                      <div className="space-y-4 mb-6">
                        {trackerForm.projects?.map((proj: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <input placeholder="Project Name" value={proj.projectName || ''} onChange={e => updateProject(idx, {projectName: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                              <input placeholder="Task" value={proj.task || ''} onChange={e => updateProject(idx, {task: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                              <SearchableSelect label="Nature" value={proj.natureOfWork || ''} onChange={(v: string) => updateProject(idx, {natureOfWork: v})} options={['Span Validation', 'Span Correction', 'QC', 'Training', 'Others']} />
                              <input placeholder="Dedicated Hours" type="number" step="0.5" value={proj.dedicatedHours || ''} onChange={e => updateProject(idx, {dedicatedHours: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                            </div>
                            <textarea placeholder="Remarks" value={proj.remarks || ''} onChange={e => updateProject(idx, {remarks: e.target.value})} className="w-full px-3 py-2 rounded-lg border text-sm h-16 mb-3" />
                            
                            {/* Conditional fields based on selected product */}
                            {trackerForm.product === 'aims' && (
                              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <label className="text-xs font-black text-gray-500">AIMS: Conductor Lines</label>
                                <input type="number" step="0.1" placeholder="Conductor Lines" value={proj.conductorLines || ''} onChange={e => updateProject(idx, {conductorLines: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-1" />
                                <label className="text-xs font-black text-gray-500">AIMS: Number of Points</label>
                                <input type="number" step="0.1" placeholder="Number of Points" value={proj.numberOfPoints || ''} onChange={e => updateProject(idx, {numberOfPoints: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-1" />
                              </div>
                            )}
                            
                            {trackerForm.product === 'ivms' && (
                              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
                                <label className="text-xs font-black text-gray-500">IVMS: Benchmark</label>
                                <input placeholder="Benchmark for task" value={proj.benchmarkForTask || ''} onChange={e => updateProject(idx, {benchmarkForTask: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-2" />
                                <label className="text-xs font-black text-gray-500">Line Miles (All)</label>
                                <input type="number" step="0.1" placeholder="Line Miles" value={proj.lineMiles || ''} onChange={e => updateProject(idx, {lineMiles: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Line Miles (H1V1)</label>
                                <input type="number" step="0.1" placeholder="Line Miles H1V1" value={proj.lineMilesH1V1 || ''} onChange={e => updateProject(idx, {lineMilesH1V1: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Hours (H1V1)</label>
                                <input type="number" step="0.1" placeholder="Hours H1V1" value={proj.dedicatedHoursH1V1 || ''} onChange={e => updateProject(idx, {dedicatedHoursH1V1: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Line Miles (H1V0)</label>
                                <input type="number" step="0.1" placeholder="Line Miles H1V0" value={proj.lineMilesH1V0 || ''} onChange={e => updateProject(idx, {lineMilesH1V0: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Hours (H1V0)</label>
                                <input type="number" step="0.1" placeholder="Hours H1V0" value={proj.dedicatedHoursH1V0 || ''} onChange={e => updateProject(idx, {dedicatedHoursH1V0: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                              </div>
                            )}
                            
                            {trackerForm.product === 'ISMS' && (
                              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                <label className="text-xs font-black text-gray-500">ISMS: Site Name</label>
                                <input placeholder="Site Name" value={proj.siteName || ''} onChange={e => updateProject(idx, {siteName: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-2" />
                                <label className="text-xs font-black text-gray-500">Area (hectares)</label>
                                <input type="number" step="0.1" placeholder="Area Hectares" value={proj.areaHectares || ''} onChange={e => updateProject(idx, {areaHectares: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Polygon Count</label>
                                <input type="number" step="0.1" placeholder="Polygon Features" value={proj.polygonFeatureCount || ''} onChange={e => updateProject(idx, {polygonFeatureCount: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Polyline Count</label>
                                <input type="number" step="0.1" placeholder="Polyline Features" value={proj.polylineFeatureCount || ''} onChange={e => updateProject(idx, {polylineFeatureCount: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Point Count</label>
                                <input type="number" step="0.1" placeholder="Point Features" value={proj.pointFeatureCount || ''} onChange={e => updateProject(idx, {pointFeatureCount: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Spent Hours</label>
                                <input type="number" step="0.1" placeholder="Spent Hours" value={proj.spentHoursOnAboveTask || ''} onChange={e => updateProject(idx, {spentHoursOnAboveTask: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                                <label className="text-xs font-black text-gray-500">Density</label>
                                <input type="number" step="0.1" placeholder="Density" value={proj.density || ''} onChange={e => updateProject(idx, {density: e.target.value})} className="px-3 py-2 rounded-lg border text-sm" />
                              </div>
                            )}
                            
                            {trackerForm.product === 'RSMS' && (
                              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-rose-50 rounded-lg border border-rose-100">
                                <label className="text-xs font-black text-gray-500">RSMS: Time Field</label>
                                <input type="number" step="0.1" placeholder="Time Field" value={proj.timeField || ''} onChange={e => updateProject(idx, {timeField: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-2" />
                              </div>
                            )}
                            
                            {(trackerForm.product === 'imagery' || trackerForm.product === 'Imagery') && (
                              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                <label className="text-xs font-black text-gray-500">Imagery specific fields would appear here</label>
                                <div className="text-xs text-gray-500 col-span-2">Configure imagery fields as needed</div>
                              </div>
                            )}
                            
                            {trackerForm.product && ['IEMS'].includes(trackerForm.product) && (
                              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                                <label className="text-xs font-black text-gray-500">Vendor POC: Tracker Updating</label>
                                <input type="checkbox" checked={proj.trackerUpdating || false} onChange={e => updateProject(idx, {trackerUpdating: e.target.checked})} className="w-4 h-4" />
                                <label className="text-xs font-black text-gray-500">Data Quality Checking</label>
                                <input type="checkbox" checked={proj.dataQualityChecking || false} onChange={e => updateProject(idx, {dataQualityChecking: e.target.checked})} className="w-4 h-4" />
                                <label className="text-xs font-black text-gray-500">Training / Feedback</label>
                                <input type="checkbox" checked={proj.trainingFeedback || false} onChange={e => updateProject(idx, {trainingFeedback: e.target.checked})} className="w-4 h-4" />
                                <label className="text-xs font-black text-gray-500">Training Remarks</label>
                                <textarea placeholder="Training remarks" value={proj.trnRemarks || ''} onChange={e => updateProject(idx, {trnRemarks: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12" />
                                <label className="text-xs font-black text-gray-500">Documentation</label>
                                <input type="checkbox" checked={proj.documentation || false} onChange={e => updateProject(idx, {documentation: e.target.checked})} className="w-4 h-4" />
                                <label className="text-xs font-black text-gray-500">Doc Remark</label>
                                <textarea placeholder="Documentation remark" value={proj.docRemark || ''} onChange={e => updateProject(idx, {docRemark: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12" />
                                <label className="text-xs font-black text-gray-500">Others/Misc</label>
                                <textarea placeholder="Other miscellaneous" value={proj.othersMisc || ''} onChange={e => updateProject(idx, {othersMisc: e.target.value})} className="px-3 py-2 rounded-lg border text-sm col-span-2 h-12" />
                              </div>
                            )}
                            
                            {trackerForm.projects.length > 1 && (
                              <button type="button" onClick={() => removeProject(idx)} className="text-red-600 hover:text-red-700 font-bold text-sm flex items-center gap-1">
                                <Trash2 size={14} /> Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <button type="button" onClick={addProject} className="w-full mb-6 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-3 text-gray-600 hover:border-gray-400 font-bold">
                        <Plus size={18} /> Add Project
                      </button>
                      
                      {submitError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{submitError}</div>}
                      <button disabled={loading} className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black">{loading ? 'Submitting...' : 'SUBMIT'}</button>
                    </form>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="font-black mb-4">Today's Summary</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-gray-500">Total Hours</div>
                        <div className="text-3xl font-black">{(trackerForm.projects || []).reduce((sum: number, p: any) => sum + (parseFloat(p.dedicatedHours) || 0), 0).toFixed(1)}h</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Projects</div>
                        <div className="text-2xl font-black">{(trackerForm.projects || []).length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Target</div>
                        <div className="text-2xl font-black">8h</div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-xs text-gray-500 mb-2">Daily Progress</div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div className="bg-gradient-to-r from-purple-700 to-pink-600 h-3 rounded-full" style={{width: `${Math.min(100, ((trackerForm.projects || []).reduce((sum: number, p: any) => sum + (parseFloat(p.dedicatedHours) || 0), 0) / 8) * 100)}%`}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentView === 'performance' && (
              <div>
                <h2 className="text-2xl font-black mb-6">Metrics</h2>
                <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
                  <div className="flex gap-4">
                    <div><label className="text-xs font-black text-gray-500 block mb-2">From</label><input type="date" value={dateFilter.startDate} onChange={e => setDateFilter({...dateFilter, startDate: e.target.value})} className="px-4 py-2 rounded-lg border text-sm" /></div>
                    <div><label className="text-xs font-black text-gray-500 block mb-2">To</label><input type="date" value={dateFilter.endDate} onChange={e => setDateFilter({...dateFilter, endDate: e.target.value})} className="px-4 py-2 rounded-lg border text-sm" /></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teamMembers.map((member, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border">
                      <div className="font-black mb-3">{member.name}</div>
                      <div className="text-sm text-gray-500 mb-4">{member.email}</div>
                      <div className="flex justify-between">
                        <div>
                          <div className="text-xs text-gray-500">Total Hours</div>
                          <div className="font-black">{member.totalHours.toFixed(1)}h</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Avg Daily</div>
                          <div className="font-black">{member.avgDaily.toFixed(1)}h</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {currentView === 'oldData' && (
              <div>
                <h2 className="text-2xl font-black mb-6">Old Data</h2>
                <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <SearchableSelect label="Product" value={oldDataFilters.product} onChange={(v: string) => setOldDataFilters({...oldDataFilters, product: v})} options={oldDataFilterOptions.products || []} />
                    <SearchableSelect label="Project" value={oldDataFilters.projectName} onChange={(v: string) => setOldDataFilters({...oldDataFilters, projectName: v})} options={oldDataFilterOptions.projectNames || []} />
                    <SearchableSelect label="Nature" value={oldDataFilters.natureOfWork} onChange={(v: string) => setOldDataFilters({...oldDataFilters, natureOfWork: v})} options={oldDataFilterOptions.natureOfWork || []} />
                    <SearchableSelect label="Task" value={oldDataFilters.task} onChange={(v: string) => setOldDataFilters({...oldDataFilters, task: v})} options={oldDataFilterOptions.tasks || []} />
                    <SearchableSelect label="POD" value={oldDataFilters.podName} onChange={(v: string) => setOldDataFilters({...oldDataFilters, podName: v})} options={oldDataFilterOptions.podNames || []} />
                  </div>
                </div>
                <div className="space-y-4">
                  {oldDataLoading ? <div>Loading...</div> : oldDataList.map((item, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border flex justify-between items-start">
                      <div>
                        <div className="font-black">{item.projectName}</div>
                        <div className="text-sm text-gray-500">{item.email} • {item.dedicatedHours}h</div>
                      </div>
                      {(currentUser.role === 'Admin' || currentUser.role === 'Internal Admin') && (
                        <button onClick={() => openEditModal(item)} className="text-purple-600 hover:text-purple-700 font-bold"><Edit2 size={18} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {currentView === 'resourcePlanning' && (
              <div>
                <h2 className="text-2xl font-black mb-6">Resource Planner</h2>
                <form onSubmit={handleSubmitPlanning} className="bg-white rounded-2xl p-8 shadow-sm border">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><label className="text-xs font-black text-gray-500 block mb-2">Date</label><input type="date" value={planningForm.date} onChange={e => setPlanningForm({...planningForm, date: e.target.value})} className="w-full px-4 py-3 rounded-lg border" /></div>
                    <SearchableSelect label="POD" value={planningForm.podName} onChange={(v: string) => setPlanningForm({...planningForm, podName: v})} options={['POD-1 (Aryabhata)', 'POD-2 (Crawlers)', 'POD-3 (Marte)', 'POD-4 (Gaganyaan)', 'POD-5 (Swift)', 'POD-6 (Imagery)']} />
                    <SearchableSelect label="Mode" value={planningForm.modeOfFunctioning} onChange={(v: string) => setPlanningForm({...planningForm, modeOfFunctioning: v})} options={['WFO', 'WFH']} />
                    <SearchableSelect label="Product" value={planningForm.product} onChange={(v: string) => setPlanningForm({...planningForm, product: v})} options={['aims', 'ivms', 'imagery', 'IEMS', 'ISMS', 'RSMS']} />
                  </div>
                  <div className="mb-4"><input placeholder="Project Name" value={planningForm.projectName} onChange={e => setPlanningForm({...planningForm, projectName: e.target.value})} className="w-full px-4 py-3 rounded-lg border" /></div>
                  <button disabled={loading} className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-black">{loading ? 'Submitting...' : 'COMMIT PLAN'}</button>
                </form>
              </div>
            )}
            
            {currentView === 'users' && (
              <div>
                <h2 className="text-2xl font-black mb-6 flex justify-between items-center">
                  Users
                  <button onClick={() => setShowAddUser(!showAddUser)} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                    <Plus size={16} /> Add User
                  </button>
                </h2>
                
                {showAddUser && (
                  <form onSubmit={handleAddUser} className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <input placeholder="Name" value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="px-4 py-3 rounded-lg border" />
                      <input placeholder="Email" value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="px-4 py-3 rounded-lg border" />
                      <input type="password" placeholder="Password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} className="px-4 py-3 rounded-lg border" />
                      <select value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="px-4 py-3 rounded-lg border">
                        <option>User</option>
                        <option>Manager</option>
                        <option>Team Lead</option>
                        <option>Admin</option>
                      </select>
                    </div>
                    <button disabled={loading} className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">{loading ? 'Adding...' : 'Add User'}</button>
                  </form>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {userList.map((user, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto flex items-center justify-center font-black text-lg mb-3">{user.name[0]}</div>
                      <div className="font-black mb-1">{user.name}</div>
                      <div className="text-xs text-gray-500 mb-3">{user.email}</div>
                      <div className="text-xs font-bold text-purple-600 mb-4">{user.role}</div>
                      <button onClick={() => handleDeleteUser(user.id)} className="w-full text-red-600 hover:bg-red-50 px-2 py-1 rounded font-bold text-sm">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {currentView === 'teamReport' && (
              <div>
                <h2 className="text-2xl font-black mb-6">Team Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teamMembers.map((member, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-black">{member.name}</div>
                          <div className="text-xs text-gray-500">{member.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Weekly Hours</div>
                          <div className="text-xl font-black">{member.totalHours}h</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ViewContainer>
        </div>
      </main>
      
      {/* Edit Modal */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">Edit Entry</h3>
              <button onClick={closeEditModal} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            
            {editError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{editError}</div>}
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Project Name</label>
                <input value={editingItem.projectName || ''} onChange={e => setEditingItem({...editingItem, projectName: e.target.value})} className="w-full px-4 py-3 rounded-lg border" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Hours</label>
                <input type="number" value={editingItem.dedicatedHours || ''} onChange={e => setEditingItem({...editingItem, dedicatedHours: parseFloat(e.target.value)})} className="w-full px-4 py-3 rounded-lg border" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 block mb-2">Remarks</label>
                <textarea value={editingItem.remarks || ''} onChange={e => setEditingItem({...editingItem, remarks: e.target.value})} className="w-full px-4 py-3 rounded-lg border h-24" />
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
