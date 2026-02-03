import React from 'react';

type SidebarItemProps = {
   icon?: React.ComponentType<any>;
   label: string;
   onClick?: () => void;
   active?: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, onClick, active }) => {
   return (
      <button
         onClick={onClick}
         className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-black text-sm transition-colors ${
            active ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
         }`}
      >
         <div className="w-8 h-8 flex items-center justify-center text-gray-500">
            {Icon ? <Icon size={16} /> : null}
         </div>
         <div className="flex-1">{label}</div>
      </button>
   );
};

export default SidebarItem;