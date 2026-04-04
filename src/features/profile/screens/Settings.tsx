import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  Dumbbell,
  Gem,
  Globe,
  Lock,
  Mail,
  Receipt,
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import "@/shared/lib/animations.css";

import { useAuthState } from "@/features/auth/hooks";
import { authStore } from "@/features/auth/store";
import {
  confirmMyEmailVerificationApi,
  getMyProfileApi,
  requestMyEmailVerificationApi,
} from "@/features/profile/api";
import { profileQueryKeys } from "@/features/profile/queryKeys";
import ProfileRoutineSettings from "@/features/profile/components/ProfileRoutineSettings";
import ProfileSecurityModal from "@/features/profile/components/ProfileSecurityModal";
import {
  Field,
  SectionLabel,
  TextInput,
} from "@/features/profile/components/ProfileSetupShell";
import type { UserProfileResponse } from "@/features/profile/model";
import { getApiErrorMessage } from "@/shared/api/client";
import { cn } from "@/shared/lib/utils";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";

type SettingsTab = "overview" | "security" | "routines";
type SecurityModalMode = "change" | "forgot";
type SettingsListItem =
  | {
      id: SettingsTab;
      kind: "collapsible";
      label: string;
      description: string;
      icon: typeof Settings;
    }
  | {
      id: "payments";
      kind: "link";
      label: string;
      description: string;
      icon: typeof CreditCard;
      href: string;
    };

const isSettingsTab = (value: string | null | undefined): value is SettingsTab =>
  value === "overview" || value === "security" || value === "routines";

const resolveSettingsTab = (search: string): SettingsTab | null => {
  const tab = new URLSearchParams(search).get("tab");
  return isSettingsTab(tab) ? tab : null;
};

const getProviderLabel = (provider: string) => {
  switch (provider.toUpperCase()) {
    case "LOCAL":
      return "Email & Password";
    case "GOOGLE":
      return "Google";
    default:
      return provider;
  }
};

const syncAuthStatus = (
  profile: Pick<
    UserProfileResponse,
    "profileCompleted" | "hasSubscription" | "hasActiveSubscription" | "hasDashboardAccess" | "emailVerified" | "linkedAuthProviders"
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

const SettingsScreen = () => {
  const auth = useAuthState();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedTab = new URLSearchParams(location.search).get("tab");

  const activeTab = resolveSettingsTab(location.search);
  const [securityModal, setSecurityModal] = useState<SecurityModalMode | null>(null);
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);
  const [isConfirmingVerification, setIsConfirmingVerification] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [verificationError, setVerificationError] = useState("");

  const profileQuery = useQuery({
    queryKey: profileQueryKeys.user(),
    queryFn: getMyProfileApi,
  });

  const profile = profileQuery.data ?? null;
  const linkedProviders = profile?.linkedAuthProviders ?? auth.providers ?? [];
  const supportsLocalPassword = linkedProviders.some((provider) => provider.toUpperCase() === "LOCAL");

  const setOpenTab = (tab: SettingsTab | null) => {
    const params = new URLSearchParams(location.search);
    if (!tab) params.delete("tab");
    else params.set("tab", tab);

    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
  };

  const handleRequestVerification = async () => {
    try {
      setIsRequestingVerification(true);
      await requestMyEmailVerificationApi();
      setShowVerificationInput(true);
      setVerificationError("");
      toast.success("Verification code sent. Use 123456 for the current dummy flow.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to request verification code"));
    } finally {
      setIsRequestingVerification(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!verificationOtp.trim()) {
      setVerificationError("Enter the 6-digit OTP");
      return;
    }

    try {
      setIsConfirmingVerification(true);
      const response = await confirmMyEmailVerificationApi({ otp: verificationOtp.trim() });
      syncAuthStatus(response);
      setVerificationOtp("");
      setVerificationError("");
      setShowVerificationInput(false);
      await profileQuery.refetch();
      toast.success("Email verified successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to verify email"));
    } finally {
      setIsConfirmingVerification(false);
    }
  };

  const accountStatusItems = useMemo(
    () => [
      {
        label: "Email verified",
        value: profile?.emailVerified ? "Verified" : "Action needed",
        active: Boolean(profile?.emailVerified),
      },
      {
        label: "Profile completed",
        value: profile?.profileCompleted ? "Complete" : "Incomplete",
        active: Boolean(profile?.profileCompleted),
      },
      {
        label: "Sign-in methods",
        value: linkedProviders.length > 0 ? `${linkedProviders.length} linked` : "Not linked",
        active: linkedProviders.length > 0,
      },
    ],
    [linkedProviders.length, profile]
  );

  const overviewStats = useMemo(
    () => [
      {
        label: "Linked providers",
        value: String(linkedProviders.length),
        hint: linkedProviders.length === 1 ? "sign-in method" : "sign-in methods",
      },
      {
        label: "Password",
        value: supportsLocalPassword ? "Available" : "Provider only",
        hint: supportsLocalPassword ? "manage in security" : "sign in with linked provider",
      },
      {
        label: "Profile",
        value: profile?.profileCompleted ? "Complete" : "Incomplete",
        hint: profile?.profileCompleted ? "ready to use" : "finish remaining setup",
      },
      {
        label: "Email",
        value: profile?.emailVerified ? "Verified" : "Pending",
        hint: profile?.email ?? "not loaded",
      },
    ],
    [linkedProviders.length, profile, supportsLocalPassword]
  );

  const settingsSections: SettingsListItem[] = [
    {
      id: "overview",
      kind: "collapsible",
      label: "Overview",
      description: "Status, shortcuts, and a quick account snapshot.",
      icon: Settings,
    },
    {
      id: "security",
      kind: "collapsible",
      label: "Security",
      description: "Email verification, password actions, and linked providers.",
      icon: Lock,
    },
    {
      id: "payments",
      kind: "link",
      label: "Payments",
      description: "Open billing history, payment statuses, and membership transaction details.",
      icon: CreditCard,
      href: "/payments",
    },
    {
      id: "routines",
      kind: "collapsible",
      label: "Routine Settings",
      description: "Active routine details and training context.",
      icon: Dumbbell,
    },
  ] as const;

  if (requestedTab === "payments") {
    return <Navigate to="/payments" replace />;
  }

  if (profileQuery.isLoading) {
    return (
      <UserLayout activeSection="settings" onSectionChange={(section) => navigate("/dashboard", { state: { activeSection: section } })}>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />
        </div>
      </UserLayout>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <UserLayout activeSection="settings" onSectionChange={(section) => navigate("/dashboard", { state: { activeSection: section } })}>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm font-bold text-red-200">Settings could not be loaded.</p>
            <p className="mt-2 text-xs text-slate-400">
              {getApiErrorMessage(profileQuery.error, "Try refreshing the page.")}
            </p>
          </div>
        </div>
      </UserLayout>
    );
  }

  const overviewContent = (
    <div className="space-y-6 animate-fade-in sm:space-y-8">
      <div>
        <SectionLabel>Settings Overview</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((item) => (
            <div
              key={item.label}
              className="rounded-[18px] border table-border table-bg-alt px-4 py-4 transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04] shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
              <p className="mt-1.5 text-[15px] font-black text-white leading-snug">{item.value}</p>
              <p className="mt-1.5 text-[11px] text-slate-500 leading-snug">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => setOpenTab("security")}
          className="group rounded-2xl border table-border table-bg p-5 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04] hover:-translate-y-0.5 shadow-sm"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10">
            <Lock className="h-5 w-5 text-orange-400" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-white">Security</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Verify email, manage password actions, and review linked sign-in providers.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setOpenTab("routines")}
          className="group rounded-2xl border table-border table-bg p-5 text-left transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04] hover:-translate-y-0.5 shadow-sm"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10">
            <Dumbbell className="h-5 w-5 text-orange-400" />
          </div>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-white">Routine Settings</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Track the active routine, activation date, and last session timing.
          </p>
        </button>
      </div>
    </div>
  );

  const securityContent = (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-[22px] border table-border table-bg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b table-border-cell flex items-center gap-3">
          {profile.emailVerified ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-emerald-500/10 border border-emerald-500/20">
              <BadgeCheck className="h-4.5 w-4.5 text-emerald-400" />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Email Verification</p>
            <p className="mt-0.5 text-sm font-bold text-white">{profile.emailVerified ? "Verified" : "Not Verified"}</p>
            <p className="text-[11px] table-text-muted">{profile.email}</p>
          </div>
          {!profile.emailVerified && (
            <button
              type="button"
              onClick={handleRequestVerification}
              disabled={isRequestingVerification}
              className="shrink-0 rounded-full bg-orange-500/10 border border-orange-500/25 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-orange-400 transition-all hover:bg-orange-500/20 disabled:opacity-50"
            >
              {isRequestingVerification ? "Sending..." : "Verify Email"}
            </button>
          )}
        </div>

        {!profile.emailVerified && showVerificationInput && (
          <div className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-end table-bg-alt">
            <Field label="OTP Code" error={verificationError} className="flex-1">
              <TextInput
                maxLength={6}
                inputMode="numeric"
                placeholder="Enter 6-digit code"
                value={verificationOtp}
                onChange={(event) => {
                  setVerificationOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setVerificationError("");
                }}
              />
            </Field>
            <button
              type="button"
              onClick={handleConfirmVerification}
              disabled={isConfirmingVerification}
              className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:shadow-orange-500/30 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {isConfirmingVerification ? "Verifying..." : "Confirm OTP"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[22px] border table-border table-bg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b table-border-cell">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Password</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-white">Account Password</p>
              <p className="mt-0.5 text-[11px] table-text-muted">
                {supportsLocalPassword ? "Manage your sign-in password." : "Linked via OAuth provider — no password set."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSecurityModal("change")}
                disabled={!supportsLocalPassword}
                className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 sm:flex-none"
              >
                <Lock className="mr-1.5 inline h-3 w-3" />
                Change
              </button>
              <button
                type="button"
                onClick={() => setSecurityModal("forgot")}
                disabled={!supportsLocalPassword}
                className="flex-1 rounded-full border table-border table-bg-alt px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition-all hover:text-white hover:border-white/25 disabled:opacity-40 sm:flex-none"
              >
                <Mail className="mr-1.5 inline h-3 w-3" />
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Linked Sign-In Providers</p>
              <p className="mt-1 text-sm font-bold text-white">Sign-in Methods</p>
              <p className="mt-0.5 text-[11px] table-text-muted">
                Authentication providers currently linked to this account.
              </p>
            </div>
            <span className="shrink-0 rounded-full border table-border table-bg-alt px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">
              {linkedProviders.length} linked
            </span>
          </div>

          {linkedProviders.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedProviders.map((provider) => (
                <div
                  key={provider}
                  className="inline-flex items-center gap-2 rounded-full border table-border table-bg-alt px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-200"
                >
                  {provider.toUpperCase() === "GOOGLE" ? (
                    <Globe className="h-3.5 w-3.5 text-sky-400" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-orange-400" />
                  )}
                  {getProviderLabel(provider)}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-[14px] border table-border table-bg-alt px-4 py-3 text-xs table-text-muted">
              No sign-in providers are currently linked to this account.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSectionContent = (tab: SettingsTab) => {
    switch (tab) {
      case "overview":
        return overviewContent;
      case "security":
        return securityContent;
      case "routines":
        return <ProfileRoutineSettings />;
      default:
        return null;
    }
  };

  return (
    <UserLayout activeSection="settings" onSectionChange={(section) => navigate("/dashboard", { state: { activeSection: section } })}>
      <UserSectionShell
        title={<>Account <span className="text-orange-500">Settings</span></>}
        description="Security, routine controls, and account shortcuts live here."
      >
        <div className="mb-5 grid grid-cols-1 gap-3 xl:hidden sm:grid-cols-2">
          <div className="rounded-[22px] border table-border table-bg shadow-sm p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Account Status</p>
                <p className="mt-1 text-[13px] font-bold text-white">Current account readiness</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10">
                <ShieldCheck className="h-4.5 w-4.5 text-orange-400" />
              </div>
            </div>
            <div className="space-y-2">
              {accountStatusItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-2.5"
                >
                  <span className="text-[12px] font-semibold text-slate-300">{item.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                      item.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border table-border table-bg shadow-sm p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Quick Links</p>
                <p className="mt-1 text-[13px] font-bold text-white">Jump to the main user flows</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate("/membership")}
                className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.06]"
              >
                Open Membership
                <Gem className="h-3.5 w-3.5 text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard", { state: { activeSection: "routines" } })}
                className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.06]"
              >
                Routines Dashboard
                <Dumbbell className="h-3.5 w-3.5 text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard", { state: { activeSection: "checkin", checkInView: "logs" } })}
                className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.06]"
              >
                Check-In History
                <Receipt className="h-3.5 w-3.5 text-orange-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
          <aside className="hidden space-y-4 xl:block">
            <div className="rounded-[22px] border table-border table-bg shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border",
                  profile.emailVerified
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10"
                )}>
                  {profile.emailVerified ? (
                    <BadgeCheck className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Account</p>
                  <h2 className="mt-0.5 text-[15px] font-black uppercase tracking-tight text-white truncate">
                    {profile.firstName?.trim() || profile.userName || "FitPal Member"}
                  </h2>
                  <p className="text-[11px] table-text-muted truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border table-border table-bg shadow-sm p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Account Status</p>
                  <p className="mt-0.5 text-[13px] font-bold text-white">Current readiness</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10">
                  <ShieldCheck className="h-4 w-4 text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                {accountStatusItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-2.5"
                  >
                    <span className="text-[12px] font-semibold text-slate-300">{item.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] border",
                        item.active ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      )}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border table-border table-bg shadow-sm p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">Quick Links</p>
                  <p className="mt-0.5 text-[13px] font-bold text-white">Open the core user flows</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10">
                  <ArrowUpRight className="h-4 w-4 text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate("/membership")}
                  className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.06]"
                >
                  Open Membership
                  <Gem className="h-3.5 w-3.5 text-orange-400" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard", { state: { activeSection: "routines" } })}
                  className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.06]"
                >
                  Routines Dashboard
                  <Dumbbell className="h-3.5 w-3.5 text-orange-400" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard", { state: { activeSection: "checkin", checkInView: "logs" } })}
                  className="flex w-full items-center justify-between rounded-[14px] border table-border table-bg-alt px-3 py-3 text-left text-[12px] font-bold text-white transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.06]"
                >
                  Check-In History
                  <Receipt className="h-3.5 w-3.5 text-orange-400" />
                </button>
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-3">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isCollapsible = section.kind === "collapsible";
              const isActive = isCollapsible && activeTab === section.id;

              return (
                <div
                  key={section.id}
                  className={cn(
                    "overflow-hidden rounded-[22px] border transition-all shadow-sm",
                    isActive
                      ? "border-orange-500/25 table-bg"
                      : "table-border table-bg hover:border-white/15"
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={isCollapsible ? isActive : undefined}
                    aria-controls={isCollapsible ? `settings-section-${section.id}` : undefined}
                    onClick={() => {
                      if (section.kind === "link") {
                        navigate(section.href);
                        return;
                      }

                      setOpenTab(activeTab === section.id ? null : section.id);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors",
                      !isActive && "hover:bg-white/[0.02]"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border transition-colors",
                          isActive
                            ? "border-orange-500/30 bg-orange-500/15 text-orange-300"
                            : "table-border table-bg-alt text-slate-400"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-[13px] font-black uppercase tracking-[0.12em]",
                          isActive ? "text-white" : "text-slate-200"
                        )}>
                          {section.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-5 table-text-muted">
                          {section.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {section.kind === "link" ? (
                        <span className="hidden rounded-full border table-border table-bg-alt px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 sm:inline-flex">
                          Open Page
                        </span>
                      ) : isActive ? (
                        <span className="hidden rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300 sm:inline-flex">
                          Expanded
                        </span>
                      ) : null}

                      {section.kind === "link" ? (
                        <ArrowUpRight className="h-4.5 w-4.5 text-slate-400" />
                      ) : (
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center transition-transform duration-200",
                            isActive ? "rotate-180 text-orange-400" : "text-slate-500"
                          )}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>

                  {isCollapsible && isActive ? (
                    <div 
                      id={`settings-section-${section.id}`}
                      role="region"
                      aria-labelledby={`settings-button-${section.id}`}
                      className="border-t table-border-cell table-bg-alt px-5 py-6"
                    >
                      {renderSectionContent(section.id)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        </div>
      </UserSectionShell>

      <ProfileSecurityModal
        open={securityModal !== null}
        mode={securityModal ?? "change"}
        email={profile.email}
        supportsLocalPassword={supportsLocalPassword}
        onClose={() => setSecurityModal(null)}
      />
    </UserLayout>
  );
};

export default SettingsScreen;


