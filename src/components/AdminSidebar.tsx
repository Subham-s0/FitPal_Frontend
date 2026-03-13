import React from 'react';
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard,
  DollarSign,
  Settings, 
  LogOut 
} from "lucide-react";

interface SidebarProps {
  active: string;
  onChange: (section: string) => void;
}

const AdminSidebar = ({ active, onChange }: SidebarProps) => {
  const navigate = useNavigate();

  return (
    <aside className="w-16 hover:w-72 bg-[#0a0a0a]/50 backdrop-blur-sm border-r border-white/5 transition-all duration-500 group flex flex-col p-2 group-hover:p-4 z-40 h-full overflow-hidden">
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-hide">
        <button 
          onClick={() => onChange('home')}
          className={`flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-orange-600 transition-all justify-center group-hover:justify-start ${active === 'home' ? 'bg-orange-600' : ''}`}
        >
          <LayoutDashboard className={`min-w-[24px] w-6 h-6 group-hover/link:text-black ${active === 'home' ? 'text-black' : 'text-orange-600'}`} />
          <span className={`ml-4 font-bold group-hover/link:text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block ${active === 'home' ? 'text-black' : 'text-gray-400'}`}>Dashboard</span>
        </button>
        
        <button 
          onClick={() => onChange('users')}
          className={`flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-orange-600 transition-all justify-center group-hover:justify-start ${active === 'users' ? 'bg-orange-600' : ''}`}
        >
          <Users className={`min-w-[24px] w-6 h-6 group-hover/link:text-black ${active === 'users' ? 'text-black' : 'text-gray-500'}`} />
          <span className={`ml-4 font-bold group-hover/link:text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block ${active === 'users' ? 'text-black' : 'text-gray-400'}`}>Manage Users</span>
        </button>

        <button 
          onClick={() => onChange('gyms')}
          className={`flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-orange-600 transition-all justify-center group-hover:justify-start ${active === 'gyms' ? 'bg-orange-600' : ''}`}
        >
          <Building2 className={`min-w-[24px] w-6 h-6 group-hover/link:text-black ${active === 'gyms' ? 'text-black' : 'text-gray-500'}`} />
          <span className={`ml-4 font-bold group-hover/link:text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block ${active === 'gyms' ? 'text-black' : 'text-gray-400'}`}>Manage Gyms</span>
        </button>

        <button 
          onClick={() => onChange('plans')}
          className={`flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-orange-600 transition-all justify-center group-hover:justify-start ${active === 'plans' ? 'bg-orange-600' : ''}`}
        >
          <CreditCard className={`min-w-[24px] w-6 h-6 group-hover/link:text-black ${active === 'plans' ? 'text-black' : 'text-gray-500'}`} />
          <span className={`ml-4 font-bold group-hover/link:text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block ${active === 'plans' ? 'text-black' : 'text-gray-400'}`}>Subscription Plans</span>
        </button>
        <button 
          onClick={() => onChange('payments')}
          className={`flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-orange-600 transition-all justify-center group-hover:justify-start ${active === 'payments' ? 'bg-orange-600' : ''}`}
        >
          <DollarSign className={`min-w-[24px] w-6 h-6 group-hover/link:text-black ${active === 'payments' ? 'text-black' : 'text-gray-500'}`} />
          <span className={`ml-4 font-bold group-hover/link:text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block ${active === 'payments' ? 'text-black' : 'text-gray-400'}`}>Payments</span>
        </button>
      </nav>

      <div className="mt-auto border-t border-white/5 pt-4 flex flex-col gap-4">
        <button 
          onClick={() => onChange('settings')} 
          className={`flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-white transition-all justify-center group-hover:justify-start ${active === 'settings' ? 'bg-white' : ''}`}
        >
          <Settings className={`min-w-[24px] w-6 h-6 group-hover/link:text-black ${active === 'settings' ? 'text-black' : 'text-gray-500'}`} />
          <span className={`ml-4 font-bold group-hover/link:text-black opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block ${active === 'settings' ? 'text-black' : 'text-gray-400'}`}>Settings</span>
        </button>
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center w-full group/link p-3 rounded-full group-hover:rounded-2xl hover:bg-red-500 transition-all justify-center group-hover:justify-start"
        >
          <LogOut className="min-w-[24px] w-6 h-6 text-red-500 group-hover/link:text-white" />
          <span className="ml-4 font-bold text-gray-400 group-hover/link:text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden group-hover:block">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
