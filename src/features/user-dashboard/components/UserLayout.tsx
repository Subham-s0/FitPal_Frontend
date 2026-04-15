import { useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useAuthState } from "@/features/auth/hooks";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { ActiveSessionBar } from "@/features/workout-sessions/components/ActiveSessionBar";
import NavbarPageSearch from "@/shared/components/NavbarPageSearch";
import { resolveDisplayName } from "@/shared/lib/avatar";
import {
  DashboardBrandLink,
  DashboardGridBackdrop,
  DashboardIdentityButton,
  DashboardSidebarNavButton,
} from "@/shared/layout/dashboard-shell";
import { navigateToCheckInView } from "@/shared/navigation/dashboard-navigation";

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
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "membership", label: "Membership", icon: Gem },
];

// Mobile drawer nav items (extended for mobile UX)
const MOBILE_DRAWER_ITEMS: UserLayoutSection[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "checkin", label: "Check-In", icon: CheckCircle2 },
  { id: "gyms", label: "Gyms", icon: Building2 },
  { id: "routines", label: "Routines", icon: ClipboardList },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
  { id: "workouts", label: "Workouts", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "membership", label: "Membership", icon: Gem },
  { id: "profile", label: "Profile", icon: User },
];

// Mobile bottom nav side items (center check-in stays a FAB)
const MOBILE_BOTTOM_NAV_ITEMS: UserLayoutSection[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "gyms", label: "Gyms", icon: Building2 },
  { id: "routines", label: "Routines", icon: ClipboardList },
  { id: "exercises", label: "Exercises", icon: Dumbbell },
];

const MOBILE_BOTTOM_NAV_IDS = new Set([
  ...MOBILE_BOTTOM_NAV_ITEMS.map((item) => item.id),
  "checkin",
]);

const COMPACT_MOBILE_BOTTOM_DOCK_SECTIONS = new Set([
  "gyms",
  "routines",
  "exercises",
  "checkin",
  "profile",
  "settings",
  "membership",
  "notifications",
  "workouts",
]);

function resolveMobileBottomNavActiveSection(activeSection: string) {
  if (activeSection === "new-routine" || activeSection === "workouts") {
    return "routines";
  }

  if (activeSection === "progress") {
    return "home";
  }

  return MOBILE_BOTTOM_NAV_IDS.has(activeSection) ? activeSection : null;
}

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

  const displayName = resolveDisplayName({ email: auth.email, role: "USER" });
  const activeMobileBottomSection = resolveMobileBottomNavActiveSection(activeSection);
  const isCompactBottomDock = COMPACT_MOBILE_BOTTOM_DOCK_SECTIONS.has(activeSection);
  const bottomDockBottom = isCompactBottomDock
    ? "max(0px, env(safe-area-inset-bottom))"
    : "max(16px, env(safe-area-inset-bottom))";
  const bottomDockWidth = isCompactBottomDock ? "100vw" : "calc(100vw - 24px)";
  const bottomDockMaxWidth = isCompactBottomDock ? "100vw" : "460px";
  const bottomDockShadow = isCompactBottomDock
    ? "0 -10px 30px rgba(0,0,0,0.35)"
    : "0 8px 32px rgba(0,0,0,0.55)";
  const checkInFabTransform = isCompactBottomDock
    ? "translate(-50%, -50%)"
    : "translate(-50%, calc(-50% - 26px))";
  const checkInFabOuterSize = isCompactBottomDock ? 52 : 60;
  const checkInFabInnerSize = isCompactBottomDock ? 42 : 60;
  const bottomDockMotionClass = "duration-500 ease-out";
  const bottomDockButtonSizeClass = isCompactBottomDock
    ? "h-[52px] w-[52px]"
    : "h-12 w-12 min-h-[48px] min-w-[48px]";
  const bottomDockActiveSurfaceClass = isCompactBottomDock
    ? "h-[42px] w-[42px]"
    : "h-full w-full";
  const bottomDockIconSize = isCompactBottomDock ? 20 : 22;
  const checkInIconSize = isCompactBottomDock ? 20 : 26;

  const handleNavigation = (id: string) => {
    if (id === "membership") {
      navigate("/membership");
      setIsMobileMenuOpen(false);
      return;
    }
    if (id === "profile") {
      navigate("/profile");
      return;
    }
    onSectionChange(id);
    setIsMobileMenuOpen(false);
  };

  const userPageSearchItems = [
    {
      id: "home",
      label: "Dashboard",
      description: "Open your overview, progress, and membership snapshot.",
      keywords: ["home", "overview", "progress"],
      icon: LayoutDashboard,
      onSelect: () => handleNavigation("home"),
    },
    {
      id: "checkin",
      label: "Check-In",
      description: "Open the scanner and recent visit tools.",
      keywords: ["scan", "scanner", "qr", "check in"],
      icon: CheckCircle2,
      onSelect: () => navigateToCheckInView(navigate, "scanner"),
    },
    {
      id: "checkin-logs",
      label: "Check-In Logs",
      description: "Open your visit history and previous scan results.",
      keywords: ["logs", "history", "check in logs", "visits"],
      icon: ClipboardList,
      onSelect: () => navigateToCheckInView(navigate, "logs"),
    },
    {
      id: "gyms",
      label: "Gyms",
      description: "Browse gyms, saved clubs, and nearby options.",
      keywords: ["gym", "fitness clubs", "discover"],
      icon: Building2,
      onSelect: () => handleNavigation("gyms"),
    },
    {
      id: "routines",
      label: "Routines",
      description: "View workout plans and routine builder screens.",
      keywords: ["routine", "plans", "programs"],
      icon: ClipboardList,
      onSelect: () => handleNavigation("routines"),
    },
    {
      id: "exercises",
      label: "Exercises",
      description: "Search the exercise library and custom movements.",
      keywords: ["exercise", "library", "movements"],
      icon: Dumbbell,
      onSelect: () => handleNavigation("exercises"),
    },
    {
      id: "workouts",
      label: "Workouts",
      description: "Review workout sessions and training history.",
      keywords: ["workouts", "sessions", "history"],
      icon: Activity,
      onSelect: () => handleNavigation("workouts"),
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Review alerts, reminders, and inbox activity.",
      keywords: ["alerts", "inbox", "messages"],
      icon: Bell,
      onSelect: () => handleNavigation("notifications"),
    },
    {
      id: "membership",
      label: "Membership",
      description: "Manage plan details, upgrades, and billing state.",
      keywords: ["subscription", "plan", "billing", "upgrade"],
      icon: Gem,
      onSelect: () => navigate("/membership"),
    },
    {
      id: "payments",
      label: "Payments",
      description: "Open payment history and transaction records.",
      keywords: ["billing", "transactions", "history"],
      icon: Wallet,
      onSelect: () => navigate("/payments"),
    },
    {
      id: "profile",
      label: "Profile",
      description: "View your account details and profile setup data.",
      keywords: ["account", "me", "profile"],
      icon: User,
      onSelect: () => navigate("/profile"),
    },
    {
      id: "settings",
      label: "Settings",
      description: "Open preferences, security, and connected account settings.",
      keywords: ["preferences", "security", "settings"],
      icon: Settings,
      onSelect: () => navigate("/settings"),
    },
  ];

  return (
    <div className="user-app flex h-screen flex-col overflow-hidden bg-[#050505] font-sans text-white">
      {/* TOPBAR */}
      <header className="user-topbar sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-[#1f1f1f] bg-[rgba(15,15,15,0.92)] px-4 backdrop-blur-xl md:h-20 md:px-8">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="mobile-menu-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-none bg-transparent text-white/60 transition-all duration-200 hover:scale-110 hover:text-orange-400 active:scale-90 md:hidden"
          >
            <Menu size={22} strokeWidth={2.5} />
          </button>
          <DashboardBrandLink
            href="/dashboard"
            logoClassName="h-8 w-8 md:h-10 md:w-10"
            className="gap-2"
          />
        </div>

        {/* Desktop search */}
        <div className="desktop-only mx-12 hidden w-full max-w-[420px] md:block">
          <NavbarPageSearch
            items={userPageSearchItems}
            placeholder="Jump to pages..."
            emptyLabel="No member pages match that search."
          />
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Notifications */}
          <NotificationBell
            buttonClassName="rounded-full border-none bg-transparent p-2 hover:bg-transparent"
            iconClassName="h-5 w-5 text-gray-400 md:h-6 md:w-6"
            badgeClassName="right-0 top-0"
          />

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
          <DashboardIdentityButton
            displayName={displayName}
            email={auth.email}
            role="USER"
            metaLabel="Pro Member"
            onClick={() => handleNavigation("profile")}
            className="desktop-only hidden md:flex"
          />

          {/* Mobile avatar */}
          <DashboardIdentityButton
            displayName={displayName}
            email={auth.email}
            role="USER"
            onClick={() => handleNavigation("profile")}
            showText={false}
            avatarClassName="h-9 w-9 md:hidden"
            className="md:hidden"
          />
        </div>
      </header>

      {/* ACTIVE SESSION BAR - Shows when workout is in progress */}
      <ActiveSessionBar />

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
          <DashboardIdentityButton
            displayName={displayName}
            email={auth.email}
            role="USER"
            onClick={() => undefined}
            showText={false}
            className="pointer-events-none cursor-default"
          />
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
            onClick={() => {
              navigate("/settings");
              setIsMobileMenuOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-xl border-none bg-transparent px-3.5 py-3.5 text-left font-sans text-[13px] font-bold transition-all hover:bg-white/[0.06] ${
              activeSection === "settings" ? "bg-orange-500/[0.08] text-orange-500" : "text-white/65"
            }`}
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
      <div className="user-shell flex flex-1 overflow-hidden">
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
                <DashboardSidebarNavButton
                  key={id}
                  onClick={() => handleNavigation(id)}
                  icon={Icon}
                  label={label}
                  active={isActive}
                  expanded={isSidebarExpanded}
                />
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4">
            <DashboardSidebarNavButton
              onClick={() => navigate("/settings")}
              icon={Settings}
              label="Settings"
              active={activeSection === "settings"}
              expanded={isSidebarExpanded}
            />
            <DashboardSidebarNavButton
              onClick={() => navigate("/logout")}
              icon={LogOut}
              label="Logout"
              expanded={isSidebarExpanded}
              danger
            />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <DashboardGridBackdrop
          className={`main-content relative flex-1 min-w-0 overflow-x-hidden ${
            contentMode === "immersive" ? "overflow-y-hidden" : "overflow-y-auto scroll-smooth"
          }`}
          contentClassName="h-full"
          showGrid={contentMode !== "immersive"}
        >
          <div
            className={`main-content-inner relative z-10 ${
              contentMode === "immersive"
                ? "h-full max-w-none px-0 py-0"
                : "mx-auto max-w-[1400px] px-4 py-5 md:px-8 md:py-9 md:pb-20"
            } ${contentClassName}`}
            style={{
              ...({
                "--mobile-bottom-dock-height": isCompactBottomDock ? "68px" : "80px",
                "--mobile-safe-bottom": "env(safe-area-inset-bottom)",
              } as CSSProperties),
              paddingBottom:
                contentMode === "immersive"
                  ? undefined
                  : `calc(${isCompactBottomDock ? "84px" : "96px"} + env(safe-area-inset-bottom))`,
            }}
          >
            {children}
          </div>
        </DashboardGridBackdrop>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div
        className={`bottom-nav pointer-events-none fixed inset-x-0 z-[100] transition-[bottom] will-change-[bottom] md:hidden ${bottomDockMotionClass}`}
        style={{ bottom: bottomDockBottom }}
      >
        <div
          className={`bottom-nav-inner pointer-events-auto relative mx-auto transition-[width,max-width,border-radius,box-shadow] will-change-[width,max-width,border-radius,box-shadow] ${bottomDockMotionClass} ${
            isCompactBottomDock ? "rounded-none" : "rounded-full"
          }`}
          style={{
            width: bottomDockWidth,
            maxWidth: bottomDockMaxWidth,
            boxShadow: bottomDockShadow,
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-[-1]">
            <div
              className={`absolute inset-0 bg-[rgb(18,18,20)] transition-[border-radius,opacity] ${bottomDockMotionClass} ${
                isCompactBottomDock ? "rounded-none opacity-100" : "rounded-full opacity-0"
              }`}
            />
            <div
              className={`absolute inset-0 bg-[rgb(18,18,20)] transition-[border-radius,opacity] ${bottomDockMotionClass} ${
                isCompactBottomDock ? "rounded-none opacity-0" : "rounded-full opacity-100"
              }`}
              style={{
                maskImage:
                  "radial-gradient(circle at 50% 10px, transparent 36px, black 37px)",
                WebkitMaskImage:
                  "radial-gradient(circle at 50% 10px, transparent 36px, black 37px)",
                filter:
                  "drop-shadow(0 -1px 0 rgba(255,255,255,0.1)) drop-shadow(0 1px 0 rgba(255,255,255,0.1)) drop-shadow(-1px 0 0 rgba(255,255,255,0.1)) drop-shadow(1px 0 0 rgba(255,255,255,0.1))",
              }}
            />
            <div
              className={`absolute inset-x-0 top-0 h-px bg-white/[0.08] transition-opacity ${bottomDockMotionClass} ${
                isCompactBottomDock ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          <div
            className={`bottom-nav-content flex w-full items-center justify-between px-3 transition-[padding] ${bottomDockMotionClass} ${
              isCompactBottomDock ? "px-3 py-2" : "py-1.5"
            }`}
          >
            {MOBILE_BOTTOM_NAV_ITEMS.slice(0, 2).map(({ id, icon: Icon }) => {
              const isActive = activeMobileBottomSection === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigation(id)}
                  className={`bnav-item flex shrink-0 items-center justify-center rounded-full border-none bg-transparent transition-[width,height,color] ${bottomDockMotionClass} ${
                    bottomDockButtonSizeClass
                  } ${isActive ? "text-orange-400" : "text-white/40 hover:text-orange-500"}`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full transition-[width,height,background-color,box-shadow] ${bottomDockMotionClass} ${
                      bottomDockActiveSurfaceClass
                    } ${
                      isActive
                        ? "bg-orange-500/[0.12] shadow-[inset_0_0_0_1px_rgba(234,88,12,0.18),0_0_14px_rgba(234,88,12,0.10)]"
                        : ""
                    }`}
                  >
                    <Icon
                      className={`transition-[width,height] ${bottomDockMotionClass}`}
                      style={{ width: `${bottomDockIconSize}px`, height: `${bottomDockIconSize}px` }}
                    />
                  </span>
                </button>
              );
            })}

            <div
              className={`checkin-fab-wrap relative h-[52px] w-[52px] shrink-0 transition-[width,height] will-change-[width,height] ${bottomDockMotionClass}`}
            >
              <button
                type="button"
                onClick={() => handleNavigation("checkin")}
                className={`checkin-fab absolute left-1/2 top-1/2 flex items-center justify-center rounded-full border-none bg-transparent p-0 transition-[transform,width,height] will-change-[transform,width,height] ${bottomDockMotionClass}`}
                style={{
                  width: `${checkInFabOuterSize}px`,
                  height: `${checkInFabOuterSize}px`,
                  transform: checkInFabTransform,
                }}
              >
                <div
                  className={`checkin-fab-inner flex items-center justify-center rounded-full transition-[width,height,box-shadow,transform] ${bottomDockMotionClass} hover:scale-[1.08] active:scale-[0.92] ${
                    activeMobileBottomSection === "checkin"
                      ? isCompactBottomDock
                        ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_14px_rgba(249,115,22,0.18)]"
                        : "shadow-[0_0_0_3px_rgba(255,255,255,0.08),0_0_26px_rgba(249,115,22,0.3)]"
                      : ""
                  }`}
                  style={{
                    width: `${checkInFabInnerSize}px`,
                    height: `${checkInFabInnerSize}px`,
                    background: "linear-gradient(135deg, #FACC15 0%, #FF9900 45%, #FF6A00 100%)",
                  }}
                >
                  {/* QR icon: white for contrast on the orange-yellow gradient */}
                  <QrCode
                    className={`text-white transition-[width,height] ${bottomDockMotionClass}`}
                    style={{ width: `${checkInIconSize}px`, height: `${checkInIconSize}px` }}
                  />
                </div>
              </button>
            </div>

            {MOBILE_BOTTOM_NAV_ITEMS.slice(2).map(({ id, icon: Icon }) => {
              const isActive = activeMobileBottomSection === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNavigation(id)}
                  className={`bnav-item flex shrink-0 items-center justify-center rounded-full border-none bg-transparent transition-[width,height,color] ${bottomDockMotionClass} ${
                    bottomDockButtonSizeClass
                  } ${isActive ? "text-orange-400" : "text-white/40 hover:text-orange-500"}`}
                >
                  <span
                    className={`flex items-center justify-center rounded-full transition-[width,height,background-color,box-shadow] ${bottomDockMotionClass} ${
                      bottomDockActiveSurfaceClass
                    } ${
                      isActive
                        ? "bg-orange-500/[0.12] shadow-[inset_0_0_0_1px_rgba(234,88,12,0.18),0_0_14px_rgba(234,88,12,0.10)]"
                        : ""
                    }`}
                  >
                    <Icon
                      className={`transition-[width,height] ${bottomDockMotionClass}`}
                      style={{ width: `${bottomDockIconSize}px`, height: `${bottomDockIconSize}px` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLayout;
