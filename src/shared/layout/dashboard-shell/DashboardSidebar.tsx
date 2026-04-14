import { useState } from "react";
import {
  LogOut,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import { getDashboardNavItems, getDashboardRole } from "./dashboard-shell-config";
import { DashboardSidebarNavButton } from "./DashboardShellPrimitives";

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
  const settingsActive = active === "settings" || active === "cms";

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
          <DashboardSidebarNavButton
            key={id}
            onClick={() => onChange(id)}
            icon={Icon}
            label={label}
            active={active === id}
            expanded={isExpanded}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4">
        <DashboardSidebarNavButton
          onClick={handleSettings}
          icon={Settings}
          label="Settings"
          active={settingsActive}
          expanded={isExpanded}
        />
        <DashboardSidebarNavButton
          onClick={() => navigate("/logout")}
          icon={LogOut}
          label="Logout"
          expanded={isExpanded}
          danger
        />
      </div>
    </aside>
  );
};

export default DashboardSidebar;
