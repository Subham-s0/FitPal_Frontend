import {
  LogOut,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuth";
import { getDashboardNavItems, getDashboardRole } from "./dashboard-shell-config";

interface SidebarProps {
  role?: string | null;
  active: string;
  onChange: (section: string) => void;
}

const DashboardSidebar = ({ role, active, onChange }: SidebarProps) => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const roleValue = role ?? auth.role;
  const navItems = getDashboardNavItems(roleValue);
  const dashboardRole = getDashboardRole(roleValue);

  const handleSettings = () => {
    if (dashboardRole === "ADMIN") {
      onChange("settings");
      return;
    }

    if (dashboardRole === "GYM") {
      onChange("settings");
      return;
    }

    navigate("/profile");
  };

  return (
    <aside className="group z-40 flex h-full w-16 flex-col overflow-hidden border-r border-white/5 bg-[#0a0a0a]/50 p-2 backdrop-blur-sm transition-all duration-500 hover:w-72 hover:p-4">
      <nav className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`group/link flex w-full items-center justify-center p-3 transition-all hover:bg-orange-600 group-hover:justify-start ${
              active === id ? "rounded-full bg-orange-600" : "rounded-full group-hover:rounded-2xl"
            }`}
          >
            <Icon
              className={`h-6 w-6 min-w-[24px] group-hover/link:text-black ${
                active === id ? "text-black" : "text-gray-500"
              }`}
            />
            <span
              className={`ml-4 hidden whitespace-nowrap text-[13px] font-bold leading-none opacity-0 transition-opacity group-hover:block group-hover:opacity-100 group-hover/link:text-black ${
                active === id ? "text-black" : "text-gray-400"
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={handleSettings}
          className="group/link flex w-full items-center justify-center rounded-full p-3 transition-all hover:bg-white group-hover:justify-start group-hover:rounded-2xl"
        >
          <Settings className="h-6 w-6 min-w-[24px] text-gray-500 group-hover/link:text-black" />
          <span className="ml-4 hidden whitespace-nowrap text-[13px] font-bold leading-none text-gray-400 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 group-hover/link:text-black">
            Settings
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/logout")}
          className="group/link flex w-full items-center justify-center rounded-full p-3 transition-all hover:bg-red-500 group-hover:justify-start group-hover:rounded-2xl"
        >
          <LogOut className="h-6 w-6 min-w-[24px] text-red-500 group-hover/link:text-white" />
          <span className="ml-4 hidden whitespace-nowrap text-[13px] font-bold leading-none text-gray-400 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 group-hover/link:text-white">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
