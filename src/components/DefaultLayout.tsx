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

        <main
          className={`relative min-w-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${contentClassName}`}
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(234,88,12,0.05) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 15%, rgba(234,88,12,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 85%, rgba(234,88,12,0.04) 0%, transparent 60%), #050505",
          }}
        >{/* Diagonal crosshatch */}
          {/* Square grid lines */}
          <div
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(234,88,12,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.06) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DefaultLayout;
