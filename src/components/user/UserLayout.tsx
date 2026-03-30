import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { useAuthState } from "@/hooks/useAuth";
import { getDisplayNameFromEmail } from "@/components/dashboard-shell-config";

export interface UserLayoutSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

// Desktop sidebar nav items (matches original MEMBER_NAV_ITEMS)
const DESKTOP_NAV_ITEMS: UserLayoutSection[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "gyms", label: "Gyms", icon: Building2 },
  { id: "routines", label: "Routines", icon: ClipboardList },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
  { id: "workouts", label: "Workouts", icon: Activity },
];

// Mobile drawer nav items (extended for mobile UX)
const MOBILE_DRAWER_ITEMS: UserLayoutSection[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "checkin", label: "Check-In", icon: CheckCircle2 },
  { id: "gyms", label: "Gyms", icon: Building2 },
  { id: "routines", label: "Routines", icon: ClipboardList },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
  { id: "workouts", label: "Workouts", icon: Activity },
  { id: "profile", label: "Profile", icon: User },
];

// Mobile bottom nav items (subset for compact display)
const MOBILE_NAV_ITEMS: UserLayoutSection[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "gyms", label: "Gyms", icon: Building2 },
  // Check-in is the center FAB
  { id: "workouts", label: "Workouts", icon: Activity },
  { id: "profile", label: "Profile", icon: User },
];

interface UserLayoutProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: ReactNode;
  contentClassName?: string;
  contentMode?: "default" | "immersive";
}

const UserLayout = ({
  activeSection,
  onSectionChange,
  children,
  contentClassName = "",
  contentMode = "default",
}: UserLayoutProps) => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const displayName = getDisplayNameFromEmail(auth.email, "USER");
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111&color=fb923c`;

  const handleNavigation = (id: string) => {
    if (id === "profile") {
      navigate("/profile");
      return;
    }
    onSectionChange(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="user-app flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-white">
      {/* TOPBAR */}
      <header className="user-topbar sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-[#1f1f1f] bg-[rgba(15,15,15,0.92)] px-4 backdrop-blur-xl md:h-20 md:px-8">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="mobile-menu-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-none bg-white/[0.06] text-white md:hidden"
          >
            <Menu size={20} />
          </button>
          <a href="/dashboard" className="flex items-center gap-2 no-underline">
            <img src="/logo.svg" alt="FitPal Logo" className="h-8 w-8 shrink-0 md:h-10 md:w-10" />
            <span className="text-xl font-bold text-white md:text-2xl">
              <span className="text-gradient-fire">Fit</span>Pal
            </span>
          </a>
        </div>

        {/* Desktop search */}
        <div className="desktop-only mx-12 hidden w-full max-w-[420px] md:block">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search routines..."
              className="w-full rounded-full border border-[#2a2a2a] bg-[#141414] py-2.5 pl-11 pr-4 font-sans text-sm text-white outline-none transition-colors focus:border-orange-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full border-none bg-transparent p-2"
          >
            <Bell size={20} className="text-gray-400 md:h-6 md:w-6" />
            <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-orange-600" />
          </button>

          {/* Desktop Check In button */}
          <button
            type="button"
            onClick={() => handleNavigation("checkin")}
            className="desktop-only hidden rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-orange-600 shadow-none transition-all hover:border-orange-500 hover:bg-orange-600 hover:text-white md:flex"
          >
            Check In
          </button>

          {/* Desktop divider */}
          <div className="desktop-only hidden h-10 w-px bg-[#252525] md:block" />

          {/* Desktop profile */}
          <button
            type="button"
            onClick={() => handleNavigation("profile")}
            className="desktop-only hidden items-center gap-3 border-none bg-transparent text-white md:flex"
          >
            <div className="text-right">
              <p className="text-sm font-black leading-none">{displayName}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-orange-600">
                Pro Member
              </p>
            </div>
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-orange-600 p-0.5">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </button>

          {/* Mobile avatar */}
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-orange-600 p-0.5 md:hidden"
            onClick={() => handleNavigation("profile")}
          >
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER OVERLAY */}
      <div
        className={`mobile-drawer-overlay fixed inset-0 z-[200] bg-black/65 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* MOBILE DRAWER */}
      <div
        className={`mobile-drawer fixed left-0 top-0 z-[201] flex h-[100dvh] w-[min(300px,82vw)] flex-col overflow-hidden border-r border-white/[0.08] bg-[#0d0d0d] transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header with profile */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] px-5 pb-4 pt-5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-orange-600 p-0.5">
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="overflow-hidden text-ellipsis text-sm font-black leading-none text-white">
              {displayName}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-600">
              Pro Member
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="shrink-0 border-none bg-transparent p-1 text-white/40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <p className="mb-1 px-3.5 pb-1 pt-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
            Navigation
          </p>
          {MOBILE_DRAWER_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleNavigation(id)}
              className={`mb-0.5 flex w-full items-center gap-3 rounded-xl border-none bg-transparent px-3.5 py-3.5 text-left font-sans text-[13px] font-bold text-white/65 transition-all hover:bg-white/[0.06] ${
                activeSection === id ? "bg-orange-500/[0.08] text-orange-500" : ""
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </button>
          ))}
          <div className="mx-3 my-2 h-px bg-white/[0.06]" />
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border-none bg-transparent px-3.5 py-3.5 text-left font-sans text-[13px] font-bold text-white/65 transition-all hover:bg-white/[0.06]"
          >
            <Settings size={17} className="shrink-0" />
            Settings
          </button>
        </nav>

        {/* Drawer footer */}
        <div className="shrink-0 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => navigate("/logout")}
            className="flex w-full items-center gap-3 rounded-xl border-none bg-transparent px-3.5 py-3.5 font-sans text-[13px] font-bold text-red-400 transition-all hover:bg-red-500/[0.08]"
          >
            <LogOut size={17} className="shrink-0" />
            Log Out
          </button>
        </div>
      </div>

      {/* SHELL */}
      <div
        className="user-shell flex flex-1 overflow-hidden"
      >
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`desktop-sidebar z-40 hidden h-full shrink-0 flex-col overflow-hidden border-r border-[var(--border-default)] bg-[var(--surface-sidebar)] transition-[width,padding] duration-300 md:flex ${
            isSidebarExpanded ? "w-72 p-4" : "w-16 p-2"
          }`}
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
        >
          <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {DESKTOP_NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigation(id)}
                  className={`nav-item flex w-full items-center p-3 transition-all hover:bg-orange-600 ${
                    isSidebarExpanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
                  } ${isActive ? "bg-orange-600" : ""}`}
                >
                  <Icon
                    size={24}
                    className={`min-w-[24px] ${isActive ? "text-black" : "text-[var(--text-sidebar)]"}`}
                  />
                  <span
                    className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none transition-opacity ${
                      isSidebarExpanded ? "block opacity-100" : "hidden opacity-0"
                    } ${isActive ? "text-black" : "text-[var(--text-sidebar)]"}`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={`group/link flex w-full items-center p-3 transition-all hover:bg-orange-600 ${
                isSidebarExpanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
              }`}
            >
              <Settings size={24} className="min-w-[24px] text-[var(--text-sidebar)]" />
              <span
                className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none text-[var(--text-sidebar)] transition-opacity ${
                  isSidebarExpanded ? "block opacity-100" : "hidden opacity-0"
                }`}
              >
                Settings
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/logout")}
              className={`group/link flex w-full items-center p-3 transition-all hover:bg-red-500/25 ${
                isSidebarExpanded ? "justify-start rounded-2xl" : "justify-center rounded-full"
              }`}
            >
              <LogOut size={24} className="min-w-[24px] text-red-400 transition-colors group-hover/link:text-white" />
              <span
                className={`ml-4 whitespace-nowrap text-[13px] font-bold leading-none text-[var(--text-sidebar)] transition-all group-hover/link:text-white ${
                  isSidebarExpanded ? "block opacity-100" : "hidden opacity-0"
                }`}
              >
                Logout
              </span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main
          className={`main-content relative flex-1 min-w-0 overflow-x-hidden ${
            contentMode === "immersive" ? "overflow-y-hidden" : "overflow-y-auto scroll-smooth"
          }`}
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(234,88,12,0.05) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 50% 15%, rgba(234,88,12,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 85%, rgba(234,88,12,0.04) 0%, transparent 60%), #050505",
            ...({ // Provide root variables for mobile spacing
              "--mobile-bottom-dock-height": activeSection === "gyms" || activeSection === "exercises" ? "52px" : "80px",
              "--mobile-safe-bottom": "env(safe-area-inset-bottom)",
            } as CSSProperties),
          }}
        >
          {contentMode !== "immersive" && (
            <div
              className="pointer-events-none fixed inset-0 z-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(234,88,12,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(234,88,12,0.06) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          )}

          <div
            className={`main-content-inner relative z-10 ${
              contentMode === "immersive"
                ? "h-full max-w-none px-0 py-0"
                : "mx-auto max-w-[1400px] px-4 py-5 md:px-8 md:py-9 md:pb-20"
            } ${contentClassName}`}
            style={{
              paddingBottom:
                contentMode === "immersive"
                  ? undefined
                  : `calc(${activeSection === "gyms" || activeSection === "exercises" ? "72px" : "96px"} + env(safe-area-inset-bottom))`,
            }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div 
        className={`bottom-nav pointer-events-none fixed left-1/2 z-[100] w-[calc(100vw-24px)] max-w-[460px] -translate-x-1/2 md:hidden transition-all duration-300 ${
          activeSection === "gyms" || activeSection === "exercises" ? "bottom-[env(safe-area-inset-bottom)]" : "bottom-[max(16px,env(safe-area-inset-bottom))]"
        }`}
      >
        <div className="bottom-nav-inner pointer-events-auto relative w-full rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.55)]">
          {/* Background with notch cutout */}
          <div
            className="bottom-nav-bg absolute left-0 top-0 z-[-1] h-full w-full rounded-full bg-[rgb(18,18,20)]"
            style={{
              maskImage: activeSection === "gyms" || activeSection === "exercises" 
                ? "radial-gradient(circle at 50% 6px, transparent 30px, black 31px)"
                : "radial-gradient(circle at 50% 10px, transparent 36px, black 37px)",
              WebkitMaskImage: activeSection === "gyms" || activeSection === "exercises"
                ? "radial-gradient(circle at 50% 6px, transparent 30px, black 31px)"
                : "radial-gradient(circle at 50% 10px, transparent 36px, black 37px)",
              filter:
                "drop-shadow(0 -1px 0 rgba(255,255,255,0.1)) drop-shadow(0 1px 0 rgba(255,255,255,0.1)) drop-shadow(-1px 0 0 rgba(255,255,255,0.1)) drop-shadow(1px 0 0 rgba(255,255,255,0.1))",
            }}
          />

          {/* Nav content */}
          <div className={`bottom-nav-content flex w-full items-center justify-between px-3 ${
            activeSection === "gyms" || activeSection === "exercises" ? "py-0.5" : "py-1.5"
          }`}>
            {/* Left items */}
            {MOBILE_NAV_ITEMS.slice(0, 2).map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigation(id)}
                className={`bnav-item flex shrink-0 items-center justify-center rounded-full border-none bg-transparent transition-all ${
                  activeSection === "gyms" || activeSection === "exercises" ? "h-[48px] w-[48px]" : "h-12 w-12 min-h-[48px] min-w-[48px]"
                } ${
                  activeSection === id ? "bg-orange-500/[0.12] text-orange-500" : "text-white/40 hover:text-orange-500"
                }`}
              >
                <Icon size={activeSection === "gyms" || activeSection === "exercises" ? 20 : 22} />
              </button>
            ))}

            {/* Center FAB wrapper */}
            <div className={`checkin-fab-wrap relative shrink-0 transition-all ${
              activeSection === "gyms" || activeSection === "exercises" ? "h-[48px] w-[48px]" : "h-[52px] w-[52px]"
            }`}>
              <button
                type="button"
                onClick={() => handleNavigation("checkin")}
                className={`checkin-fab absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border-none bg-transparent p-0 transition-all ${
                  activeSection === "gyms" || activeSection === "exercises" ? "top-[-18px] h-[52px] w-[52px]" : "top-[-26px] h-[60px] w-[60px]"
                } ${activeSection === "checkin" ? "active" : ""}`}
              >
                <div
                  className={`checkin-fab-inner flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-[1.08] active:scale-[0.92] ${
                    activeSection === "gyms" || activeSection === "exercises" ? "h-[52px] w-[52px]" : "h-[60px] w-[60px]"
                  }`}
                  style={{
                    background: "linear-gradient(135deg, #FACC15 0%, #FF9900 45%, #FF6A00 100%)",
                  }}
                >
                  <QrCode size={activeSection === "gyms" || activeSection === "exercises" ? 22 : 26} className="text-black" />
                </div>
              </button>
            </div>

            {/* Right items */}
            {MOBILE_NAV_ITEMS.slice(2).map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigation(id)}
                className={`bnav-item flex shrink-0 items-center justify-center rounded-full border-none bg-transparent transition-all ${
                  activeSection === "gyms" || activeSection === "exercises" ? "h-[48px] w-[48px]" : "h-12 w-12 min-h-[48px] min-w-[48px]"
                } ${
                  activeSection === id ? "bg-orange-500/[0.12] text-orange-500" : "text-white/40 hover:text-orange-500"
                }`}
              >
                <Icon size={activeSection === "gyms" || activeSection === "exercises" ? 20 : 22} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
