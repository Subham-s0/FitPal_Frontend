import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building2, Search, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "@/features/auth/hooks";
import { getMyProfileApi } from "@/features/profile/api";
import { profileQueryKeys } from "@/features/profile/queryKeys";
import { getAdminGymStatusCountsApi } from "@/features/admin/admin-gym.api";
import { getGymPayoutBatchesApi } from "@/features/admin/admin-settlement.api";
import {
  getDashboardPrimaryActionLabel,
  getDashboardRoleBadgeLabel,
  getDashboardRole,
  getDashboardRoleLabel,
  getDashboardSearchPlaceholder,
  getDisplayNameFromEmail,
} from "./dashboard-shell-config";

interface DashboardNavbarProps {
  role?: string | null;
  onPrimaryAction?: () => void;
  onProfileClick?: () => void;
  onPendingGymsClick?: () => void;
}

const DashboardNavbar = ({ role, onPrimaryAction, onProfileClick, onPendingGymsClick }: DashboardNavbarProps) => {
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
  const fallbackAvatarUrl = useMemo(
    () => `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=111&color=fb923c`,
    [displayName]
  );

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
  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => {
    setPhotoBroken(false);
  }, [profilePhotoUrl]);

  const avatarUrl = profilePhotoUrl && !photoBroken ? profilePhotoUrl : fallbackAvatarUrl;
  const logoHref = dashboardRole === "ADMIN" ? "/admin/dashboard" : "/";

  const handlePendingGymsClick = () => {
    if (onPendingGymsClick) {
      onPendingGymsClick();
      return;
    }
    navigate("/admin/dashboard", { state: { activeSection: "gyms", filterPending: true } });
  };

  const handlePendingPayoutBatchesClick = () => {
    navigate("/dashboard", { state: { activeSection: "revenue" } });
  };

  const handlePrimaryAction = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
      return;
    }

    if (dashboardRole === "GYM") {
      navigate("/dashboard", { state: { activeSection: "gymProfile" } });
      return;
    }

    if (dashboardRole === "ADMIN") {
      navigate("/admin/dashboard", { state: { activeSection: "users" } });
      return;
    }

    navigate("/dashboard", { state: { activeSection: "gyms" } });
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
      return;
    }

    if (dashboardRole === "GYM") {
      navigate("/dashboard", { state: { activeSection: "gymProfile" } });
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
        <a href={logoHref} className="group flex shrink-0 items-center gap-2">
          <img src="/logo.svg" alt="FitPal Logo" className="h-10 w-10 shrink-0 md:h-12 md:w-12" />
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white">
              <span className="text-gradient-fire">Fit</span>Pal
            </span>
            {showRoleMeta && (
              <span className="hidden rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300/80 sm:inline-flex">
                {roleBadgeLabel}
              </span>
            )}
          </div>
        </a>
      </div>

      <div className="mx-12 hidden max-w-md flex-grow md:block">
        <div className="group relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-orange-600" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-[#2a2a2a] bg-[#141414] py-2.5 pl-11 pr-4 text-sm text-white outline-none transition-colors focus:border-orange-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="group relative rounded-full p-2 transition-colors hover:bg-[#1a1a1a]">
          <Bell className="h-6 w-6 text-gray-400 transition-colors group-hover:text-orange-600" />
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-orange-600" />
        </button>

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

        <button
          type="button"
          className="flex cursor-pointer items-center gap-4 transition-opacity hover:opacity-80"
          onClick={handleProfileClick}
        >
          <div className="hidden text-right leading-none text-white sm:block">
            <p className="text-sm font-black tracking-tight">{displayName}</p>
            {showRoleMeta && (
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-orange-600">
                {roleLabel}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full border-2 border-orange-600 p-0.5">
            <img
              src={avatarUrl}
              className="h-full w-full rounded-full object-cover"
              alt={displayName}
              onError={() => {
                if (profilePhotoUrl && avatarUrl === profilePhotoUrl) {
                  setPhotoBroken(true);
                }
              }}
            />
          </div>
        </button>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
