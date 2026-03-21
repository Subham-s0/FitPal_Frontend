import { Bell, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuthState } from "@/hooks/useAuth";

const getAdminInitials = (email: string | null) => {
  const value = email?.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") || "AD";
  return value.slice(0, 2).toUpperCase();
};

const AdminNavbar = () => {
  const auth = useAuthState();
  const initials = getAdminInitials(auth.email);

  return (
    <nav className="sticky top-0 z-50 flex h-20 w-full items-center justify-between border-b border-white/10 bg-[#0b0b0b]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-3">
          <img src="/logo.svg" alt="FitPal Logo" className="h-12 w-12 flex-none" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xl font-extrabold">
                <span className="bg-[linear-gradient(135deg,#f97316,#fbbf24)] bg-clip-text text-transparent">
                  Fit
                </span>
                <span className="text-white">Pal</span>
              </span>
              <span className="hidden rounded-md border border-orange-500/30 px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-orange-300/80 sm:inline-flex">
                Admin
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="mx-6 hidden max-w-xl flex-1 lg:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search admin tools..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50 focus:shadow-[0_0_0_3px_rgba(249,115,22,0.1)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button className="relative rounded-full border border-white/10 bg-white/[0.03] p-2 text-zinc-400 transition hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500" />
        </button>

        <div className="hidden text-right md:block">
          <p className="max-w-[180px] truncate text-sm font-black text-white">
            {auth.email ?? "admin@fitpal.com"}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            {auth.role?.toUpperCase() === "SUPERADMIN" ? "Super Admin" : "Admin Session"}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-500/30 bg-[#151515] text-sm font-black text-orange-200">
          {initials}
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
