import { useState } from "react";
import {
  LogOut,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import { getDashboardNavItems, getDashboardRole } from "./dashboard-shell-config";

interface SidebarProps {
  role?: string | null;
  active: string;
  onChange: (section: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const DashboardSidebar = ({ role, active, onChange, expanded, onExpandedChange }: SidebarProps) => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const roleValue = role ?? auth.role;
  const navItems = getDashboardNavItems(roleValue);
  const dashboardRole = getDashboardRole(roleValue);
  const isExpanded = expanded ?? internalExpanded;
  const setExpanded = onExpandedChange ?? setInternalExpanded;
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
      className={`z-40 flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--border-default)] bg-[var(--surface-sidebar)] transition-[width,padding] duration-300 ${isExpanded ? "w-72 p-4" : "w-16 p-2"}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setExpanded(false);
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
              isExpanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
            } ${
              active === id ? "bg-orange-600" : ""
            }`}
          >
            <Icon
              className={`h-6 w-6 min-w-[24px] ${
                active === id ? "text-white" : "text-[var(--text-sidebar)]"
              }`}
            />
            <span
              className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none transition-opacity ${
                isExpanded ? "block opacity-100" : "hidden opacity-0"
              } ${
                active === id ? "text-white" : "text-[var(--text-sidebar)]"
              }`}
            >
              {label}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={handleSettings}
          className={`group/link flex w-full items-center p-3 transition-all hover:bg-orange-600 ${
            isExpanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
          } ${
            settingsActive ? "bg-orange-600" : ""
          }`}
        >
          <Settings
            className={`h-6 w-6 min-w-[24px] ${
              settingsActive ? "text-white" : "text-[var(--text-sidebar)]"
            }`}
          />
          <span
            className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none transition-opacity ${
              isExpanded ? "block opacity-100" : "hidden opacity-0"
            } ${
              settingsActive ? "text-white" : "text-[var(--text-sidebar)]"
            }`}
          >
            Settings
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/logout")}
          className={`group/link flex w-full items-center p-3 transition-all hover:bg-red-500/25 ${
            isExpanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
          }`}
        >
          <LogOut className="h-6 w-6 min-w-[24px] text-red-400 transition-colors group-hover/link:text-white" />
          <span className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none text-[var(--text-sidebar)] transition-all group-hover/link:text-white ${isExpanded ? "block opacity-100" : "hidden opacity-0"}`}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
