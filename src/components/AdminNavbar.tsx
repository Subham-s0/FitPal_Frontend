import React from 'react';

const AdminNavbar = () => {
  return (
    <nav className="h-20 w-full flex items-center justify-between px-8 z-50 bg-[#0f0f0f]/80 backdrop-blur-md border-b border-white/5 sticky top-0">
        <div className="flex items-center gap-2">
            <a href="/admin" className="flex items-center gap-2 group">
                <img src="/logo.svg" alt="FitPal Logo" className="h-10 w-10 md:h-12 md:w-12" />
                <span className="text-xl font-bold text-white">
                  <span className="text-gradient-fire">Fit</span>Pal <span className="text-xs align-top bg-orange-600/20 text-orange-600 px-1 rounded ml-1">ADMIN</span>
                </span>
            </a>
        </div>

        <div className="flex-grow max-w-md mx-12 hidden md:block">
            <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" placeholder="Search users, gyms..." 
                       className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-orange-600/50 focus:ring-4 focus:ring-orange-600/5 transition-all" />
            </div>
        </div>

        <div className="flex items-center gap-6">
            <button className="relative group p-2 rounded-full hover:bg-white/5 transition-colors">
                <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                <span className="absolute top-1 right-2 w-2 h-2 bg-orange-600 rounded-full"></span>
            </button>

            <div className="h-10 w-[1px] bg-white/10"></div>

            <div className="flex items-center gap-4">
                <div className="text-right leading-none hidden sm:block text-white">
                    <p className="font-black text-sm tracking-tight">Super Admin</p>
                    <p className="text-[9px] text-orange-600 font-bold uppercase tracking-widest mt-1">System Access</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-orange-600 p-0.5 bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-black text-lg">
                    SA
                </div>
            </div>
        </div>
    </nav>
  );
};

export default AdminNavbar;
