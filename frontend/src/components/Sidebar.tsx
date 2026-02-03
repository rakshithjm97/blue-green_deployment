import React from 'react';
import { Home, Send, TrendingUp, Database, Users, LogOut, Layers, Activity, Cpu } from 'lucide-react';

export const SidebarItem: React.FC<any> = ({ icon: Icon, label, onClick, active }) => (
  <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer ${active ? 'bg-gradient-to-r from-purple-700 to-pink-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
    <Icon size={18} />
    <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
  </div>
);

const Sidebar: React.FC<any> = ({ currentUser, currentView, setCurrentView, onLogout }) => {
  return (
    <aside className="w-72 border-r border-gray-100 fixed inset-y-0 left-0 bg-white z-20 flex flex-col">
      <div className="p-8 mb-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-purple-700 to-pink-600 flex items-center justify-center text-white">C</div>
        <div>
          <span className="font-black text-2xl">CORE.</span>
          <div className="text-xs text-gray-400">Restricted Access</div>
        </div>
      </div>
      <div className="px-5 space-y-2">
        <SidebarItem icon={Home} label="Terminal Home" onClick={() => setCurrentView('home')} active={currentView === 'home'} />
        <SidebarItem icon={Layers} label="Resource Planner" onClick={() => setCurrentView('resourcePlanner')} active={currentView === 'resourcePlanner'} />
        <SidebarItem icon={Send} label="Activity Logger" onClick={() => setCurrentView('tracker')} active={currentView === 'tracker'} />
        <SidebarItem icon={Activity} label="Metrics" onClick={() => setCurrentView('performance')} active={currentView === 'performance'} />
        <SidebarItem icon={Database} label="Old Data" onClick={() => setCurrentView('oldData')} active={currentView === 'oldData'} />
        {currentUser && <SidebarItem icon={Users} label="Team Report" onClick={() => setCurrentView('teamReport')} active={currentView === 'teamReport'} />}
        {currentUser?.role === 'Admin' && <SidebarItem icon={Cpu} label="Team Control" onClick={() => setCurrentView('teamControl')} active={currentView === 'teamControl'} />}
      </div>
      <div className="p-6 border-t border-gray-50 mt-auto">
        <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 text-red-500 hover:bg-red-50 rounded-xl font-black text-xs"> <LogOut size={16} /> END SESSION</button>
      </div>
    </aside>
  );
};

export default Sidebar;