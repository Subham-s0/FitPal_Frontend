import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuthState } from "@/features/auth";
import { authStore } from "@/features/auth/store";
import { getPlansApi } from "@/features/plans/api";
import { initiateEsewaPaymentApi, initiateKhaltiPaymentApi } from "@/features/payment/api";
import { getMyProfileApi } from "@/features/profile/api";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";
import {
  Field,
  FieldError,
  SectionLabel,
  TextInput,
} from "@/features/profile/components/ProfileSetupShell";
import {
  getMySubscriptionHistoryApi,
  getMySubscriptionApi,
  pauseMySubscriptionApi,
  resumeMySubscriptionApi,
  selectMySubscriptionApi,
} from "@/features/subscription/api";
import type { PlanResponse } from "@/features/plans/model";
import type {
  BillingCycle,
  SubscriptionPauseHistoryItemResponse,
  SubscriptionPauseHistoryStatus,
  SubscriptionStatus,
  UserSubscriptionHistoryItemResponse,
  UserSubscriptionResponse,
} from "@/features/subscription/model";
import UserLayout from "@/features/user-dashboard/components/UserLayout";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import { getApiErrorMessage } from "@/shared/api/client";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

type PlanFrequency = "monthly" | "yearly";
type PaymentMethodId = "khalti" | "esewa";

type PaymentFailureFeedback = {
  gateway: PaymentMethodId;
  status: "failed" | "cancelled";
  message: string;
  paymentAttemptId: number;
};

type UpgradeMembershipLocationState = {
  paymentFeedback?: PaymentFailureFeedback;
};

type MembershipIntent = "activate" | "renew-early" | "switch-billing" | "upgrade" | "plan-change";

interface PaymentMethodDefinition {
  id: PaymentMethodId;
  name: string;
  subtitle: string;
  badge: string;
  logoUrl?: string;
  colorClass: string;
  isAvailable: boolean;
}

interface KhaltiBillingState {
  name: string;
  email: string;
  phone: string;
}

type KhaltiBillingErrors = Partial<Record<keyof KhaltiBillingState, string>>;

const SUBSCRIPTION_HISTORY_STATUS_OPTIONS: Array<{
  value: "ALL" | SubscriptionStatus;
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "FAILED", label: "Failed" },
];

const HISTORY_SORT_OPTIONS = [
  { value: "DESC", label: "Newest first" },
  { value: "ASC", label: "Oldest first" },
] as const;

const SubscriptionHistorySortIcon = ({ direction }: { direction: "ASC" | "DESC" }) =>
  direction === "DESC" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />;

const PAYMENT_METHODS: PaymentMethodDefinition[] = [
  {
    id: "khalti",
    name: "Khalti",
    subtitle: "Fast wallet checkout for Nepali users.",
    badge: "K",
    logoUrl: "https://khaltibyime.khalti.com/wp-content/uploads/2025/07/Logo-for-Blog.png",
    colorClass: "bg-slate-950/40 text-white",
    isAvailable: true,
  },
  {
    id: "esewa",
    name: "eSewa",
    subtitle: "Popular digital wallet for direct payments.",
    badge: "e",
    logoUrl: "https://esewa.com.np/common/images/esewa_logo.png",
    colorClass: "bg-[#60bb46]/20 text-[#8ae36f]",
    isAvailable: true,
  },
];

const PLAN_RANK: Record<string, number> = {
  basic: 0,
  promo: 1,
  pro: 1,
  elite: 2,
};

const NEPAL_MOBILE_REGEX = /^(98|97)\d{8}$/;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FLEXIBLE_PAUSE_OPTIONS = [7, 14, 30] as const;
const MEMBERSHIP_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const toApiBillingCycle = (cycle: PlanFrequency): BillingCycle =>
  cycle === "yearly" ? "YEARLY" : "MONTHLY";

const fromApiBillingCycle = (cycle: BillingCycle): PlanFrequency =>
  cycle === "YEARLY" ? "yearly" : "monthly";

const normalizePlanType = (planType: string | null | undefined) =>
  planType?.trim().toLowerCase() ?? "";

const getPlanRank = (planType: string | null | undefined) =>
  PLAN_RANK[normalizePlanType(planType)] ?? -1;

const formatMembershipDate = (value: string | null | undefined) => {
  if (!value) return "Not scheduled";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Not scheduled";
  }

  return MEMBERSHIP_DATE_FORMATTER.format(parsedDate);
};

const toIsoLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowIsoDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return toIsoLocalDate(date);
};

const parseDateInput = (value: string | null | undefined) => {
  if (!value) return undefined;

  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return undefined;
  }

  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const getSubscriptionStatusLabel = (
  status: UserSubscriptionResponse["subscriptionStatus"] | null | undefined
) => {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "PAUSED":
      return "Paused";
    case "UPCOMING":
      return "Upcoming";
    case "PENDING":
      return "Pending";
    case "EXPIRED":
      return "Expired";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED":
      return "Failed";
    default:
      return "Unknown";
  }
};

const getSubscriptionStatusClasses = (
  status: UserSubscriptionResponse["subscriptionStatus"] | null | undefined
) => {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "PAUSED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "UPCOMING":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "FAILED":
    case "CANCELLED":
      return "border-red-500/20 bg-red-500/10 text-red-200";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-200";
  }
};

const getMembershipStateLabel = (subscription: UserSubscriptionResponse | null) => {
  if (!subscription) return "Pending";
  if (subscription.subscriptionStatus === "PAUSED") return "Paused";
  if (subscription.scheduledPauseStartAt && subscription.scheduledPauseUntil) return "Scheduled Pause";
  switch (subscription.subscriptionStatus) {
    case "ACTIVE":
      return "Active";
    case "UPCOMING":
      return "Upcoming";
    case "PENDING":
      return "Pending";
    default:
      return getSubscriptionStatusLabel(subscription.subscriptionStatus);
  }
};

const getMembershipStateClasses = (label: string) => {
  switch (label) {
    case "Active":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "Scheduled Pause":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "Paused":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "Upcoming":
      return "border-blue-500/20 bg-blue-500/10 text-blue-100";
    case "Pending":
      return "border-white/10 bg-white/[0.04] text-slate-200";
    default:
      return "border-white/10 bg-white/[0.04] text-slate-200";
  }
};

const getPauseHistoryStatusClasses = (status: SubscriptionPauseHistoryStatus) => {
  switch (status) {
    case "SCHEDULED":
      return "border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "PAUSED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "RESUMED_EARLY":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "COMPLETED":
      return "border-white/10 bg-white/[0.05] text-slate-200";
    case "CANCELLED_SCHEDULED":
      return "border-red-500/20 bg-red-500/10 text-red-200";
    default:
      return "border-white/10 bg-white/[0.05] text-slate-200";
  }
};

const getPauseHistoryLabel = (status: SubscriptionPauseHistoryStatus) =>
  status
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatPauseDuration = (pauseDays: number) =>
  `${pauseDays} day${pauseDays === 1 ? "" : "s"}`;

const formatCurrencyAmount = (amount: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

function SubscriptionHistoryCards({ items }: { items: UserSubscriptionHistoryItemResponse[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.subscriptionId}
          className="rounded-2xl border table-border table-bg p-4 transition-colors hover:table-bg-hover"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-orange-500/25 bg-orange-500/10">
                <Crown className="h-4 w-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-tight text-white">
                  {item.planName ?? "Membership"}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {item.planType ?? "N/A"}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-orange-400">
                  {item.billingCycle?.toLowerCase() ?? "N/A"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                getSubscriptionStatusClasses(item.subscriptionStatus)
              )}
            >
              {getSubscriptionStatusLabel(item.subscriptionStatus)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Selected</p>
              <p className="mt-1 font-semibold text-slate-200">
                {formatMembershipDate(item.createdAt)}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Total</p>
              <p className="mt-1 font-black text-white">NPR {formatCurrencyAmount(item.totalAmount)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Starts</p>
              <p className="mt-1 text-slate-200">{formatMembershipDate(item.startsAt)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Ends</p>
              <p className="mt-1 text-slate-200">{formatMembershipDate(item.endsAt)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const buildFrontendCallbackUrl = (
  pathname: string,
  params: Record<string, string> = {}
) => {
  const url = new URL(pathname, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const getSelectionNarrative = (
  currentSubscription: UserSubscriptionResponse | null,
  hasQueuedMembership: boolean,
  selectedPlan: PlanResponse | null,
  billingCycle: PlanFrequency
) => {
  if (!selectedPlan) {
    return {
      label: "Membership",
      chip: "Choose Next Membership",
      description: "Pick the next membership you want queued after the current one.",
      intent: "activate" as MembershipIntent,
    };
  }

  if (!currentSubscription) {
    return {
      label: "Ready to activate",
      chip: "Activate",
      description: `Start ${selectedPlan.name} and unlock FitPal gym access right away.`,
      intent: "activate" as MembershipIntent,
    };
  }

  if (hasQueuedMembership) {
    return {
      label: "Next membership already queued",
      chip: "Queued",
      description: "This account already has an upcoming membership. Finish or wait for that queued term before selecting another one.",
      intent: "activate" as MembershipIntent,
    };
  }

  const selectedPlanId = normalizePlanType(selectedPlan.planType);
  const selectedCycle = toApiBillingCycle(billingCycle);
  const isSamePlan = normalizePlanType(currentSubscription.planType) === selectedPlanId;
  const isSameCycle = currentSubscription.billingCycle === selectedCycle;

  const currentRank = getPlanRank(currentSubscription.planType);
  const selectedRank = getPlanRank(selectedPlan.planType);

  if (isSamePlan && isSameCycle) {
    return {
      label: "Renew early",
      chip: "Renew Early",
      description: `Queue a fresh ${selectedPlan.name} membership to begin right after your current term ends.`,
      intent: "renew-early" as MembershipIntent,
    };
  }

  if (isSamePlan && !isSameCycle) {
    return {
      label: "Switch billing",
      chip: "Switch Billing",
      description: `Keep ${selectedPlan.name} and change the next term to ${billingCycle} billing.`,
      intent: "switch-billing" as MembershipIntent,
    };
  }

  if (selectedRank > currentRank) {
    return {
      label: "Upgrade ready",
      chip: "Upgrade",
      description: `Move from ${currentSubscription.planName} to ${selectedPlan.name} and unlock more coverage.`,
      intent: "upgrade" as MembershipIntent,
    };
  }

  return {
    label: "Plan change",
    chip: "Plan Change",
    description: `Switch from ${currentSubscription.planName} to ${selectedPlan.name} when you are ready.`,
    intent: "plan-change" as MembershipIntent,
  };
};

const submitEsewaForm = (paymentUrl: string, formFields: Record<string, string>) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = paymentUrl;
  form.style.display = "none";

  Object.entries(formFields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
};

const getPlanId = (plan: Pick<PlanResponse, "planType">) => plan.planType.toLowerCase();

interface MembershipPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: PlanResponse[];
  isMobile: boolean;
  selectedPlanId: string;
  billingCycle: PlanFrequency;
  onBillingChange: (cycle: PlanFrequency) => void;
  onSelectPlan: (planId: string, cycle: PlanFrequency) => void;
  isSelectionLocked: boolean;
  mobilePlanIndex: number;
  onMobilePlanIndexChange: (index: number) => void;
}

function MembershipPlanDialog({
  open,
  onOpenChange,
  plans,
  isMobile,
  selectedPlanId,
  billingCycle,
  onBillingChange,
  onSelectPlan,
  isSelectionLocked,
  mobilePlanIndex,
  onMobilePlanIndexChange,
}: MembershipPlanDialogProps) {
  const isYearly = billingCycle === "yearly";
  const highestYearlyDiscountPercent = plans.reduce(
    (highest, plan) => Math.max(highest, plan.yearlyDiscountPercent),
    0
  );
  const boundedMobileIndex = Math.min(Math.max(mobilePlanIndex, 0), Math.max(plans.length - 1, 0));
  const mobilePlan = plans[boundedMobileIndex] ?? null;

  const renderPlanCard = (plan: PlanResponse) => {
    const planId = getPlanId(plan);
    const price = isYearly ? plan.yearlyBilledAmount : plan.monthlyPrice;
    const durationDays = isYearly ? plan.yearlyDurationDays : plan.monthlyDurationDays;
    const isSelected = selectedPlanId === planId;

    return (
      <div
        key={plan.planId}
        className={cn(
          "relative flex h-full flex-col rounded-[1.35rem] border p-5 text-left transition-all",
          isSelected
            ? "border-orange-500 bg-[#16110d] shadow-[0_10px_40px_-10px_rgba(234,88,12,0.18)]"
            : plan.mostPopular
              ? "border-orange-500/40 bg-[#0f0f0f] shadow-[0_10px_40px_-10px_rgba(234,88,12,0.2)]"
              : "border-white/10 bg-[#0f0f0f] hover:border-orange-500/30"
        )}
      >
        {plan.mostPopular ? (
          <div className="absolute left-5 top-0 -translate-y-1/2 rounded-full bg-orange-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
            Most Popular
          </div>
        ) : null}

        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{plan.name}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <p className="text-3xl font-black tracking-tight text-white">
              {plan.currency} {formatCurrencyAmount(price)}
            </p>
            <p className="pb-1 text-sm font-bold text-slate-500">{isYearly ? "/yr" : "/mo"}</p>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {isYearly ? "Billed yearly" : "Billed monthly"} · {durationDays} days
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{plan.description}</p>
        </div>

        <div className="my-5 h-px bg-white/6" />

        <ul className="flex-1 space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            if (isSelectionLocked) return;
            onSelectPlan(planId, billingCycle);
            onOpenChange(false);
          }}
          disabled={isSelectionLocked}
          className={cn(
            "mt-6 rounded-[1rem] px-4 py-3 text-sm font-black uppercase tracking-[0.08em] transition-all",
            isSelectionLocked
              ? "cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-500"
              : isSelected
                ? "bg-[linear-gradient(135deg,#FF6A00,#FF9500)] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)]"
                : "border border-orange-500/25 bg-orange-500/10 text-orange-100 hover:bg-orange-500/15"
          )}
        >
          {isSelectionLocked ? "Queued Membership Locked" : isSelected ? `${plan.name} Selected` : `Select ${plan.name}`}
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#090909] p-5 text-white sm:max-w-6xl sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-white">
              Choose Next Membership
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-400">
              Compare plans, switch billing, or renew early for the same plan from one place.
            </DialogDescription>
          </DialogHeader>

          {/* Billing toggle — always centered, matching Pricing.tsx */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <div className="inline-flex items-center gap-0 rounded-full border border-white/10 bg-[#1a1a1a] p-1">
              <button
                type="button"
                onClick={() => onBillingChange("monthly")}
                className={cn(
                  "rounded-full px-6 py-2 text-[13px] font-bold tracking-wide transition-all",
                  !isYearly
                    ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => onBillingChange("yearly")}
                className={cn(
                  "rounded-full px-6 py-2 text-[13px] font-bold tracking-wide transition-all",
                  isYearly
                    ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                    : "text-slate-400 hover:text-white"
                )}
              >
                Yearly
              </button>
              {isYearly && highestYearlyDiscountPercent > 0 ? (
                <span className="ml-2 mr-1 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[10px] font-black text-green-400">
                  Save {formatCurrencyAmount(highestYearlyDiscountPercent)}%
                </span>
              ) : null}
            </div>

            {isSelectionLocked ? (
              <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100">
                Upcoming membership already queued
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            {isMobile ? (
              <div className="space-y-4">
                {/* Card with floating side arrows */}
                <div className="relative">
                  {/* Left arrow — bare icon, vertically centered */}
                  <button
                    type="button"
                    onClick={() => onMobilePlanIndexChange(Math.max(0, boundedMobileIndex - 1))}
                    disabled={boundedMobileIndex === 0}
                    className="absolute left-0 top-1/2 z-10 -translate-x-3 -translate-y-1/2 p-1 text-slate-500 transition-all duration-200 hover:text-orange-400 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.7)] disabled:pointer-events-none disabled:opacity-20"
                  >
                    <ChevronLeft size={22} strokeWidth={2.5} />
                  </button>

                  {/* The plan card itself — padded so arrows don't overlap content */}
                  <div className="mx-5">
                    {mobilePlan ? renderPlanCard(mobilePlan) : null}
                  </div>

                  {/* Right arrow — bare icon, vertically centered */}
                  <button
                    type="button"
                    onClick={() => onMobilePlanIndexChange(Math.min(plans.length - 1, boundedMobileIndex + 1))}
                    disabled={boundedMobileIndex >= plans.length - 1}
                    className="absolute right-0 top-1/2 z-10 translate-x-3 -translate-y-1/2 p-1 text-slate-500 transition-all duration-200 hover:text-orange-400 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.7)] disabled:pointer-events-none disabled:opacity-20"
                  >
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Dot indicators + plan name — centered below */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    {plans.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => onMobilePlanIndexChange(index)}
                        className={cn(
                          "rounded-full transition-all duration-200",
                          index === boundedMobileIndex
                            ? "h-2 w-6 bg-orange-500"
                            : "h-2 w-2 bg-white/20 hover:bg-white/40"
                        )}
                        aria-label={`Go to plan ${index + 1}`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500">
                    {mobilePlan?.name ?? ""} &middot; {boundedMobileIndex + 1} / {plans.length}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-3">
                {plans.map((plan) => renderPlanCard(plan))}
              </div>
            )}
          </div>
      </DialogContent>
    </Dialog>
  );
}

const MembershipUpgrade = () => {
  const auth = useAuthState();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const locationState = location.state as UpgradeMembershipLocationState | null;

  const plansQuery = useQuery({ queryKey: ["plans"], queryFn: getPlansApi });
  const subscriptionQuery = useQuery({
    queryKey: ["membership-upgrade-subscription"],
    queryFn: getMySubscriptionApi,
  });
  const profileQuery = useQuery({
    queryKey: ["membership-upgrade-profile"],
    queryFn: getMyProfileApi,
  });

  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [billingCycle, setBillingCycle] = useState<PlanFrequency>("monthly");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethodId>("esewa");
  const [khaltiBilling, setKhaltiBilling] = useState<KhaltiBillingState>({
    name: "",
    email: auth.email ?? "",
    phone: "",
  });
  const [khaltiBillingErrors, setKhaltiBillingErrors] = useState<KhaltiBillingErrors>({});
  const [paymentMethodError, setPaymentMethodError] = useState("");
  const [paymentFeedback, setPaymentFeedback] = useState<PaymentFailureFeedback | null>(
    locationState?.paymentFeedback ?? null
  );
  const [selectedSubscription, setSelectedSubscription] =
    useState<UserSubscriptionResponse | null>(null);
  const [isSavingSelection, setIsSavingSelection] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);
  const [isFlexibleInfoOpen, setIsFlexibleInfoOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [pauseDays, setPauseDays] = useState<(typeof FLEXIBLE_PAUSE_OPTIONS)[number]>(7);
  const [pauseStartDate, setPauseStartDate] = useState(getTomorrowIsoDate);
  const [pauseStartDateError, setPauseStartDateError] = useState("");
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);
  const [subscriptionHistoryStatus, setSubscriptionHistoryStatus] = useState<"ALL" | SubscriptionStatus>("ALL");
  const [subscriptionHistorySortDirection, setSubscriptionHistorySortDirection] = useState<"ASC" | "DESC">("DESC");
  const [subscriptionHistoryPage, setSubscriptionHistoryPage] = useState(0);
  const [subscriptionHistoryFilterOpen, setSubscriptionHistoryFilterOpen] = useState(false);
  const [mobilePlanIndex, setMobilePlanIndex] = useState(0);
  const subscriptionHistoryFilterRef = useRef<HTMLDivElement>(null);

  const plans = plansQuery.data;
  const profile = profileQuery.data ?? null;
  const subscriptionState = subscriptionQuery.data ?? null;
  const pendingMembership =
    subscriptionState?.subscription?.subscriptionStatus === "PENDING"
      ? subscriptionState.subscription
      : null;
  const currentMembership = subscriptionState?.currentSubscription ?? null;
  const upcomingSubscription = subscriptionState?.upcomingSubscription ?? null;
  const initialSelectionSource = upcomingSubscription ?? pendingMembership ?? currentMembership;
  const checkoutSubscription = selectedSubscription ?? pendingMembership ?? upcomingSubscription;
  const hasQueuedMembership = Boolean(upcomingSubscription);
  const isNextMembershipSelectionLocked = hasQueuedMembership;
  const pauseCount = currentMembership?.pauseCount ?? 0;
  const pauseCountCurrentWindow = currentMembership?.pauseCountCurrentWindow ?? 0;
  const pauseLimitPerWindow = currentMembership?.pauseLimitPerWindow ?? 0;
  const totalPauseLimit = currentMembership?.totalPauseLimit ?? 0;
  const hasScheduledPause = Boolean(
    currentMembership?.scheduledPauseStartAt && currentMembership?.scheduledPauseUntil
  );
  const remainingFlexiblePauses = Math.max(0, totalPauseLimit - pauseCount);
  const remainingPausesThisWindow = Math.max(0, pauseLimitPerWindow - pauseCountCurrentWindow);
  const canPauseCurrentMembership =
    currentMembership?.subscriptionStatus === "ACTIVE" &&
    !hasScheduledPause &&
    remainingFlexiblePauses > 0 &&
    remainingPausesThisWindow > 0;
  const canResumeCurrentMembership =
    currentMembership?.subscriptionStatus === "PAUSED" || hasScheduledPause;
  const membershipStateLabel = getMembershipStateLabel(
    currentMembership ?? upcomingSubscription ?? pendingMembership
  );
  const currentPauseHistory = useMemo(
    () => currentMembership?.pauseHistory ?? [],
    [currentMembership]
  );
  const queuedMembership =
    upcomingSubscription && upcomingSubscription.subscriptionId !== currentMembership?.subscriptionId
      ? upcomingSubscription
      : null;
  const flexibleSubscriptionContext = !currentMembership
    ? upcomingSubscription
      ? "Your next membership is already lined up. Flexible pause becomes available once that membership starts."
      : "Flexible pause becomes available as soon as your first membership is active."
    : hasScheduledPause
      ? `Your ${currentMembership.planName} membership has a pause scheduled from ${formatMembershipDate(currentMembership.scheduledPauseStartAt)} until ${formatMembershipDate(currentMembership.scheduledPauseUntil)}. You can cancel that scheduled pause anytime before it begins.`
    : currentMembership.subscriptionStatus === "PAUSED"
      ? `Your ${currentMembership.planName} membership is paused until ${formatMembershipDate(currentMembership.pauseUntil)}. You can resume sooner whenever you are ready to come back.`
      : remainingFlexiblePauses <= 0
        ? `Your ${currentMembership.planName} membership is active now, and all ${totalPauseLimit} flexible pauses on this subscription have already been used.`
        : remainingPausesThisWindow <= 0
          ? `Your ${currentMembership.planName} membership is active now, but this billing window has already used all ${pauseLimitPerWindow} available pause slots.`
          : `Your ${currentMembership.planName} membership is active now. You still have ${remainingFlexiblePauses} flexible pause${remainingFlexiblePauses === 1 ? "" : "s"} left on this subscription, with ${remainingPausesThisWindow} available in the current billing window.`;

  const subscriptionHistoryQuery = useQuery({
    queryKey: [
      "membership-subscription-history",
      subscriptionHistoryStatus,
      subscriptionHistorySortDirection,
      subscriptionHistoryPage,
    ],
    queryFn: () =>
      getMySubscriptionHistoryApi({
        statuses: subscriptionHistoryStatus === "ALL" ? undefined : [subscriptionHistoryStatus],
        sortDirection: subscriptionHistorySortDirection,
        page: subscriptionHistoryPage,
        size: 12,
      }),
  });

  const selectedPlanDetails =
    plans?.find((plan) => normalizePlanType(plan.planType) === selectedPlan) ??
    plans?.find((plan) => plan.mostPopular) ??
    plans?.[0] ??
    null;

  const selectedPlanId = normalizePlanType(selectedPlanDetails?.planType);

  useEffect(() => {
    if (!profile) return;

    setKhaltiBilling((current) => ({
      name:
        current.name ||
        [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
        profile.userName ||
        "",
      email: current.email || profile.email || auth.email || "",
      phone: current.phone || profile.phoneNo || "",
    }));
  }, [auth.email, profile]);

  useEffect(() => {
    if (!locationState?.paymentFeedback) return;

    setPaymentFeedback(locationState.paymentFeedback);
    setSelectedPaymentMethod(locationState.paymentFeedback.gateway);
    setPaymentMethodError("");
  }, [locationState?.paymentFeedback]);

  useEffect(() => {
    setSubscriptionHistoryPage(0);
  }, [subscriptionHistorySortDirection, subscriptionHistoryStatus]);

  useEffect(() => {
    if (!subscriptionHistoryFilterOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        subscriptionHistoryFilterRef.current &&
        !subscriptionHistoryFilterRef.current.contains(event.target as Node)
      ) {
        setSubscriptionHistoryFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [subscriptionHistoryFilterOpen]);

  useEffect(() => {
    if (!isPlanDialogOpen || !plans?.length) return;

    const selectedIndex = plans.findIndex(
      (plan) => normalizePlanType(plan.planType) === selectedPlanId
    );
    setMobilePlanIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isPlanDialogOpen, plans, selectedPlanId]);

  useEffect(() => {
    if (hasInitializedSelection || !plans?.length) return;

    const fallbackPlan = plans.find((plan) => plan.mostPopular) ?? plans[0] ?? null;
    const preferredPlan =
      initialSelectionSource != null
        ? plans.find(
            (plan) =>
              normalizePlanType(plan.planType) === normalizePlanType(initialSelectionSource.planType)
          ) ?? fallbackPlan
        : fallbackPlan;

    if (preferredPlan) {
      setSelectedPlan(normalizePlanType(preferredPlan.planType));
    }

    if (initialSelectionSource) {
      setBillingCycle(fromApiBillingCycle(initialSelectionSource.billingCycle));
    }

    setHasInitializedSelection(true);
  }, [hasInitializedSelection, initialSelectionSource, plans]);
  const selectionMatchesCheckoutSubscription = Boolean(
    checkoutSubscription &&
      normalizePlanType(checkoutSubscription.planType) === selectedPlanId &&
      checkoutSubscription.billingCycle === toApiBillingCycle(billingCycle)
  );

  const baseAmount = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.baseAmount ?? 0
    : selectedPlanDetails
      ? billingCycle === "yearly"
        ? selectedPlanDetails.yearlyBaseAmount
        : selectedPlanDetails.monthlyPrice
      : 0;
  const discountAmount = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.discountAmount ?? 0
    : selectedPlanDetails
      ? billingCycle === "yearly"
        ? selectedPlanDetails.yearlySavingsAmount
        : 0
      : 0;
  const billedAmount = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.billedAmount ?? 0
    : selectedPlanDetails
      ? billingCycle === "yearly"
        ? selectedPlanDetails.yearlyBilledAmount
        : selectedPlanDetails.monthlyPrice
      : 0;
  const discountPercent = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.discountPercent ?? 0
    : selectedPlanDetails
      ? billingCycle === "yearly"
        ? selectedPlanDetails.yearlyDiscountPercent
        : 0
      : 0;
  const taxRate = selectionMatchesCheckoutSubscription ? checkoutSubscription?.taxRate ?? 0 : 0;
  const taxAmount = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.taxAmount ?? 0
    : 0;
  const serviceChargeRate = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.serviceChargeRate ?? 0
    : 0;
  const serviceChargeAmount = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.serviceChargeAmount ?? 0
    : 0;
  const totalAmount = selectionMatchesCheckoutSubscription
    ? checkoutSubscription?.totalAmount ?? billedAmount
    : billedAmount;
  const currency = selectedPlanDetails?.currency ?? "NPR";
  const selectedPaymentMethodDetails =
    PAYMENT_METHODS.find((method) => method.id === selectedPaymentMethod) ?? null;
  const selectionNarrative = getSelectionNarrative(
    currentMembership,
    hasQueuedMembership,
    selectedPlanDetails,
    billingCycle
  );
  const subscriptionHistory = subscriptionHistoryQuery.data ?? null;
  const subscriptionHistoryItems = subscriptionHistory?.items ?? [];
  const subscriptionHistorySortLabel =
    HISTORY_SORT_OPTIONS.find((option) => option.value === subscriptionHistorySortDirection)?.label ??
    "Newest first";
  const subscriptionHistoryTotalItems = subscriptionHistory?.totalItems ?? subscriptionHistoryItems.length;
  const activeSubscriptionHistoryFilterCount =
    (subscriptionHistoryStatus !== "ALL" ? 1 : 0) +
    (subscriptionHistorySortDirection !== "DESC" ? 1 : 0);
  const isBusy =
    isUpdatingMembership ||
    isSavingSelection ||
    isInitiatingPayment ||
    plansQuery.isLoading ||
    subscriptionQuery.isLoading ||
    profileQuery.isLoading;
  const continueActionDisabled = isBusy || isNextMembershipSelectionLocked || !selectedPlanDetails;

  const clearPaymentFeedback = () => setPaymentFeedback(null);
  const clearSubscriptionHistoryFilters = () => {
    setSubscriptionHistoryStatus("ALL");
    setSubscriptionHistorySortDirection("DESC");
    setSubscriptionHistoryPage(0);
    setSubscriptionHistoryFilterOpen(false);
  };
  const handleSubscriptionHistoryRefresh = () => {
    void subscriptionHistoryQuery.refetch().then((result) => {
      if (result.error) {
        toast.error(
          getApiErrorMessage(result.error, "Failed to refresh subscription history")
        );
      }
    });
  };

  const openPauseDialog = () => {
    setPauseDays(FLEXIBLE_PAUSE_OPTIONS[0]);
    setPauseStartDate(getTomorrowIsoDate());
    setPauseStartDateError("");
    setIsPauseDialogOpen(true);
  };

  const syncMembershipState = (response: UserSubscriptionResponse) => {
    authStore.updateOnboardingStatus({
      profileCompleted: response.profileCompleted,
      hasSubscription: response.hasSubscription,
      hasActiveSubscription: response.hasActiveSubscription,
    });
    setSelectedSubscription((current) =>
      current?.subscriptionId === response.subscriptionId ? response : current
    );
    void subscriptionQuery.refetch();
  };

  const setKhaltiBillingField = (
    field: keyof KhaltiBillingState,
    value: KhaltiBillingState[keyof KhaltiBillingState]
  ) => {
    setKhaltiBilling((current) => ({ ...current, [field]: value }));
    setKhaltiBillingErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const validateKhaltiBilling = () => {
    const nextErrors: KhaltiBillingErrors = {};
    const name = khaltiBilling.name.trim();
    const email = khaltiBilling.email.trim();
    const phone = khaltiBilling.phone.trim();

    if (!name) nextErrors.name = "Name is required";
    if (!email) nextErrors.email = "Email is required";
    else if (!SIMPLE_EMAIL_REGEX.test(email)) nextErrors.email = "Enter a valid email";
    if (!NEPAL_MOBILE_REGEX.test(phone)) {
      nextErrors.phone = "Phone must start with 98 or 97 and be exactly 10 digits";
    }

    setKhaltiBillingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validatePaymentSelection = () => {
    if (!selectedPlanDetails) {
      toast.error("Choose a membership plan before continuing.");
      return false;
    }

    if (!selectedPaymentMethod) {
      setPaymentMethodError("Select a payment method");
      return false;
    }

    if (selectedPaymentMethod === "khalti" && !validateKhaltiBilling()) {
      setPaymentMethodError("Complete Khalti billing details to continue");
      return false;
    }

    setPaymentMethodError("");
    return true;
  };

  const persistSelectedMembership = async () => {
    if (!selectedPlanDetails) {
      toast.error("Select a plan before continuing.");
      return null;
    }

    setIsSavingSelection(true);

    try {
      const response = await selectMySubscriptionApi({
        planId: selectedPlanDetails.planId,
        billingCycle: toApiBillingCycle(billingCycle),
      });

      setSelectedSubscription(response);
      setSelectedPlan(normalizePlanType(response.planType));
      setBillingCycle(fromApiBillingCycle(response.billingCycle));
      authStore.updateOnboardingStatus({
        profileCompleted: response.profileCompleted,
        hasSubscription: response.hasSubscription,
        hasActiveSubscription: response.hasActiveSubscription,
      });
      return response;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save selected membership"));
      return null;
    } finally {
      setIsSavingSelection(false);
    }
  };

  const getCheckoutSubscription = async () => {
    if (selectionMatchesCheckoutSubscription && checkoutSubscription) {
      return checkoutSubscription;
    }

    return persistSelectedMembership();
  };

  const startEsewaCheckout = async () => {
    const nextSubscription = await getCheckoutSubscription();
    if (!nextSubscription) return;

    clearPaymentFeedback();
    setIsInitiatingPayment(true);

    try {
      const response = await initiateEsewaPaymentApi({
        subscriptionId: nextSubscription.subscriptionId,
        successUrl: buildFrontendCallbackUrl("/payments/esewa/success", { flow: "membership" }),
        failureUrl: buildFrontendCallbackUrl("/payments/esewa/failure", { flow: "membership" }),
      });

      submitEsewaForm(response.paymentUrl, response.formFields);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to start eSewa payment"));
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const startKhaltiCheckout = async () => {
    const nextSubscription = await getCheckoutSubscription();
    if (!nextSubscription) return;

    clearPaymentFeedback();
    setIsInitiatingPayment(true);

    try {
      const response = await initiateKhaltiPaymentApi({
        subscriptionId: nextSubscription.subscriptionId,
        returnUrl: buildFrontendCallbackUrl("/payments/khalti/return", { flow: "membership" }),
        websiteUrl: window.location.origin,
        billingName: khaltiBilling.name.trim(),
        billingEmail: khaltiBilling.email.trim(),
        billingPhoneNumber: khaltiBilling.phone.trim(),
      });

      window.location.assign(response.paymentUrl);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to start Khalti payment"));
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleUpgrade = async () => {
    if (isBusy || isNextMembershipSelectionLocked) return;
    if (!validatePaymentSelection()) return;

    if (selectedPaymentMethod === "khalti") {
      await startKhaltiCheckout();
      return;
    }

    await startEsewaCheckout();
  };

  const handlePauseMembership = async () => {
    if (!currentMembership || !canPauseCurrentMembership) return;
    if (!pauseStartDate) {
      setPauseStartDateError("Select a pause start date.");
      return;
    }

    setIsUpdatingMembership(true);

    try {
      const response = await pauseMySubscriptionApi({ pauseStartDate, pauseDays });
      syncMembershipState(response);
      setIsPauseDialogOpen(false);
      setPauseStartDateError("");
      toast.success(
        `Pause scheduled from ${formatMembershipDate(
          response.scheduledPauseStartAt ?? pauseStartDate
        )} for ${pauseDays} day${pauseDays === 1 ? "" : "s"}.`
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to pause membership"));
    } finally {
      setIsUpdatingMembership(false);
    }
  };

  const handleResumeMembership = async () => {
    if (!currentMembership || !canResumeCurrentMembership) return;

    setIsUpdatingMembership(true);

    try {
      const response = await resumeMySubscriptionApi();
      syncMembershipState(response);
      toast.success(
        hasScheduledPause
          ? "Scheduled pause cancelled."
          : "Membership resumed. Gym access is active again."
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to resume membership"));
    } finally {
      setIsUpdatingMembership(false);
    }
  };

  if (plansQuery.isLoading || subscriptionQuery.isLoading || profileQuery.isLoading) {
    return (
      <UserLayout
        activeSection="membership"
        onSectionChange={(section) => navigate("/dashboard", { state: { activeSection: section } })}
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />
        </div>
      </UserLayout>
    );
  }

  if (plansQuery.isError || subscriptionQuery.isError || profileQuery.isError) {
    return (
      <UserLayout
        activeSection="membership"
        onSectionChange={(section) => navigate("/dashboard", { state: { activeSection: section } })}
      >
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-lg font-black uppercase text-white">
              Membership details could not be loaded
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {getApiErrorMessage(
                plansQuery.error ?? subscriptionQuery.error ?? profileQuery.error,
                "Try refreshing the page."
              )}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void Promise.all([
                    plansQuery.refetch(),
                    subscriptionQuery.refetch(),
                    profileQuery.refetch(),
                  ]);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-orange-200 transition-colors hover:bg-orange-500/15"
              >
                <RefreshCw size={14} />
                Retry
              </button>
              <button
                type="button"
                onClick={() => navigate("/profile?tab=membership")}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.07]"
              >
                Back to Profile
              </button>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout
      activeSection="membership"
      onSectionChange={(section) => navigate("/dashboard", { state: { activeSection: section } })}
    >
      <UserSectionShell
        eyebrow="Membership"
        title={
          <>
            <span className="text-gradient-fire">Membership</span> Management
          </>
        }
        description="Manage the current term, queue the next membership, handle pause controls, and review subscription history from one place."
        width="wide"
        actions={
          <button
            type="button"
            onClick={() => navigate("/profile?tab=membership")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.07]"
          >
            <ArrowLeft size={14} />
            Back to Profile
          </button>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-orange-500/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.22),rgba(17,17,17,0.94)_35%,rgba(17,17,17,0.94))] p-6 sm:p-7">
            <div className="absolute -right-12 top-0 h-44 w-44 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-yellow-400/10 blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-100">
                <Sparkles size={14} />
                {selectionNarrative.chip}
              </div>

              <h2 className="mt-4 max-w-xl text-3xl font-black uppercase leading-[1.05] text-white sm:text-4xl">
                Keep the current term under control while you line up what comes next.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/80">
                {selectionNarrative.description} Payment, pause management, current pause limits,
                and account-wide history all stay on this page.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[18px] border table-border table-bg-alt px-4 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10 text-orange-400">
                  <Crown size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Membership State
                  </p>
                  <p className="mt-0.5 text-[15px] font-black uppercase text-white">
                    {membershipStateLabel}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed table-text-muted">
                Active, scheduled pause, paused, upcoming, and pending states are translated into member-friendly labels here.
              </p>
            </div>

            <div className="rounded-[18px] border table-border table-bg-alt px-4 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10 text-orange-400">
                  <Wallet size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Next Membership
                  </p>
                  <p className="mt-0.5 text-[15px] font-black uppercase text-white">
                    {selectedPlanDetails?.name ?? "Choose one"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed table-text-muted">
                {selectionNarrative.description}
              </p>
            </div>

            <div className="rounded-[18px] border table-border table-bg-alt px-4 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-orange-500/20 bg-orange-500/10 text-orange-400">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Pause Limits Left
                  </p>
                  <p className="mt-0.5 text-[15px] font-black uppercase text-white">
                    {currentMembership
                      ? `${remainingFlexiblePauses} total / ${remainingPausesThisWindow} this window`
                      : "Available after activation"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed table-text-muted">
                Cancelled scheduled pauses stay in history but do not consume these remaining allowances.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[22px] border table-border table-bg shadow-sm p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionLabel>Current Membership</SectionLabel>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                Track what is active right now, use flexible pause when life gets busy,
                and resume access the moment you are ready to train again.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFlexibleInfoOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.07]"
            >
              Flexible subscription guide
            </button>
          </div>

          {currentMembership ? (
            <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
              <div className="rounded-[1.5rem] border border-orange-500/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(17,17,17,0.92))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                      <BadgeCheck size={14} />
                      Current membership
                    </div>
                    <p className="mt-4 text-2xl font-black uppercase text-white sm:text-3xl">
                      {currentMembership.planName}
                    </p>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100/80">
                      {currentMembership.planType} | {currentMembership.billingCycle.toLowerCase()}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
                      getMembershipStateClasses(membershipStateLabel)
                    )}
                  >
                    {membershipStateLabel}
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/85">
                  {flexibleSubscriptionContext}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Started
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatMembershipDate(currentMembership.startsAt)}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Access Until
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatMembershipDate(currentMembership.endsAt)}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Remaining Total
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {remainingFlexiblePauses} of {totalPauseLimit}
                    </p>
                  </div>

                  <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Remaining Window
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {remainingPausesThisWindow} of {pauseLimitPerWindow}
                    </p>
                  </div>
                </div>

                {hasScheduledPause ? (
                  <div className="mt-4 rounded-[1.2rem] border border-sky-500/20 bg-sky-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                      Scheduled pause
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-sky-50">
                      Pause begins on {formatMembershipDate(currentMembership.scheduledPauseStartAt)}
                      {" "}and runs until {formatMembershipDate(currentMembership.scheduledPauseUntil)}.
                      Use resume to cancel it before it starts.
                    </p>
                  </div>
                ) : null}

                {currentMembership.subscriptionStatus === "PAUSED" ? (
                  <div className="mt-4 rounded-[1.2rem] border border-amber-500/20 bg-amber-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                      Pause window
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-amber-50">
                      Paused until {formatMembershipDate(currentMembership.pauseUntil)}. If you
                      resume earlier, unused paused days are removed from the extended end date.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[22px] border table-border table-bg-alt px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-black/30 text-orange-300">
                    <BadgeCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Flexible Controls
                    </p>
                    <p className="mt-1 text-lg font-black uppercase text-white">
                      Pause Or Resume
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  {hasScheduledPause
                    ? "A pause is already scheduled for this membership. Resume now if you want to cancel that schedule."
                    : currentMembership.subscriptionStatus === "PAUSED"
                    ? "Your membership is paused right now. Resume it anytime to reactivate access sooner."
                    : remainingFlexiblePauses <= 0
                      ? "This subscription has already used all of its flexible pause allowances."
                      : remainingPausesThisWindow <= 0
                        ? "This billing window has no pause slots left. Try again in the next window."
                        : `Schedule a future pause for 7, 14, or 30 days. You still have ${remainingFlexiblePauses} flexible pause${remainingFlexiblePauses === 1 ? "" : "s"} left, with ${remainingPausesThisWindow} available in this window.`}
                </p>

                <div className="mt-5 grid gap-3">
                  <button
                    type="button"
                    onClick={openPauseDialog}
                    disabled={!canPauseCurrentMembership || isBusy}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-[1rem] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] transition-all",
                      canPauseCurrentMembership && !isBusy
                        ? "bg-[linear-gradient(135deg,#FF6A00,#FF9500)] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(249,115,22,0.42)]"
                        : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-slate-500"
                    )}
                  >
                    Pause
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleResumeMembership()}
                    disabled={!canResumeCurrentMembership || isBusy}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-[1rem] border px-5 py-3 text-sm font-black uppercase tracking-[0.08em] transition-colors",
                      canResumeCurrentMembership && !isBusy
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                        : "cursor-not-allowed border-white/10 bg-white/[0.03] text-slate-500"
                    )}
                  >
                    {hasScheduledPause ? "Cancel scheduled pause" : "Resume"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFlexibleInfoOpen(true)}
                    className="inline-flex w-full items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                  >
                    How flexible subscription works
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.02] p-5">
              <p className="text-lg font-black uppercase text-white">No live membership yet</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                Choose a plan below to start your membership. Once a membership becomes active,
                this area will show its status and flexible pause controls.
              </p>
            </div>
          )}

          {queuedMembership ? (
            <div className="mt-4 rounded-[1.5rem] border border-sky-500/15 bg-sky-500/[0.07] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                    <ArrowUpRight size={14} />
                    Upcoming membership
                  </div>
                  <p className="mt-3 text-sm font-black uppercase text-white">
                    {queuedMembership.planName}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Starts on {formatMembershipDate(queuedMembership.startsAt)} with{" "}
                    {queuedMembership.billingCycle.toLowerCase()} billing. No second queued
                    membership can be created until this one is used or cleared.
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
                    getSubscriptionStatusClasses(queuedMembership.subscriptionStatus)
                  )}
                >
                  {getSubscriptionStatusLabel(queuedMembership.subscriptionStatus)}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.9rem] border border-white/8 bg-[#090909] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Choose Next Membership</SectionLabel>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                Review plans in a popup, renew early on the same plan, or queue a different plan
                or billing cycle for the next term.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
                {selectionNarrative.chip}
              </div>
              {isNextMembershipSelectionLocked ? (
                <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-100">
                  Upcoming membership queued
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.5rem] border border-orange-500/15 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(17,17,17,0.92))] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                    Selected next membership
                  </p>
                  <p className="mt-2 text-2xl font-black uppercase text-white">
                    {selectedPlanDetails?.name ?? "Choose a plan"}
                  </p>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100/80">
                    {selectedPlanDetails?.planType ?? "N/A"} | {billingCycle}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                  {selectionNarrative.chip}
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/85">
                {hasQueuedMembership
                  ? "This account already has a queued next membership. You can still inspect plans, but you cannot create a second queued term."
                  : selectionNarrative.description}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Billing
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {billingCycle === "yearly" ? "Yearly" : "Monthly"}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Estimated total
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {currency} {formatCurrencyAmount(totalAmount)}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-white/10 bg-black/20 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Starts
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {queuedMembership ? formatMembershipDate(queuedMembership.startsAt) : "After payment"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/8 bg-[#101010] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-black/30 text-orange-300">
                  <Wallet size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Plan Selection
                  </p>
                  <p className="mt-1 text-lg font-black uppercase text-white">
                    View plans in popup
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                The popup keeps the existing monthly or yearly toggle, opens with the currently
                selected plan focused, and lets you update the summary without leaving this page.
              </p>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsPlanDialogOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-orange-500/25 bg-orange-500/10 px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-orange-100 transition-colors hover:bg-orange-500/15"
                >
                  View Plans
                  <ChevronRight size={16} />
                </button>

                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-400">
                  {hasQueuedMembership
                    ? "Selection is locked because only one upcoming membership can exist at a time."
                    : "Selecting the same plan and same billing cycle queues an early renewal. Selecting a different plan or cycle queues the next change instead."}
                </div>
              </div>
            </div>
          </div>
        </section>

        <MembershipPlanDialog
          open={isPlanDialogOpen}
          onOpenChange={setIsPlanDialogOpen}
          plans={plans ?? []}
          isMobile={isMobile}
          selectedPlanId={selectedPlanId}
          billingCycle={billingCycle}
          onBillingChange={(cycle) => {
            setBillingCycle(cycle);
            clearPaymentFeedback();
          }}
          onSelectPlan={(planId, cycle) => {
            setSelectedPlan(planId);
            setBillingCycle(cycle);
            clearPaymentFeedback();
          }}
          isSelectionLocked={isNextMembershipSelectionLocked}
          mobilePlanIndex={mobilePlanIndex}
          onMobilePlanIndexChange={setMobilePlanIndex}
        />

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[1.9rem] border border-white/8 bg-[#090909] p-5 sm:p-6">
            <SectionLabel>Payment Gateway</SectionLabel>
            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-slate-400">
              FitPal saves your selected membership first, then hands you to the payment
              provider. Access changes only after the gateway result is verified.
            </p>

            <div className="space-y-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = selectedPaymentMethod === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      if (!method.isAvailable) {
                        toast.info(`${method.name} checkout is not available right now.`);
                        return;
                      }

                      clearPaymentFeedback();
                      setSelectedPaymentMethod(method.id);
                      setPaymentMethodError("");

                      if (method.id === "khalti" && profile) {
                        setKhaltiBilling((current) => ({
                          name:
                            current.name ||
                            [profile.firstName, profile.lastName]
                              .filter(Boolean)
                              .join(" ")
                              .trim() ||
                            profile.userName ||
                            "",
                          email: current.email || profile.email || auth.email || "",
                          phone: current.phone || profile.phoneNo || "",
                        }));
                      }
                    }}
                    disabled={!method.isAvailable}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-[1.4rem] border p-4 text-left transition-all",
                      !method.isAvailable && "cursor-not-allowed opacity-60",
                      isSelected
                        ? "border-orange-500/40 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl",
                        method.colorClass
                      )}
                    >
                      {method.logoUrl ? (
                        <img src={method.logoUrl} alt={method.name} className="h-10 w-20 object-contain" />
                      ) : (
                        <span className="text-2xl font-black">{method.badge}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase text-white">{method.name}</p>
                        {isSelected ? (
                          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-orange-200">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-400">
                        {method.subtitle}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        isSelected ? "border-orange-500 bg-orange-500/15" : "border-white/20"
                      )}
                    >
                      {isSelected ? <div className="h-2.5 w-2.5 rounded-full bg-orange-400" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <FieldError message={paymentMethodError} />
            {paymentFeedback ? (
              <div className="mt-4 rounded-[1.4rem] border border-amber-500/20 bg-[linear-gradient(135deg,rgba(120,63,23,0.16),rgba(15,15,15,0.86))] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-200">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-200">
                        {paymentFeedback.status === "cancelled"
                          ? "Payment cancelled"
                          : "Payment failed"}
                      </p>
                      <span className="rounded-full border border-amber-500/20 bg-black/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                        {paymentFeedback.gateway === "khalti" ? "Khalti" : "eSewa"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-amber-100">
                      {paymentFeedback.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        disabled={continueActionDisabled}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-100 transition-colors hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw size={13} className={isBusy ? "animate-spin" : ""} />
                        Retry payment
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/profile?tab=membership")}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-colors hover:bg-white/[0.07]"
                      >
                        Return to profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedPaymentMethod === "khalti" ? (
              <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-black/25 p-4">
                <SectionLabel className="!mb-3">Khalti Billing Info</SectionLabel>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full Name" error={khaltiBillingErrors.name} className="sm:col-span-2">
                    <TextInput
                      type="text"
                      placeholder="Full name"
                      value={khaltiBilling.name}
                      onChange={(event) => setKhaltiBillingField("name", event.target.value)}
                    />
                  </Field>
                  <Field label="Email" error={khaltiBillingErrors.email}>
                    <TextInput
                      type="email"
                      placeholder="you@example.com"
                      value={khaltiBilling.email}
                      onChange={(event) => setKhaltiBillingField("email", event.target.value)}
                    />
                  </Field>
                  <Field label="Phone (98/97 + 8 digits)" error={khaltiBillingErrors.phone}>
                    <TextInput
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="98xxxxxxxx"
                      value={khaltiBilling.phone}
                      onChange={(event) =>
                        setKhaltiBillingField(
                          "phone",
                          event.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            ) : null}

            <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-black/20 text-emerald-300">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-black uppercase text-white">
                    Secure membership checkout
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">
                    We send only the minimum payment details to the selected gateway. Your
                    FitPal membership changes after backend verification succeeds.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="xl:sticky xl:top-6">
            <div className="rounded-[1.9rem] border border-white/8 bg-[#090909] p-5 sm:p-6">
              <SectionLabel>Order Summary</SectionLabel>

              <div className="rounded-[1.4rem] border border-orange-500/15 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(17,17,17,0.94))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                      Selected Membership
                    </p>
                    <p className="mt-2 text-xl font-black uppercase text-white">
                      {selectedPlanDetails?.name ?? "Choose a plan"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-orange-100/80">
                      {selectedPlanDetails?.planType ?? "N/A"} | {billingCycle}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                    {selectedPaymentMethodDetails?.name ?? "Select gateway"}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedPlanDetails?.features ?? []).slice(0, 5).map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium text-slate-200"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>Base amount</span>
                  <span className="font-semibold text-white">
                    {currency} {formatCurrencyAmount(baseAmount)}
                  </span>
                </div>

                {discountAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>
                      Discount
                      {discountPercent > 0 ? (
                        <span className="ml-2 text-[11px] text-emerald-400">
                          ({discountPercent.toFixed(0)}%)
                        </span>
                      ) : null}
                    </span>
                    <span className="font-semibold text-emerald-400">Included</span>
                  </div>
                ) : null}

                {serviceChargeAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>
                      Service charge
                      {serviceChargeRate > 0 ? (
                        <span className="ml-2 text-[11px] text-slate-500">
                          ({(serviceChargeRate * 100).toFixed(0)}%)
                        </span>
                      ) : null}
                    </span>
                    <span className="font-semibold text-white">
                      {currency} {formatCurrencyAmount(serviceChargeAmount)}
                    </span>
                  </div>
                ) : null}

                {taxAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>
                      Tax
                      {taxRate > 0 ? (
                        <span className="ml-2 text-[11px] text-slate-500">
                          ({(taxRate * 100).toFixed(0)}%)
                        </span>
                      ) : null}
                    </span>
                    <span className="font-semibold text-white">
                      {currency} {formatCurrencyAmount(taxAmount)}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="my-5 h-px bg-white/8" />

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 text-3xl font-black text-white">
                    {currency} {formatCurrencyAmount(totalAmount)}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                  {billingCycle === "yearly" ? "Yearly bill" : "Monthly bill"}
                </div>
              </div>

              <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm font-black uppercase text-white">
                  Checkout note
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {hasQueuedMembership
                    ? "An upcoming membership is already queued on this account, so this next-membership checkout is locked for now."
                    : `You will be redirected to ${selectedPaymentMethodDetails?.name ?? "the payment gateway"} to finish payment. FitPal only applies this renewal or plan change after gateway verification succeeds.`}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={continueActionDisabled}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(249,115,22,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/profile?tab=membership")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                >
                  Back to profile
                </button>
              </div>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
                By continuing you agree to FitPal&apos;s subscription and payment policy.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.9rem] border border-white/8 bg-[#090909] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>Pause History</SectionLabel>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                Current-subscription pause events are shown newest first. Cancelled scheduled
                pauses stay visible here for reference.
              </p>
            </div>
            {currentMembership ? (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-200">
                {currentPauseHistory.length} event{currentPauseHistory.length === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>

          {!currentMembership ? (
            <div className="rounded-[1.4rem] border border-dashed border-white/12 bg-white/[0.02] p-5">
              <p className="text-lg font-black uppercase text-white">No current subscription</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                Pause history appears once you have an active membership term to manage.
              </p>
            </div>
          ) : currentPauseHistory.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-white/12 bg-white/[0.02] p-5">
              <p className="text-lg font-black uppercase text-white">No pause events yet</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                Schedule a future pause from this page when needed. Completed, resumed, and
                cancelled scheduled pauses will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {currentPauseHistory.map((event) => (
                <div
                  key={event.pauseEventId}
                  className="rounded-[1.45rem] border border-white/8 bg-[#101010] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Pause event
                      </p>
                      <p className="mt-2 text-lg font-black uppercase text-white">
                        {formatPauseDuration(event.pauseDays)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
                        getPauseHistoryStatusClasses(event.historyStatus)
                      )}
                    >
                      {getPauseHistoryLabel(event.historyStatus)}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        <CalendarDays size={14} />
                        Pause Start
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatMembershipDate(event.pauseStartAt)}
                      </p>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        <Clock3 size={14} />
                        Planned Resume
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatMembershipDate(event.plannedResumeAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-[1rem] border border-white/10 bg-black/20 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Actual Outcome
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {event.actualResumeAt
                        ? event.historyStatus === "CANCELLED_SCHEDULED"
                          ? `Cancelled on ${formatMembershipDate(event.actualResumeAt)} before the scheduled pause began.`
                          : `Resolved on ${formatMembershipDate(event.actualResumeAt)}.`
                        : "No actual resume or cancellation has been recorded yet."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.9rem] border border-white/8 bg-[#090909] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 rounded-2xl border table-border table-bg p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <SectionLabel>Subscription History</SectionLabel>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                  Review every membership term on the account, including pending, upcoming,
                  active, paused, expired, cancelled, and failed subscriptions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSubscriptionHistoryRefresh}
                  disabled={subscriptionHistoryQuery.isFetching}
                  className="flex items-center gap-1.5 rounded-full border table-border table-bg px-3.5 py-[7px] text-[12px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      subscriptionHistoryQuery.isFetching ? "animate-spin" : undefined
                    )}
                  />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSubscriptionHistorySortDirection((current) =>
                      current === "DESC" ? "ASC" : "DESC"
                    )
                  }
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
                    subscriptionHistorySortDirection !== "DESC"
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                      : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"
                  }`}
                >
                  <SubscriptionHistorySortIcon direction={subscriptionHistorySortDirection} />
                  {subscriptionHistorySortLabel}
                </button>

                <div ref={subscriptionHistoryFilterRef} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setSubscriptionHistoryFilterOpen((open) => !open)
                    }
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
                      subscriptionHistoryFilterOpen
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                        : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"
                    }`}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeSubscriptionHistoryFilterCount > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-black leading-none text-white">
                        {activeSubscriptionHistoryFilterCount}
                      </span>
                    ) : null}
                  </button>

                  {subscriptionHistoryFilterOpen ? (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[240px] rounded-2xl border table-border table-bg p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                      <div className="px-2.5 pb-2 pt-1">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                          History filters
                        </p>
                      </div>
                      <div className="px-2.5 pb-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Status
                      </div>
                      {SUBSCRIPTION_HISTORY_STATUS_OPTIONS.map((option) => {
                        const isActive = subscriptionHistoryStatus === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setSubscriptionHistoryStatus(option.value);
                              setSubscriptionHistoryFilterOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "bg-orange-500/12 text-orange-300"
                                : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                            }`}
                          >
                            <span>{option.label}</span>
                            {isActive ? <CheckCircle2 className="h-4 w-4" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {activeSubscriptionHistoryFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearSubscriptionHistoryFilters}
                    className="flex items-center gap-1.5 rounded-full border table-border table-bg px-3.5 py-[7px] text-[12px] font-bold table-text transition-all hover:border-white/20 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-slate-400">
                {subscriptionHistoryTotalItems > 0
                  ? `Showing ${subscriptionHistoryItems.length} of ${subscriptionHistoryTotalItems} membership terms.`
                  : "No membership terms match the current filters yet."}
              </p>
              <span className="inline-flex w-fit items-center rounded-full border table-border table-bg-alt px-3.5 py-1.5 text-[11px] font-semibold text-white">
                {subscriptionHistoryTotalItems} total
              </span>
            </div>
          </div>

          {subscriptionHistoryQuery.isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border table-border table-bg py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />
            </div>
          ) : subscriptionHistoryQuery.isError ? (
            <div className="rounded-2xl border table-border table-bg p-6 text-center">
              <p className="text-sm font-bold text-red-200">
                Subscription history could not be loaded.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {getApiErrorMessage(subscriptionHistoryQuery.error, "Try refreshing the history list.")}
              </p>
            </div>
          ) : subscriptionHistoryItems.length === 0 ? (
            <div className="rounded-2xl border table-border table-bg px-6 py-14 text-center">
              <Search className="mx-auto h-10 w-10 text-orange-400" />
              <p className="mt-4 text-lg font-black uppercase text-white">No subscriptions found</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                There are no membership terms matching the current filters yet.
              </p>
            </div>
          ) : isMobile ? (
            <SubscriptionHistoryCards items={subscriptionHistoryItems} />
          ) : (
            <div className="overflow-hidden rounded-[18px] border table-border table-bg">
              <Table>
                <TableHeader>
                  <TableRow className="table-header-bg table-border border-b hover:bg-transparent">
                    <TableHead className="h-11 px-4 text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Plan
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Billing
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Status
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Selected
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Starts
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Ends
                    </TableHead>
                    <TableHead className="h-11 px-4 text-right text-[11px] font-bold uppercase tracking-[0.14em] table-text-muted">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionHistoryItems.map((item) => (
                    <TableRow
                      key={item.subscriptionId}
                      className="border-b table-border-row transition-colors hover:bg-white/[0.025]"
                    >
                      <TableCell className="px-4 py-3.5 font-semibold text-white">
                        {item.planName ?? "Membership"}
                        <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                          {item.planType ?? "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 table-text">
                        {item.billingCycle?.toLowerCase() ?? "N/A"}
                      </TableCell>
                      <TableCell className="px-4 py-3.5">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                            getSubscriptionStatusClasses(item.subscriptionStatus)
                          )}
                        >
                          {getSubscriptionStatusLabel(item.subscriptionStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3.5 table-text">
                        {formatMembershipDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 table-text">
                        {formatMembershipDate(item.startsAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 table-text">
                        {formatMembershipDate(item.endsAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3.5 text-right font-semibold text-white">
                        NPR {formatCurrencyAmount(item.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {subscriptionHistory && subscriptionHistory.totalPages > 1 ? (
            <div className="mt-4 flex flex-col gap-3 border-t table-border-cell pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm table-text">
                Page {subscriptionHistory.page + 1} of {subscriptionHistory.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSubscriptionHistoryPage((page) => Math.max(0, page - 1))}
                  disabled={!subscriptionHistory.hasPrevious}
                  className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="rounded-full border table-border table-bg-alt px-4 py-1.5 text-[11px] font-semibold text-white">
                  {subscriptionHistory.page + 1} / {subscriptionHistory.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSubscriptionHistoryPage((page) =>
                      subscriptionHistory.hasNext ? page + 1 : page
                    )
                  }
                  disabled={!subscriptionHistory.hasNext}
                  className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
          <DialogContent className="border-white/10 bg-[#090909] p-0 text-white sm:max-w-lg">
            <div className="rounded-[1.6rem] border border-white/8 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(9,9,9,0.98))] p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase text-white">
                  Schedule Pause
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-400">
                  Choose when the pause should begin and how long it should last. FitPal will
                  keep the membership active until that start date arrives.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5">
                <Field label="Pause Start Date" error={pauseStartDateError}>
                  <CustomDatePicker
                    value={pauseStartDate}
                    onChange={(value) => {
                      setPauseStartDate(value);
                      setPauseStartDateError("");
                    }}
                    minDate={parseDateInput(getTomorrowIsoDate())}
                    maxDate={currentMembership?.endsAt ? new Date(currentMembership.endsAt) : undefined}
                    invalid={Boolean(pauseStartDateError)}
                  />
                </Field>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {FLEXIBLE_PAUSE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPauseDays(option)}
                    className={cn(
                      "rounded-[1.2rem] border px-4 py-4 text-left transition-all",
                      pauseDays === option
                        ? "border-orange-500/35 bg-orange-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                    )}
                  >
                    <p className="text-lg font-black uppercase text-white">{option} days</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      If you keep the full pause window, the membership end date moves forward by {option} days.
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-[1.2rem] border border-amber-500/15 bg-amber-500/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                  Flexible reminder
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-50">
                  This subscription supports {totalPauseLimit} pauses in total, with up to {pauseLimitPerWindow}
                  in the current billing window. If you resume early, unused paused days are removed from the
                  extended end date.
                </p>
              </div>

              <DialogFooter className="mt-6 gap-3 sm:justify-between sm:space-x-0">
                <button
                  type="button"
                  onClick={() => setIsPauseDialogOpen(false)}
                  className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handlePauseMembership()}
                  disabled={!canPauseCurrentMembership || isUpdatingMembership}
                  className="inline-flex items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(249,115,22,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingMembership ? "Scheduling..." : `Schedule ${pauseDays}-day pause`}
                </button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isFlexibleInfoOpen} onOpenChange={setIsFlexibleInfoOpen}>
          <DialogContent className="border-white/10 bg-[#090909] p-0 text-white sm:max-w-2xl">
            <div className="rounded-[1.6rem] border border-white/8 bg-[#090909] p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase text-white">
                  Flexible Subscription Guide
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-400">
                  This is how pause and resume work for your membership right now.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 rounded-[1.3rem] border border-orange-500/15 bg-orange-500/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                  Your current context
                </p>
                <p className="mt-2 text-sm leading-relaxed text-orange-50">
                  {flexibleSubscriptionContext}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Pause limits
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    This subscription can use {totalPauseLimit} pauses across its full term,
                    with up to {pauseLimitPerWindow} pauses in the current billing window.
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Pause timing
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Pauses are scheduled from a future start date. The membership stays active
                    until that date, then access is temporarily disabled for the selected window.
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Resume early
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    You do not need to wait for the full pause window. Resume anytime and
                    FitPal removes unused paused days from the extra time added at the end. If
                    the pause has not started yet, resume simply cancels the schedule.
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Future plan changes
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Use the Choose Next Membership section to queue an early renewal, switch
                    billing, or change plans. The next term only activates after payment is verified.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsFlexibleInfoOpen(false)}
                  className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                >
                  Close
                </button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </UserSectionShell>
    </UserLayout>
  );
};

export default MembershipUpgrade;
