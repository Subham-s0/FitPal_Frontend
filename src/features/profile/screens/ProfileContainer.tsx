import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gem, Target, User, ArrowUpRight, Check } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "@/shared/api/client";
import { getMyProfileApi } from "@/features/profile/api";
import { getMySubscriptionApi } from "@/features/subscription/api";
import { getPlansApi } from "@/features/plans/api";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import { useAuthState } from "@/features/auth/hooks";
import { authStore } from "@/features/auth/store";
import { cn } from "@/shared/lib/utils";
import { ProfileImageSection } from "@/features/profile/components/ProfileImageSection";
import { ProfileInfoSection } from "@/features/profile/components/ProfileInfoSection";
import { ProfileGoalsSection } from "@/features/profile/components/ProfileGoalsSection";
import { QuickStats } from "@/features/profile/components/QuickStats";
import { SectionLabel } from "@/features/profile/components/ProfileSetupShell";
import type { UserProfileResponse } from "@/features/profile/model";

type ProfileTab = "profile" | "membership" | "goals";

const resolveTab = (search: string): ProfileTab => {
  const tab = new URLSearchParams(search).get("tab");
  if (tab === "membership" || tab === "goals") return tab;
  return "profile";
};

const formatMoney = (amount: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const syncAuthStatus = (
  profile: Pick<
    UserProfileResponse,
    | "profileCompleted"
    | "hasSubscription"
    | "hasActiveSubscription"
    | "emailVerified"
    | "linkedAuthProviders"
  >
) => {
  authStore.updateOnboardingStatus({
    profileCompleted: profile.profileCompleted,
    hasSubscription: profile.hasSubscription,
    hasActiveSubscription: profile.hasActiveSubscription,
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
    queryKey: ["user-profile"],
    queryFn: getMyProfileApi,
  });

  const subscriptionQuery = useQuery({
    queryKey: ["user-profile-subscription"],
    queryFn: getMySubscriptionApi,
  });

  const plansQuery = useQuery({
    queryKey: ["plans"],
    queryFn: getPlansApi,
  });

  const profile = profileQuery.data ?? null;
  const subscription = subscriptionQuery.data?.subscription ?? null;

  const activePlan = plansQuery.data?.find((p) => p.planId === subscription?.planId);
  const planFeatures = activePlan?.features || [];

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
                  ? "text-orange-500 sm:bg-orange-600 sm:text-white sm:shadow-lg sm:shadow-orange-500/30"
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
              <div className="animate-fade-in space-y-5 sm:space-y-6">
                <div className="rounded-3xl border table-border table-bg shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-5 sm:p-7">
                  <SectionLabel>Membership</SectionLabel>
                  {subscription ? (
                    <>
                      <div className="rounded-[22px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-5 sm:p-7">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-xl font-black uppercase text-white sm:text-2xl">
                              {subscription.planName}
                            </h3>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-orange-400 sm:text-xs">
                              {subscription.planType} · {subscription.billingCycle}
                            </p>
                          </div>
                          <span className="self-start rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white sm:text-[10px]">
                            {subscription.subscriptionStatus}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3">
                          {[
                            { label: "Base", value: formatMoney(subscription.baseAmount) },
                            { label: "Billed", value: formatMoney(subscription.billedAmount) },
                            { label: "Tax", value: formatMoney(subscription.taxAmount) },
                            { label: "Total", value: formatMoney(subscription.totalAmount) },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="rounded-xl border table-border bg-black/40 p-3.5 text-center transition-all hover:border-orange-500/30 hover:bg-orange-500/5 shadow-sm"
                            >
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                {item.label}
                              </p>
                              <p className="mt-1 text-base font-black text-white sm:text-lg">
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                          <button
                            type="button"
                            onClick={() => navigate("/membership")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/35 hover:-translate-y-0.5"
                          >
                            Upgrade Membership
                            <ArrowUpRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate("/membership")
                            }
                            className="rounded-full border border-white/20 table-bg-alt px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            View Plans
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[18px] border table-border table-bg-alt px-5 py-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Status
                          </p>
                          <p className="mt-1 text-[15px] font-black text-white">
                            {subscription.hasActiveSubscription ? "Active" : "Pending"}
                          </p>
                        </div>
                        <div className="rounded-[18px] border table-border table-bg-alt px-5 py-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Auto Renew
                          </p>
                          <p className="mt-1 text-[15px] font-black text-white">
                            {subscription.autoRenew ? "Enabled" : "Disabled"}
                          </p>
                        </div>
                        <div className="rounded-[18px] border table-border table-bg-alt px-5 py-4 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Discount
                          </p>
                          <p className="mt-1 text-[15px] font-black text-white">
                            {subscription.discountAmount > 0
                              ? `${formatMoney(subscription.discountAmount)} (${subscription.discountPercent.toFixed(0)}%)`
                              : "None"}
                          </p>
                        </div>
                      </div>

                      {planFeatures.length > 0 && (
                        <div className="mt-5 border-t table-border-cell pt-5 sm:mt-7 sm:pt-7">
                          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.16em] text-orange-500">
                            Features Included
                          </p>
                          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {planFeatures.map((feature, i) => (
                              <li key={i} className="flex items-center gap-3.5 rounded-[14px] border table-border table-bg p-3.5 transition-colors hover:border-white/20 hover:bg-white/[0.02]">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                                  <Check className="h-3.5 w-3.5 text-orange-400 stroke-[3px]" />
                                </div>
                                <p className="text-[12px] font-bold text-slate-200">{feature}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center rounded-3xl border table-border table-bg-alt p-10 text-center">
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                        <Gem className="h-8 w-8 text-orange-500" />
                      </div>
                      <p className="text-lg font-black uppercase text-white">No Subscription</p>
                      <p className="mt-2 text-sm text-slate-400">Choose a plan to upgrade your membership today.</p>
                      
                      <button
                        type="button"
                        onClick={() => navigate("/membership")}
                        className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/35 hover:-translate-y-0.5"
                      >
                        View Plans
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
