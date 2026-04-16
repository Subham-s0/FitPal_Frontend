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
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

const DashboardSidebar = ({ 
  role, 
  active, 
  onChange, 
  expanded, 
  onExpandedChange,
  isMobileMenuOpen,
  setIsMobileMenuOpen
}: SidebarProps) => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const roleValue = role ?? auth.role;
  const navItems = getDashboardNavItems(roleValue);
  const dashboardRole = getDashboardRole(roleValue);
  
  // On desktop we handle expansion via internal state or prop.
  // On mobile, the "expanded" state relates strictly to the off-canvas menu being open.
  const isExpanded = isMobileMenuOpen || (expanded ?? internalExpanded);
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
      className={`z-40 flex h-full flex-col overflow-hidden border-r border-[#1f1f1f] bg-[#0a0a0a] transition-all duration-300 absolute md:relative ${
        isMobileMenuOpen ? "w-72 p-4 translate-x-0" : "w-72 md:w-16 p-4 md:p-2 -translate-x-full md:translate-x-0" 
      } ${
        (!isMobileMenuOpen && isExpanded) ? "md:w-72 md:p-4" : ""
      }`}
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
