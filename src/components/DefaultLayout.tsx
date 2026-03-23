import { useState, type ReactNode } from "react";
import DashboardNavbar from "@/components/DashboardNavbar";
import DashboardSidebar from "@/components/DashboardSidebar";

interface DefaultLayoutProps {
  role: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: ReactNode;
  contentClassName?: string;
  onPrimaryAction?: () => void;
  onProfileClick?: () => void;
}

const DefaultLayout = ({
  role,
  activeSection,
  onSectionChange,
  children,
  contentClassName = "p-6",
  onPrimaryAction,
  onProfileClick,
}: DefaultLayoutProps) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-white">
      <DashboardNavbar role={role} onPrimaryAction={onPrimaryAction} onProfileClick={onProfileClick} />

      <div
        className="grid flex-1 overflow-hidden transition-[grid-template-columns] duration-300"
        style={{
          gridTemplateColumns: isSidebarExpanded ? "18rem minmax(0, 1fr)" : "4rem minmax(0, 1fr)",
        }}
      >
        <DashboardSidebar
          role={role}
          active={activeSection}
          onChange={onSectionChange}
          expanded={isSidebarExpanded}
          onExpandedChange={setIsSidebarExpanded}
        />

        <main className={`min-w-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${contentClassName}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DefaultLayout;
