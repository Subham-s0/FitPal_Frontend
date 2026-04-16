import { useState, type ReactNode } from "react";
import DashboardNavbar from "./DashboardNavbar";
import DashboardSidebar from "./DashboardSidebar";
import { DashboardGridBackdrop } from "./DashboardShellPrimitives";

interface DefaultLayoutProps {
  role: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: ReactNode;
  contentClassName?: string;
  onPrimaryAction?: () => void;
  onProfileClick?: () => void;
  onPendingGymsClick?: () => void;
}

const DefaultLayout = ({
  role,
  activeSection,
  onSectionChange,
  children,
  contentClassName = "p-6",
  onPrimaryAction,
  onProfileClick,
  onPendingGymsClick,
}: DefaultLayoutProps) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const roleClassName = `dashboard-shell--${role.toLowerCase()}`;

  return (
    <div className={`dashboard-shell ${roleClassName} flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-white`}>
      <DashboardNavbar 
        role={role} 
        onPrimaryAction={onPrimaryAction} 
        onProfileClick={onProfileClick} 
        onPendingGymsClick={onPendingGymsClick} 
        onMobileMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div
        className="flex md:grid flex-1 overflow-hidden transition-[grid-template-columns] duration-300 relative"
        style={{
          gridTemplateColumns: isSidebarExpanded ? "18rem minmax(0, 1fr)" : "4rem minmax(0, 1fr)",
        }}
      >
        <DashboardSidebar
          role={role}
          active={activeSection}
          onChange={(section) => {
            onSectionChange(section);
            setIsMobileMenuOpen(false);
          }}
          expanded={isSidebarExpanded}
          onExpandedChange={setIsSidebarExpanded}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Mobile menu overlay backdrop */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <DashboardGridBackdrop className={`dashboard-shell__content transition-all duration-300 flex-1 min-w-0 ${contentClassName}`}>
          {children}
        </DashboardGridBackdrop>
      </div>
    </div>
  );
};

export default DefaultLayout;
