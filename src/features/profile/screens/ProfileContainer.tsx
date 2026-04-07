import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gem, Target, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/shared/api/client";
import { getMyProfileApi } from "@/features/profile/api";
import { profileQueryKeys } from "@/features/profile/queryKeys";
import { getMySubscriptionApi } from "@/features/subscription/api";
import { getPlansApi } from "@/features/plans/api";
import { plansQueryKeys } from "@/features/plans/queryKeys";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import { useAuthState } from "@/features/auth/hooks";
import { authStore } from "@/features/auth/store";
import { cn } from "@/shared/lib/utils";
import { ProfileImageSection } from "@/features/profile/components/ProfileImageSection";
import { ProfileInfoSection } from "@/features/profile/components/ProfileInfoSection";
import { ProfileGoalsSection } from "@/features/profile/components/ProfileGoalsSection";
import { ProfileMembershipTab } from "@/features/profile/components/ProfileMembershipTab";
import { QuickStats } from "@/features/profile/components/QuickStats";
import type { UserProfileResponse } from "@/features/profile/model";
import "@/shared/lib/animations.css";

type ProfileTab = "profile" | "membership" | "goals";

const resolveTab = (search: string): ProfileTab => {
  const tab = new URLSearchParams(search).get("tab");
  if (tab === "membership" || tab === "goals") return tab;
  return "profile";
};

const syncAuthStatus = (
  profile: Pick<
    UserProfileResponse,
    | "profileCompleted"
    | "hasSubscription"
    | "hasActiveSubscription"
    | "hasDashboardAccess"
    | "emailVerified"
    | "linkedAuthProviders"
  >
) => {
  authStore.updateOnboardingStatus({
    profileCompleted: profile.profileCompleted,
    hasSubscription: profile.hasSubscription,
    hasActiveSubscription: profile.hasActiveSubscription,
    hasDashboardAccess: profile.hasDashboardAccess,
    providers: profile.linkedAuthProviders,
    emailVerified: profile.emailVerified,
  });
};

const ProfileContainer = () => {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = resolveTab(location.search);

  const profileQuery = useQuery({
    queryKey: profileQueryKeys.user(),
    queryFn: getMyProfileApi,
  });

  const subscriptionQuery = useQuery({
    queryKey: profileQueryKeys.subscription(),
    queryFn: getMySubscriptionApi,
  });

  const plansQuery = useQuery({
    queryKey: plansQueryKeys.list(),
    queryFn: getPlansApi,
  });

  const profile = profileQuery.data ?? null;
  const subscription = subscriptionQuery.data?.subscription ?? null;
  const activePlan = plansQuery.data?.find((p) => p.planId === subscription?.planId);

  useEffect(() => {
    if (!profile) return;
    syncAuthStatus(profile);
  }, [profile]);

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(location.search);
    if (tab === "profile") params.delete("tab");
    else params.set("tab", tab);
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
  };

  const handleProfileUpdate = async () => {
    await profileQuery.refetch();
    await subscriptionQuery.refetch();
  };

  if (profileQuery.isLoading) {
    return (
      <UserLayout
        activeSection="profile"
        onSectionChange={(s) => navigate("/dashboard", { state: { activeSection: s } })}
      >
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />
        </div>
      </UserLayout>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <UserLayout
        activeSection="profile"
        onSectionChange={(s) => navigate("/dashboard", { state: { activeSection: s } })}
      >
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="animate-fade-in max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm font-bold text-red-200">Profile could not be loaded.</p>
            <p className="mt-2 text-xs text-slate-400">
              {getApiErrorMessage(profileQuery.error, "Try refreshing the page.")}
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      activeSection="profile"
      onSectionChange={(s) => navigate("/dashboard", { state: { activeSection: s } })}
    >
      <UserSectionShell
        title={
          <>
            User <span className="text-orange-500">Profile</span>
          </>
        }
        description="Manage your account details, membership, and fitness goals."
        headerClassName="max-sm:hidden"
      >
        {/* Tab Navigation */}
        <nav className="mb-5 flex border-b border-white/10 px-2 max-sm:-mx-4 max-sm:-mt-5 sm:mb-6 sm:rounded-full sm:border sm:bg-black/40 sm:p-1 sm:backdrop-blur-sm">
          {(
            [
              { id: "profile", label: "Profile", mobileLabel: "Profile", icon: User },
              { id: "membership", label: "Membership", mobileLabel: "Plan", icon: Gem },
              { id: "goals", label: "Fitness Goals", mobileLabel: "Goals", icon: Target },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-300 sm:rounded-full sm:py-2.5 sm:text-[10px]",
                activeTab === tab.id
                  ? "text-orange-500 sm:bg-orange-600 sm:text-white"
                  : "text-slate-400 hover:text-white sm:hover:bg-white/5"
              )}
            >
              <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Mobile Active Indicator Line */}
              {activeTab === tab.id && (
                <div className="absolute inset-x-0 bottom-0 h-[2px] bg-orange-500 sm:hidden" />
              )}
            </button>
          ))}
        </nav>

        {/* Mobile Profile Header - Shows on mobile/tablet */}
        {activeTab === "profile" && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:hidden">
            <ProfileImageSection profile={profile} onUpdate={handleProfileUpdate} />
            <QuickStats profile={profile} compact />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_1fr]">
          {/* Desktop Sidebar */}
          <aside className="hidden space-y-4 xl:block">
            <ProfileImageSection profile={profile} onUpdate={handleProfileUpdate} />
            <QuickStats profile={profile} />
          </aside>

          {/* Tab Content */}
          <section className="min-w-0">
            {activeTab === "profile" && (
              <div className="animate-fade-in space-y-6">
                <ProfileInfoSection profile={profile} onUpdate={handleProfileUpdate} />
              </div>
            )}

            {activeTab === "membership" && (
              <ProfileMembershipTab
                subscription={subscription}
                activePlan={activePlan}
                plans={plansQuery.data ?? []}
                isPlansLoading={plansQuery.isLoading}
                isPlansError={plansQuery.isError}
              />
            )}

            {activeTab === "goals" && (
              <div className="animate-fade-in space-y-6">
                <ProfileGoalsSection profile={profile} onUpdate={handleProfileUpdate} />
              </div>
            )}
          </section>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </UserSectionShell>
    </UserLayout>
  );
};

export default ProfileContainer;
