import type { ReactNode } from "react";
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
}: DefaultLayoutProps) => (
  <div className="flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-white">
    <DashboardNavbar role={role} onPrimaryAction={onPrimaryAction} onProfileClick={onProfileClick} />

    <div className="flex flex-1 overflow-hidden">
      <DashboardSidebar role={role} active={activeSection} onChange={onSectionChange} />
      <main className={`flex-grow overflow-y-auto transition-all duration-500 ${contentClassName}`}>
        {children}
      </main>
    </div>
  </div>
);

export default DefaultLayout;
