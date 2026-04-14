import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Building2,
  ClipboardList,
  Dumbbell,
  FileText,
  Gem,
  MessageSquare,
  QrCode,
  Settings,
  Star,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import { getAdminGymStatusCountsApi } from "@/features/admin/admin-gym.api";
import { getGymPayoutBatchesApi } from "@/features/admin/admin-settlement.api";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { getMyProfileApi } from "@/features/profile/api";
import { profileQueryKeys } from "@/features/profile/queryKeys";
import NavbarPageSearch from "@/shared/components/NavbarPageSearch";
import {
  navigateToAdminCms,
  navigateToAdminDashboardSection,
  navigateToCheckInView,
  navigateToDashboardSectionForRole,
  navigateToUserDashboardSection,
} from "@/shared/navigation/dashboard-navigation";
import {
  getDashboardNavItems,
  getDashboardPrimaryActionLabel,
  getDashboardRole,
  getDashboardRoleBadgeLabel,
  getDashboardRoleLabel,
  getDashboardSearchPlaceholder,
  getDisplayNameFromEmail,
} from "./dashboard-shell-config";
import { DashboardBrandLink, DashboardIdentityButton } from "./DashboardShellPrimitives";

interface DashboardNavbarProps {
  role?: string | null;
  onPrimaryAction?: () => void;
  onProfileClick?: () => void;
  onPendingGymsClick?: () => void;
}

const DashboardNavbar = ({
  role,
  onPrimaryAction,
  onProfileClick,
  onPendingGymsClick,
}: DashboardNavbarProps) => {
  const navigate = useNavigate();
  const auth = useAuthState();
  const roleValue = role ?? auth.role;
  const dashboardRole = getDashboardRole(roleValue);
  const displayName = getDisplayNameFromEmail(auth.email, roleValue);
  const roleBadgeLabel = getDashboardRoleBadgeLabel(roleValue);
  const roleLabel = getDashboardRoleLabel(roleValue);
  const primaryActionLabel = getDashboardPrimaryActionLabel(roleValue);
  const searchPlaceholder = getDashboardSearchPlaceholder(roleValue);
  const isUserDashboard = dashboardRole === "USER";
  const isAdminDashboard = dashboardRole === "ADMIN";
  const isGymDashboard = dashboardRole === "GYM";
  const showRoleMeta = !isUserDashboard;

  const profileQuery = useQuery({
    queryKey: profileQueryKeys.user(),
    queryFn: getMyProfileApi,
    enabled: isUserDashboard && Boolean(auth.accessToken),
    staleTime: 60_000,
  });

  const pendingGymsQuery = useQuery({
    queryKey: ["admin-gym-counts"],
    queryFn: getAdminGymStatusCountsApi,
    enabled: isAdminDashboard && Boolean(auth.accessToken),
    staleTime: 30_000,
  });

  const pendingPayoutBatchesQuery = useQuery({
    queryKey: ["gym-payout-batches", "pending-count"],
    queryFn: () =>
      getGymPayoutBatchesApi({
        status: "GYM_REVIEW_PENDING",
        page: 0,
        size: 1,
      }),
    enabled: isGymDashboard && Boolean(auth.accessToken),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const pendingGymsCount = pendingGymsQuery.data?.pendingReview ?? 0;
  const pendingPayoutBatchesCount = pendingPayoutBatchesQuery.data?.totalItems ?? 0;
  const profilePhotoUrl = profileQuery.data?.profileImageUrl?.trim() || null;
  const logoHref = dashboardRole === "ADMIN" ? "/admin/dashboard" : "/";

  const dashboardSearchItems = [
    ...getDashboardNavItems(roleValue).map((item) => ({
      id: item.id,
      label: item.label,
      description: `${item.label} section`,
      keywords: [item.id, item.label, "page", "dashboard"],
      icon: item.icon,
      onSelect: () => navigateToDashboardSectionForRole(navigate, roleValue, item.id),
    })),
    ...(dashboardRole === "GYM"
      ? [
          {
            id: "gymProfile",
            label: "Gym Profile",
            description: "Manage gym details, branding, and onboarding data.",
            keywords: ["profile", "gym", "manage"],
            icon: Building2,
            onSelect: () => navigateToUserDashboardSection(navigate, "gymProfile"),
          },
          {
            id: "settings",
            label: "Settings",
            description: "Open gym configuration and device preferences.",
            keywords: ["settings", "preferences", "config"],
            icon: Settings,
            onSelect: () => navigateToUserDashboardSection(navigate, "settings"),
          },
        ]
      : []),
    ...(dashboardRole === "ADMIN"
      ? [
          {
            id: "settings",
            label: "Settings",
            description: "Open admin platform settings and automation tools.",
            keywords: ["settings", "preferences", "config", "tools"],
            icon: Settings,
            onSelect: () => navigateToAdminDashboardSection(navigate, "settings"),
          },
          {
            id: "cms",
            label: "CMS Management",
            description: "Open the website content manager for the marketing pages.",
            keywords: ["cms", "content", "marketing", "website", "home page"],
            icon: FileText,
            onSelect: () => navigateToAdminCms(navigate),
          },
          {
            id: "cms-features",
            label: "CMS Features",
            description: "Jump into the feature cards shown on the public home page.",
            keywords: ["cms", "features", "home features", "marketing sections"],
            icon: Zap,
            onSelect: () => navigateToAdminCms(navigate, "features"),
          },
          {
            id: "cms-testimonials",
            label: "CMS Testimonials",
            description: "Manage approved testimonials for the public landing page.",
            keywords: ["cms", "testimonials", "reviews", "social proof"],
            icon: Star,
            onSelect: () => navigateToAdminCms(navigate, "testimonials"),
          },
          {
            id: "cms-how-it-works",
            label: "CMS How It Works",
            description: "Edit the public walkthrough and onboarding steps.",
            keywords: ["cms", "how it works", "guide", "steps", "walkthrough"],
            icon: BookOpen,
            onSelect: () => navigateToAdminCms(navigate, "how-to"),
          },
          {
            id: "cms-stats",
            label: "CMS Stats Bar",
            description: "Update the public stat highlights shown on the marketing page.",
            keywords: ["cms", "stats", "stats bar", "numbers", "metrics"],
            icon: Dumbbell,
            onSelect: () => navigateToAdminCms(navigate, "stats"),
          },
          {
            id: "cms-faqs",
            label: "CMS FAQs",
            description: "Open the frequently asked questions content block.",
            keywords: ["cms", "faqs", "faq", "questions", "answers"],
            icon: MessageSquare,
            onSelect: () => navigateToAdminCms(navigate, "faqs"),
          },
        ]
      : []),
    ...(dashboardRole === "USER"
      ? [
          {
            id: "notifications",
            label: "Notifications",
            description: "Review unread alerts and platform activity.",
            keywords: ["notifications", "alerts", "inbox"],
            icon: Bell,
            onSelect: () => navigateToUserDashboardSection(navigate, "notifications"),
          },
          {
            id: "checkin-scanner",
            label: "Check-In",
            description: "Open the QR scanner and live check-in flow.",
            keywords: ["check in", "scanner", "qr", "scan"],
            icon: QrCode,
            onSelect: () => navigateToCheckInView(navigate, "scanner"),
          },
          {
            id: "checkin-logs",
            label: "Check-In Logs",
            description: "Open your visit history and previous check-in records.",
            keywords: ["check in logs", "logs", "history", "visits"],
            icon: ClipboardList,
            onSelect: () => navigateToCheckInView(navigate, "logs"),
          },
          {
            id: "membership",
            label: "Membership",
            description: "Compare plans and manage subscription details.",
            keywords: ["membership", "subscription", "plan", "billing"],
            icon: Gem,
            onSelect: () => navigate("/membership"),
          },
          {
            id: "profile",
            label: "Profile",
            description: "View your account and personal profile information.",
            keywords: ["profile", "account", "me"],
            icon: User,
            onSelect: () => navigate("/profile"),
          },
          {
            id: "settings",
            label: "Settings",
            description: "Open account settings, security, and preferences.",
            keywords: ["settings", "security", "preferences"],
            icon: Settings,
            onSelect: () => navigate("/settings"),
          },
        ]
      : []),
  ];

  const handlePendingGymsClick = () => {
    if (onPendingGymsClick) {
      onPendingGymsClick();
      return;
    }

    navigateToAdminDashboardSection(navigate, "gyms", { filterPending: true });
  };

  const handlePendingPayoutBatchesClick = () => {
    navigateToUserDashboardSection(navigate, "revenue");
  };

  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }

    if (dashboardRole === "GYM") {
      navigateToUserDashboardSection(navigate, "gymProfile");
      return;
    }

    if (dashboardRole === "ADMIN") {
      navigateToAdminDashboardSection(navigate, "users");
      return;
    }

    navigateToUserDashboardSection(navigate, "gyms");
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
      return;
    }

    if (dashboardRole === "GYM") {
      navigateToUserDashboardSection(navigate, "gymProfile");
      return;
    }

    if (dashboardRole === "ADMIN") {
      navigate("/admin/dashboard");
      return;
    }

    navigate("/profile");
  };

  return (
    <nav className="sticky top-0 z-50 flex h-20 w-full items-center justify-between border-b border-[#1f1f1f] bg-[#0f0f0f] px-8">
      <div className="flex items-center gap-2">
        <DashboardBrandLink href={logoHref} badgeLabel={roleBadgeLabel} showBadge={showRoleMeta} />
      </div>

      <div className="mx-12 hidden max-w-md flex-grow md:block">
        <NavbarPageSearch
          items={dashboardSearchItems}
          placeholder={searchPlaceholder}
          emptyLabel="No dashboard pages match that search."
        />
      </div>

      <div className="flex items-center gap-6">
        <NotificationBell />

        {isAdminDashboard ? (
          <button
            type="button"
            onClick={handlePendingGymsClick}
            className="flex items-center gap-2 rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.1)] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-orange-500 backdrop-blur-xl transition-all hover:border-orange-500 hover:bg-orange-600 hover:text-white"
          >
            <Building2 className="h-4 w-4" />
            <span>Pending Gyms</span>
            <span className="text-[10px] font-black text-orange-500">
              {pendingGymsCount > 99 ? "99+" : pendingGymsCount}
            </span>
          </button>
        ) : isGymDashboard ? (
          <button
            type="button"
            onClick={handlePendingPayoutBatchesClick}
            className="flex items-center gap-2 rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.1)] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-orange-500 backdrop-blur-xl transition-all hover:border-orange-500 hover:bg-orange-600 hover:text-white"
          >
            <Wallet className="h-4 w-4" />
            <span>Pending</span>
            <span className="text-[10px] font-black text-orange-500">
              {pendingPayoutBatchesCount > 99 ? "99+" : pendingPayoutBatchesCount}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePrimaryAction}
            className={`transition-all duration-300 ${
              isUserDashboard
                ? "rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.1)] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-orange-500 backdrop-blur-xl hover:border-orange-500 hover:bg-orange-600 hover:text-white"
                : "rounded-lg border border-orange-500 bg-orange-600 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-500"
            }`}
          >
            {primaryActionLabel}
          </button>
        )}

        <div className="h-10 w-px bg-[#252525]" />

        <DashboardIdentityButton
          displayName={displayName}
          metaLabel={showRoleMeta ? roleLabel : undefined}
          primaryImageUrl={profilePhotoUrl}
          email={auth.email}
          role={roleValue}
          onClick={handleProfileClick}
        />
      </div>
    </nav>
  );
};

export default DashboardNavbar;
