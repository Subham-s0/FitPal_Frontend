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
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const DashboardSidebar = ({ role, active, onChange, expanded, onExpandedChange }: SidebarProps) => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const roleValue = role ?? auth.role;
  const navItems = getDashboardNavItems(roleValue);
  const dashboardRole = getDashboardRole(roleValue);
  const settingsActive = active === "settings";

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
    <aside
      className={`z-40 flex h-full w-full flex-col overflow-hidden border-r border-[#1f1f1f] bg-[#0f0f0f] transition-all duration-300 ${expanded ? "p-4" : "p-2"}`}
      onMouseEnter={() => onExpandedChange(true)}
      onMouseLeave={() => onExpandedChange(false)}
      onFocusCapture={() => onExpandedChange(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onExpandedChange(false);
        }
      }}
    >
      <nav className="scrollbar-hide flex flex-1 flex-col gap-4 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`group/link flex w-full items-center p-3 transition-all hover:bg-orange-600 ${
              expanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
            } ${
              active === id ? "bg-orange-600" : ""
            }`}
          >
            <Icon
              className={`h-6 w-6 min-w-[24px] ${
                active === id ? "text-black" : "text-gray-500"
              }`}
            />
            <span
              className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none transition-opacity ${
                expanded ? "block opacity-100" : "hidden opacity-0"
              } ${
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
          className={`group/link flex w-full items-center p-3 transition-all hover:bg-orange-600 ${
            expanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
          } ${
            settingsActive ? "bg-orange-600" : ""
          }`}
        >
          <Settings
            className={`h-6 w-6 min-w-[24px] ${
              settingsActive ? "text-black" : "text-gray-500"
            }`}
          />
          <span
            className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none transition-opacity ${
              expanded ? "block opacity-100" : "hidden opacity-0"
            } ${
              settingsActive ? "text-black" : "text-gray-400 group-hover/link:text-black"
            }`}
          >
            Settings
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/logout")}
          className={`group/link flex w-full items-center p-3 transition-all hover:bg-red-500 ${
            expanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
          }`}
        >
          <LogOut className="h-6 w-6 min-w-[24px] text-red-500" />
          <span className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none text-gray-400 transition-opacity ${expanded ? "block opacity-100" : "hidden opacity-0"}`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
