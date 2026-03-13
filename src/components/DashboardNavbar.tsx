import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell } from "lucide-react";

const DashboardNavbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="h-20 w-full flex items-center justify-between px-8 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/5 sticky top-0">
        <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-2 group">
                <img src="/logo.svg" alt="FitPal Logo" className="h-10 w-10 md:h-12 md:w-12" />
                <span className="text-xl font-bold text-white">
                  <span className="text-gradient-fire">Fit</span>Pal
                </span>
            </a>
        </div>

        <div className="flex-grow max-w-md mx-12 hidden md:block">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-600 transition-colors" />
                <input type="text" placeholder="Search routines..." 
                       className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-orange-600/50 focus:ring-4 focus:ring-orange-600/5 transition-all" />
            </div>
        </div>

        <div className="flex items-center gap-6">
            <button className="relative group p-2 rounded-full hover:bg-white/5 transition-colors">
                <Bell className="w-6 h-6 text-gray-400 group-hover:text-orange-600 transition-colors" />
                <span className="absolute top-1 right-2 w-2 h-2 bg-orange-600 rounded-full"></span>
            </button>

            <button className="bg-orange-600/10 border border-orange-600/20 text-orange-600 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600/20 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-600/10">
                Check In
            </button>

            <div className="h-10 w-[1px] bg-white/10"></div>

            <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/profile')}>
                <div className="text-right leading-none hidden sm:block text-white">
                    <p className="font-black text-sm tracking-tight">Alex Sharma</p>
                    <p className="text-[9px] text-orange-600 font-bold uppercase tracking-widest mt-1">Elite Member</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-orange-600 p-0.5">
                    <img src="https://ui-avatars.com/api/?name=Alex+S&background=111&color=fb923c" className="rounded-full w-full h-full object-cover" alt="Profile" />
                </div>
            </div>
        </div>
    </nav>
  );
};

export default DashboardNavbar;
