import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Crown,
  Eye,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Workflow,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuthState } from "@/features/auth";
import { authStore } from "@/features/auth/store";
import { getPlansApi } from "@/features/plans/api";
import { plansQueryKeys } from "@/features/plans/queryKeys";
import { initiateEsewaPaymentApi, initiateKhaltiPaymentApi } from "@/features/payment/api";
import {
  buildEsewaBillingPayload,
  buildFrontendCallbackUrl,
  buildKhaltiBillingPayload,
  type PaymentBillingErrors,
  type PaymentBillingState,
  type PaymentFailureFeedback,
  type PaymentGateway,
  type PaymentMethodDefinition,
  seedPaymentBilling,
  submitEsewaPaymentForm,
  validatePaymentBilling,
} from "@/features/payment/checkout";
import { getMyProfileApi } from "@/features/profile/api";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";
import {
  KhaltiBillingFields,
  PaymentFailureAlert,
} from "@/features/subscription/components/CheckoutSharedBlocks";
import { Field, FieldError, SectionLabel, TextInput } from "@/shared/ui/form-kit";
import {
  getMySubscriptionHistoryApi,
  getMySubscriptionApi,
  pauseMySubscriptionApi,
  resumeMySubscriptionApi,
  selectMySubscriptionApi,
} from "@/features/subscription/api";
import ViewPlansDialog from "@/features/subscription/components/ViewPlansDialog";
import type { PlanResponse } from "@/features/plans/model";
import type {
  BillingCycle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
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
type PaymentMethodId = PaymentGateway;

type UpgradeMembershipLocationState = {
  paymentFeedback?: PaymentFailureFeedback;
};

type MembershipIntent = "activate" | "renew-early" | "switch-billing" | "upgrade" | "plan-change";
type MembershipActionType = "renew" | "change-plan" | "pause" | "resume";
type RenewActionStep = "plan" | "payment";
type KhaltiBillingState = PaymentBillingState;
type KhaltiBillingErrors = PaymentBillingErrors;

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

const PAUSE_DAYS_MIN = 1;
const PAUSE_DAYS_MAX = 30;
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

const getPauseUntilIsoDate = (pauseStartDate: string | null | undefined, pauseDays: number) => {
  const startsAt = parseDateInput(pauseStartDate);
  if (!startsAt || !Number.isFinite(pauseDays) || pauseDays < PAUSE_DAYS_MIN) {
    return null;
  }

  const pauseUntil = new Date(startsAt);
  pauseUntil.setDate(pauseUntil.getDate() + Math.trunc(pauseDays));
  return toIsoLocalDate(pauseUntil);
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

const formatBillingCycleLabel = (cycle: BillingCycle | PlanFrequency | null | undefined) => {
  if (!cycle) return "Not available";

  const normalized = cycle.toLowerCase();
  return normalized === "yearly" ? "Yearly" : "Monthly";
};

interface MembershipActionSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}

function MembershipActionSurface({
  open,
  onOpenChange,
  isMobile,
  title,
  description,
  className,
  children,
}: MembershipActionSurfaceProps) {
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn("max-h-[92vh] table-border user-surface text-white", className)}>
          <DrawerHeader className="border-b table-border-cell px-4 pb-3 pt-2 text-left">
            <DrawerTitle className="text-xl font-black uppercase text-white">{title}</DrawerTitle>
            <DrawerDescription className="text-sm leading-relaxed table-text-muted">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4 pt-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("table-border user-surface p-0 text-white", className)}
      >
        <div className="max-h-[88vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-white">{title}</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed table-text-muted">
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionHistoryCards({ items }: { items: UserSubscriptionHistoryItemResponse[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.subscriptionId}
          className="rounded-[14px] border table-border user-surface-soft p-3 shadow-sm transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04] sm:rounded-[18px] sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-orange-500/25 bg-orange-500/10 sm:h-10 sm:w-10 sm:rounded-[10px]">
                <Crown className="h-3.5 w-3.5 text-orange-400 sm:h-4 sm:w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-tight text-white sm:text-sm">
                  {item.planName ?? "Membership"}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400 sm:mt-1 sm:text-[11px]">
                  {item.planType ?? "N/A"} · {item.billingCycle?.toLowerCase() ?? "N/A"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] sm:px-2.5 sm:py-1 sm:text-[10px]",
                getSubscriptionStatusClasses(item.subscriptionStatus)
              )}
            >
              {getSubscriptionStatusLabel(item.subscriptionStatus)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] sm:mt-3 sm:gap-3 sm:text-[11px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Selected</p>
              <p className="mt-0.5 font-semibold text-slate-200">{formatMembershipDate(item.createdAt)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Total</p>
              <p className="mt-0.5 font-black text-white">NPR {formatCurrencyAmount(item.totalAmount)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Starts</p>
              <p className="mt-0.5 text-slate-200">{formatMembershipDate(item.startsAt)}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-500">Ends</p>
              <p className="mt-0.5 text-slate-200">{formatMembershipDate(item.endsAt)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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

const getPlanId = (plan: Pick<PlanResponse, "planType">) => plan.planType.toLowerCase();

interface MembershipPlanSelectorProps {
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

function MembershipPlanSelector({
  plans,
  isMobile,
  selectedPlanId,
  billingCycle,
  onBillingChange,
  onSelectPlan,
  isSelectionLocked,
  mobilePlanIndex,
  onMobilePlanIndexChange,
}: MembershipPlanSelectorProps) {
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
    const yearlyDiscount = plan.yearlyDiscountPercent;

    return (
      <div
        key={plan.planId}
        onClick={() => {
          if (!isSelectionLocked) onSelectPlan(planId, billingCycle);
        }}
        className={cn(
          "group relative flex h-full min-h-[230px] cursor-pointer flex-col rounded-[1.5rem] border text-left transition-all duration-300",
          isSelected
            ? "border-orange-500/60 user-surface"
            : plan.mostPopular
              ? "border-orange-500/30 user-surface-soft hover:border-orange-500/50"
              : "border table-border user-surface-soft hover:border-orange-500/25 hover:shadow-[0_8px_32px_-8px_rgba(234,88,12,0.1)]",
          isSelected && !plan.mostPopular && "shadow-[0_0_0_1px_rgba(234,88,12,0.15),0_16px_48px_-12px_rgba(234,88,12,0.25)]",
          plan.mostPopular && "plan-popular-inner-glow"
        )}
      >
        {/* Top glow strip for selected */}
        {isSelected && (
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/80 to-transparent" />
        )}

        {/* Most popular badge */}
        {plan.mostPopular ? (
          <div className="absolute right-3 top-3 z-10 rounded-full bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-white">
            Most Popular
          </div>
        ) : null}

        <div className={cn("flex flex-1 flex-col p-4", plan.mostPopular ? "pt-9" : "")}>
          {/* Plan header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={cn(
                "text-[9px] font-black uppercase tracking-[0.2em]",
                isSelected ? "text-orange-400" : "text-slate-500"
              )}>{plan.planType}</p>
              <p className="mt-0.5 text-sm font-black uppercase text-white">{plan.name}</p>
            </div>
            {isSelected && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            )}
          </div>

          {/* Price */}
          <div className="mt-2.5 flex flex-wrap items-end gap-1">
            <p className="text-3xl font-black tracking-tight text-white">
              {plan.currency} {formatCurrencyAmount(price)}
            </p>
            <p className="mb-0.5 text-xs font-bold text-slate-500">{isYearly ? "/yr" : "/mo"}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <p className="text-[10px] font-bold text-slate-500">{durationDays}d · {isYearly ? "Yearly" : "Monthly"}</p>
            {isYearly && yearlyDiscount > 0 ? (
              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[8px] font-black text-green-400">
                -{formatCurrencyAmount(yearlyDiscount)}%
              </span>
            ) : null}
          </div>

          <div className="my-2.5 h-px bg-white/6" />

          <ul className="flex-1 space-y-1.5">
            {plan.features.slice(0, 4).map((feature) => (
              <li key={feature} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                <CheckCircle2 className={cn("mt-0.5 h-3 w-3 shrink-0", isSelected ? "text-orange-400" : "text-slate-500")} />
                <span>{feature}</span>
              </li>
            ))}
            {plan.features.length > 4 && (
              <li className="text-[10px] text-slate-500">+{plan.features.length - 4} more</li>
            )}
          </ul>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isSelectionLocked) return;
              onSelectPlan(planId, billingCycle);
            }}
            disabled={isSelectionLocked}
            className={cn(
              "mt-3 w-full rounded-[0.7rem] px-3 py-2 text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-200",
              isSelectionLocked
                ? "cursor-not-allowed border border-white/10 user-surface-muted text-slate-500"
                : isSelected
                  ? "bg-[linear-gradient(135deg,#FF6A00,#FF9500)] text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.4)] hover:-translate-y-0.5"
                  : "border border-orange-500/20 bg-orange-500/[0.08] text-orange-200 hover:bg-orange-500/15"
            )}
          >
            {isSelectionLocked
              ? "Locked"
              : isSelected
                ? "✓ Selected"
                : `Choose ${plan.name}`}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>

      {/* Billing toggle */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-0 rounded-full border border-white/10 bg-[#1a1a1a] p-0.5">
          <button
            type="button"
            onClick={() => onBillingChange("monthly")}
            className={cn(
              "rounded-full px-4 py-1.5 text-[12px] font-bold tracking-wide transition-all",
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
              "rounded-full px-4 py-1.5 text-[12px] font-bold tracking-wide transition-all",
              isYearly
                ? "bg-orange-600 text-white shadow-[0_2px_12px_rgba(234,88,12,0.3)]"
                : "text-slate-400 hover:text-white"
            )}
          >
            Yearly
          </button>
          {isYearly && highestYearlyDiscountPercent > 0 ? (
            <span className="ml-1.5 mr-0.5 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[9px] font-black text-green-400">
              -{formatCurrencyAmount(highestYearlyDiscountPercent)}%
            </span>
          ) : null}
        </div>

        {isSelectionLocked ? (
          <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
            Upcoming membership already queued
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {isMobile ? (
          <div className="space-y-3">
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
    </div>
  );
}

interface MembershipPlanDialogProps extends MembershipPlanSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  cancelLabel?: string;
}

function MembershipPlanDialog({
  open,
  onOpenChange,
  title = "Renew Subscription",
  description = "Choose the current plan or another plan, switch billing, and continue to payment from one place.",
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
  cancelLabel = "Cancel",
  ...selectorProps
}: MembershipPlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[calc(100vw-1rem)] max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-[1.4rem] border table-border user-surface p-0 text-white sm:w-[min(68rem,calc(100vw-2.5rem))] sm:max-w-[68rem] sm:max-h-[min(90vh,54rem)]">
        {/* Header */}
        <div className="shrink-0 relative border-b border-white/[0.06] bg-[linear-gradient(135deg,rgba(249,115,22,0.10),var(--user-surface)_40%,var(--user-surface))] px-4 py-3 sm:px-5">
          <div className="absolute -right-14 -top-8 h-28 w-28 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative">
            <DialogTitle className="text-base font-black uppercase text-white sm:text-lg">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
              {description}
            </DialogDescription>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 sm:p-4">
            <MembershipPlanSelector {...selectorProps} />
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 gap-2.5 border-t border-white/[0.06] user-surface px-4 py-2.5 sm:justify-between sm:space-x-0 sm:px-5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center rounded-[0.8rem] border border-white/10 user-surface-muted px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            {cancelLabel}
          </button>
          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              disabled={continueDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-[0.8rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-2 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.4)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {continueLabel}
              <ChevronRight size={14} />
            </button>
          ) : null}
        </DialogFooter>
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

  const plansQuery = useQuery({ queryKey: plansQueryKeys.list(), queryFn: getPlansApi });
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
  const checkoutLaunchInFlightRef = useRef(false);
  const [activeAction, setActiveAction] = useState<MembershipActionType | null>(null);
  const [renewActionStep, setRenewActionStep] = useState<RenewActionStep>("plan");
  const [pauseDays, setPauseDays] = useState(7);
  const [pauseStartDate, setPauseStartDate] = useState(getTomorrowIsoDate);
  const [pauseStartDateError, setPauseStartDateError] = useState("");
  const [pauseDaysError, setPauseDaysError] = useState("");
  const [isUpdatingMembership, setIsUpdatingMembership] = useState(false);
  const [subscriptionHistoryStatus, setSubscriptionHistoryStatus] =
    useState<"ALL" | SubscriptionStatus>("ALL");
  const [subscriptionHistorySortDirection, setSubscriptionHistorySortDirection] =
    useState<"ASC" | "DESC">("DESC");
  const [subscriptionHistoryPage, setSubscriptionHistoryPage] = useState(0);
  const [subscriptionHistoryFilterOpen, setSubscriptionHistoryFilterOpen] = useState(false);
  const [isPauseHistoryOpen, setIsPauseHistoryOpen] = useState(false);
  const [isSubscriptionHistoryOpen, setIsSubscriptionHistoryOpen] = useState(false);
  const [isViewPlansOpen, setIsViewPlansOpen] = useState(false);
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
  const currentAccessEndsAt = subscriptionState?.currentAccessEndsAt ?? currentMembership?.endsAt ?? null;
  const nextMembershipStartsAt =
    subscriptionState?.nextMembershipStartsAt ?? upcomingSubscription?.startsAt ?? null;
  const totalPaidCoverageEndsAt =
    subscriptionState?.totalPaidCoverageEndsAt ?? upcomingSubscription?.endsAt ?? currentAccessEndsAt;
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
  const pauseUntilPreview = useMemo(
    () => getPauseUntilIsoDate(pauseStartDate, pauseDays),
    [pauseDays, pauseStartDate]
  );
  const earliestPauseStartDate = parseDateInput(getTomorrowIsoDate());
  const latestPauseStartDate = currentMembership?.endsAt ? new Date(currentMembership.endsAt) : null;
  const hasValidLatestPauseStartDate = Boolean(
    latestPauseStartDate && !Number.isNaN(latestPauseStartDate.getTime())
  );
  const parsedPauseStartDate = parseDateInput(pauseStartDate);
  const isPauseDaysValid =
    Number.isInteger(pauseDays) && pauseDays >= PAUSE_DAYS_MIN && pauseDays <= PAUSE_DAYS_MAX;
  const isPauseStartDateValid = Boolean(
    parsedPauseStartDate &&
    earliestPauseStartDate &&
    parsedPauseStartDate.getTime() >= earliestPauseStartDate.getTime() &&
    (!hasValidLatestPauseStartDate ||
      parsedPauseStartDate.getTime() <= latestPauseStartDate!.getTime())
  );
  const canOpenPauseDialog = Boolean(
    currentMembership?.subscriptionStatus === "ACTIVE" &&
    (hasScheduledPause || (remainingFlexiblePauses > 0 && remainingPausesThisWindow > 0))
  );
  const isPauseFormValid =
    !hasScheduledPause &&
    canPauseCurrentMembership &&
    isPauseDaysValid &&
    isPauseStartDateValid &&
    !pauseStartDateError &&
    !pauseDaysError;

  useEffect(() => {
    if (!profile) return;

    const seededBilling = seedPaymentBilling({
      firstName: profile.firstName,
      lastName: profile.lastName,
      userName: profile.userName,
      email: profile.email,
      phoneNo: profile.phoneNo,
      fallbackEmail: auth.email,
    });

    setKhaltiBilling((current) => ({
      ...seededBilling,
      name: current.name || seededBilling.name,
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
    if (!(activeAction === "renew" || activeAction === "change-plan") || !plans?.length) return;

    const selectedIndex = plans.findIndex(
      (plan) => normalizePlanType(plan.planType) === selectedPlanId
    );
    setMobilePlanIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [activeAction, plans, selectedPlanId]);

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
  const isRenewActionOpen = activeAction === "renew" || activeAction === "change-plan";
  const renewFlowTitle =
    activeAction === "change-plan"
      ? "Change Plan"
      : currentMembership
        ? "Renew Subscription"
        : "Start Membership";
  const renewFlowDescription =
    activeAction === "change-plan"
      ? "Choose another plan or billing cycle, then continue through payment."
      : "Choose the plan and billing cycle you want next, then continue through payment.";
  const renewStepIndex = renewActionStep === "plan" ? 0 : 1;
  const isPlanDialogOpen = isRenewActionOpen && renewActionStep === "plan";
  const setIsPlanDialogOpen = (open: boolean) => {
    if (open) {
      openRenewFlow("change-plan");
      return;
    }
    closeActionSurface();
  };
  const isPauseDialogOpen = activeAction === "pause";
  const setIsPauseDialogOpen = (open: boolean) => {
    if (open) {
      openPauseFlow();
      return;
    }
    closeActionSurface();
  };
  const [isFlexibleInfoOpen, setIsFlexibleInfoOpen] = useState(false);

  useEffect(() => {
    const handlePageShow = () => {
      checkoutLaunchInFlightRef.current = false;
      setIsInitiatingPayment(false);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

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

  const closeActionSurface = () => {
    setActiveAction(null);
    setRenewActionStep("plan");
    setPauseStartDateError("");
    setPauseDaysError("");
  };

  const handleActionSurfaceOpenChange = (open: boolean) => {
    if (!open) {
      closeActionSurface();
    }
  };

  const openRenewFlow = (action: "renew" | "change-plan") => {
    if (action === "renew" && currentMembership) {
      setSelectedPlan(normalizePlanType(currentMembership.planType));
      setBillingCycle(fromApiBillingCycle(currentMembership.billingCycle));
      setActiveAction(action);
      setRenewActionStep("payment");
      return;
    }

    setActiveAction(action);
    setRenewActionStep(paymentFeedback ? "payment" : "plan");
  };

  const openPauseFlow = () => {
    setPauseDays(7);
    setPauseStartDate(getTomorrowIsoDate());
    setPauseStartDateError("");
    setPauseDaysError("");
    setActiveAction("pause");
  };

  const handlePauseDaysChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    if (!nextValue) {
      setPauseDays(0);
      setPauseDaysError(`Pause length must be between ${PAUSE_DAYS_MIN} and ${PAUSE_DAYS_MAX} days.`);
      return;
    }

    const parsedValue = Number(nextValue);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setPauseDays(parsedValue);

    if (
      !Number.isInteger(parsedValue) ||
      parsedValue < PAUSE_DAYS_MIN ||
      parsedValue > PAUSE_DAYS_MAX
    ) {
      setPauseDaysError(`Pause length must be between ${PAUSE_DAYS_MIN} and ${PAUSE_DAYS_MAX} days.`);
      return;
    }

    setPauseDaysError("");
  };

  const handlePauseDaysBlur = () => {
    const normalizedValue = Math.trunc(Number.isFinite(pauseDays) ? pauseDays : PAUSE_DAYS_MIN);
    const clampedValue = Math.min(PAUSE_DAYS_MAX, Math.max(PAUSE_DAYS_MIN, normalizedValue));
    setPauseDays(clampedValue);
    setPauseDaysError("");
  };

  const syncMembershipState = (response: UserSubscriptionResponse) => {
    authStore.updateOnboardingStatus({
      profileCompleted: response.profileCompleted,
      hasSubscription: response.hasSubscription,
      hasActiveSubscription: response.hasActiveSubscription,
      hasDashboardAccess: response.hasDashboardAccess,
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
    const nextErrors = validatePaymentBilling(khaltiBilling);
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
        hasDashboardAccess: response.hasDashboardAccess,
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
    if (checkoutLaunchInFlightRef.current) return;
    checkoutLaunchInFlightRef.current = true;
    setIsInitiatingPayment(true);
    const nextSubscription = await getCheckoutSubscription();
    if (!nextSubscription) {
      checkoutLaunchInFlightRef.current = false;
      setIsInitiatingPayment(false);
      return;
    }

    clearPaymentFeedback();

    try {
      const response = await initiateEsewaPaymentApi({
        subscriptionId: nextSubscription.subscriptionId,
        successUrl: buildFrontendCallbackUrl("/payments/esewa/success", { flow: "membership" }),
        failureUrl: buildFrontendCallbackUrl("/payments/esewa/failure", { flow: "membership" }),
        ...buildEsewaBillingPayload(khaltiBilling),
      });

      submitEsewaPaymentForm(response.paymentUrl, response.formFields);
    } catch (error) {
      checkoutLaunchInFlightRef.current = false;
      setIsInitiatingPayment(false);
      toast.error(getApiErrorMessage(error, "Failed to start eSewa payment"));
    }
  };

  const startKhaltiCheckout = async () => {
    if (checkoutLaunchInFlightRef.current) return;
    checkoutLaunchInFlightRef.current = true;
    setIsInitiatingPayment(true);
    const nextSubscription = await getCheckoutSubscription();
    if (!nextSubscription) {
      checkoutLaunchInFlightRef.current = false;
      setIsInitiatingPayment(false);
      return;
    }

    clearPaymentFeedback();

    try {
      const response = await initiateKhaltiPaymentApi({
        subscriptionId: nextSubscription.subscriptionId,
        returnUrl: buildFrontendCallbackUrl("/payments/khalti/return", { flow: "membership" }),
        websiteUrl: window.location.origin,
        ...buildKhaltiBillingPayload(khaltiBilling),
      });

      window.location.assign(response.paymentUrl);
    } catch (error) {
      checkoutLaunchInFlightRef.current = false;
      setIsInitiatingPayment(false);
      toast.error(getApiErrorMessage(error, "Failed to start Khalti payment"));
    }
  };

  const handleUpgrade = async () => {
    if (isBusy || isNextMembershipSelectionLocked) return;
    if (checkoutLaunchInFlightRef.current) return;
    if (!validatePaymentSelection()) return;

    if (selectedPaymentMethod === "khalti") {
      await startKhaltiCheckout();
      return;
    }

    await startEsewaCheckout();
  };

  const handlePauseMembership = async () => {
    if (!currentMembership || !canPauseCurrentMembership) return;
    const parsedPauseStartDate = parseDateInput(pauseStartDate);
    const earliestPauseDate = parseDateInput(getTomorrowIsoDate());
    const normalizedPauseDays = Math.trunc(Number.isFinite(pauseDays) ? pauseDays : 0);

    if (!parsedPauseStartDate) {
      setPauseStartDateError("Select a pause start date.");
      return;
    }

    if (
      !earliestPauseDate ||
      parsedPauseStartDate.getTime() < earliestPauseDate.getTime()
    ) {
      setPauseStartDateError("Pause start date must be tomorrow or later.");
      return;
    }

    if (
      currentMembership.endsAt &&
      !Number.isNaN(new Date(currentMembership.endsAt).getTime()) &&
      parsedPauseStartDate.getTime() > new Date(currentMembership.endsAt).getTime()
    ) {
      setPauseStartDateError("Pause start date must be before the current membership ends.");
      return;
    }

    if (
      !Number.isInteger(normalizedPauseDays) ||
      normalizedPauseDays < PAUSE_DAYS_MIN ||
      normalizedPauseDays > PAUSE_DAYS_MAX
    ) {
      setPauseDaysError(`Pause length must be between ${PAUSE_DAYS_MIN} and ${PAUSE_DAYS_MAX} days.`);
      return;
    }

    setIsUpdatingMembership(true);

    try {
      const response = await pauseMySubscriptionApi({
        pauseStartDate,
        pauseDays: normalizedPauseDays,
      });
      syncMembershipState(response);
      closeActionSurface();
      setPauseStartDateError("");
      setPauseDaysError("");
      toast.success(
        `Pause scheduled from ${formatMembershipDate(
          response.scheduledPauseStartAt ?? pauseStartDate
        )} for ${normalizedPauseDays} day${normalizedPauseDays === 1 ? "" : "s"}.`
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
      closeActionSurface();
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
                className="rounded-full border border-white/10 user-surface-muted px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/[0.07]"
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
        title={<>Member<span className="text-gradient-fire">ship</span></>}
        description="View the current plan, renew or change the next term, and manage pause controls from one place."
        width="wide"
      >
        <section className="overflow-hidden rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
          {/* Section header */}
          <div className="border-b table-border-cell px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel>Current Plan</SectionLabel>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed table-text-muted">
                  Review the active plan, billing cycle, renewal dates, and membership status.
                </p>
              </div>
              {currentMembership && (
                <div className={cn(
                  "rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
                  getMembershipStateClasses(membershipStateLabel)
                )}>
                  {membershipStateLabel}
                </div>
              )}
            </div>
          </div>
          <div className="p-5 sm:p-7">

            {currentMembership ? (
              <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
                {/* Plan info card */}
                <div className="relative overflow-hidden rounded-[18px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-5 shadow-sm transition duration-200 hover:brightness-110">
                  <div className="absolute -right-10 -top-8 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl" />
                  <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-yellow-500/5 blur-2xl" />
                  <div className="relative">
                    {/* Plan name & badge */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/25 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-orange-200">
                          <BadgeCheck size={12} />
                          Active plan
                        </div>
                        <p className="mt-3 text-2xl font-black uppercase text-white sm:text-3xl">
                          {currentMembership.planName}
                        </p>
                        <p className="mt-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-300/70">
                          {currentMembership.planType} · {formatBillingCycleLabel(currentMembership.billingCycle)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300/80">
                      {flexibleSubscriptionContext}
                    </p>

                    {/* Stats grid */}
                    <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      {[
                        { label: "Start date", value: formatMembershipDate(currentMembership.startsAt) },
                        { label: "Expiry date", value: formatMembershipDate(currentAccessEndsAt) },
                        { label: "Billing", value: formatBillingCycleLabel(currentMembership.billingCycle) },
                        { label: "Next renewal", value: formatMembershipDate(nextMembershipStartsAt ?? currentAccessEndsAt) },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-[1rem] border table-border user-surface px-3 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] table-text-muted">{label}</p>
                          <p className="mt-1.5 text-[13px] font-bold text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Coverage dates */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                      {[
                        { label: "Next membership starts", value: formatMembershipDate(nextMembershipStartsAt) },
                        { label: "Total paid coverage ends", value: formatMembershipDate(totalPaidCoverageEndsAt) },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-[1rem] border table-border user-surface px-3 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] table-text-muted">{label}</p>
                          <p className="mt-1.5 text-[13px] font-bold text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Alerts */}
                    {hasScheduledPause ? (
                      <div className="mt-4 flex items-start gap-3 rounded-[1rem] border border-sky-500/20 bg-sky-500/[0.08] p-4">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10">
                          <Clock size={14} className="text-sky-300" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-200">Scheduled pause</p>
                          <p className="mt-1 text-sm leading-relaxed text-sky-100/80">
                            Begins {formatMembershipDate(currentMembership.scheduledPauseStartAt)} · runs until {formatMembershipDate(currentMembership.scheduledPauseUntil)}.
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {currentMembership.subscriptionStatus === "PAUSED" ? (
                      <div className="mt-4 flex items-start gap-3 rounded-[1rem] border border-amber-500/20 bg-amber-500/[0.08] p-4">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
                          <PauseCircle size={14} className="text-amber-300" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">Membership paused</p>
                          <p className="mt-1 text-sm leading-relaxed text-amber-100/80">
                            Paused until {formatMembershipDate(currentMembership.pauseUntil)}. Resume early to reactivate sooner.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Pause / Resume card */}
                <div className="overflow-hidden rounded-[18px] border table-border user-surface shadow-sm transition duration-200 hover:brightness-110">
                  {/* Card header */}
                  <div className="border-b border-white/[0.05] px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                        <PauseCircle size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Flexible Controls</p>
                        <p className="text-sm font-black uppercase text-white">Pause &amp; Resume</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    {/* Pause usage indicator */}
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border table-border user-surface px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] table-text-muted">Pauses left</p>
                        <p className="mt-1 text-base font-black text-white">{currentMembership ? remainingFlexiblePauses : "—"}</p>
                      </div>
                      <div className="rounded-xl border table-border user-surface px-3 py-2.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] table-text-muted">This window</p>
                        <p className="mt-1 text-base font-black text-white">{currentMembership ? remainingPausesThisWindow : "—"}</p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-slate-500">
                      {hasScheduledPause
                        ? "A pause is already scheduled. Cancel it via Resume before adding a new one."
                        : currentMembership.subscriptionStatus === "PAUSED"
                          ? "Membership is currently paused. Resume to schedule another pause."
                          : remainingFlexiblePauses <= 0
                            ? "All flexible pause allowances have been used for this subscription."
                            : remainingPausesThisWindow <= 0
                              ? "No pause slots remain in this billing window."
                              : `Schedule a pause from 1–30 days starting tomorrow.`}
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsFlexibleInfoOpen(true)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[0.9rem] border border-white/10 user-surface-muted px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.1em] text-slate-200 transition-colors hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-300"
                    >
                      <Eye size={14} />
                      View Flexible Guide
                    </button>

                    <div className="mt-4 grid gap-2.5">
                      <button
                        type="button"
                        onClick={openPauseFlow}
                        disabled={!canOpenPauseDialog || isBusy}
                        className={cn(
                          "inline-flex w-full items-center justify-center gap-2 rounded-[0.9rem] px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.1em] transition-all",
                          canOpenPauseDialog && !isBusy
                            ? "bg-[linear-gradient(135deg,#FF6A00,#FF9500)] text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.35)] hover:-translate-y-0.5"
                            : "cursor-not-allowed border border-white/10 user-surface-muted text-slate-500"
                        )}
                      >
                        <PauseCircle size={14} />
                        {hasScheduledPause ? "View Scheduled Pause" : "Pause Subscription"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleResumeMembership()}
                        disabled={!canResumeCurrentMembership || isBusy}
                        className={cn(
                          "inline-flex w-full items-center justify-center gap-2 rounded-[0.9rem] border px-5 py-2.5 text-[12px] font-black uppercase tracking-[0.1em] transition-colors",
                          canResumeCurrentMembership && !isBusy
                            ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300 hover:bg-emerald-500/15"
                            : "cursor-not-allowed border-white/10 user-surface-muted text-slate-500"
                        )}
                      >
                        <PlayCircle size={14} />
                        Resume Subscription
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-white/12 user-surface-soft p-5">
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
                      Starts on {formatMembershipDate(nextMembershipStartsAt)} with{" "}
                      {queuedMembership.billingCycle.toLowerCase()} billing. All paid coverage
                      ends on {formatMembershipDate(totalPaidCoverageEndsAt)}. No second queued
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
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
          {/* Section header */}
          <div className="border-b table-border-cell px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel>Renew Subscription</SectionLabel>
                <p className="mt-0.5 text-xs leading-relaxed table-text-muted">
                  Renewing early extends from the current expiry. Choose a guided flow below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isNextMembershipSelectionLocked ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                    <Clock size={10} />
                    Upcoming queued
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">
                    {selectionNarrative.chip}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Selection summary */}
            <div className="relative overflow-hidden border-b table-border-cell p-5 sm:p-6 xl:border-b-0 xl:border-r">
              <div className="absolute -right-14 -top-10 h-40 w-40 rounded-full bg-orange-500/8 blur-3xl" />
              <div className="relative">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-orange-400">Next selection</p>
                <p className="mt-2 text-2xl font-black uppercase text-white">
                  {selectedPlanDetails?.name ?? "No plan selected"}
                </p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-orange-300/60">
                  {selectedPlanDetails?.planType ?? "—"} · {billingCycle === "yearly" ? "Yearly" : "Monthly"}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {hasQueuedMembership
                    ? "A membership is already queued. Only one upcoming term can exist at a time."
                    : selectionNarrative.description}
                </p>

                {/* Mini stats */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: "Billing", value: billingCycle === "yearly" ? "Yearly" : "Monthly" },
                    { label: "Est. total", value: `${currency} ${formatCurrencyAmount(totalAmount)}` },
                    { label: "Starts", value: queuedMembership ? formatMembershipDate(nextMembershipStartsAt) : "After payment" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border table-border user-surface-soft px-3 py-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] table-text-muted">{label}</p>
                      <p className="mt-0.5 text-[12px] font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                  <Workflow size={15} />
                </div>
                <p className="text-sm font-black uppercase text-white">Choose an action</p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => openRenewFlow("renew")}
                  disabled={isNextMembershipSelectionLocked}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-[0.9rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-white shadow-[0_6px_20px_-4px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-4px_rgba(249,115,22,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  Renew Now
                  <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => openRenewFlow("change-plan")}
                  disabled={isNextMembershipSelectionLocked}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[0.9rem] border border-orange-500/20 bg-orange-500/[0.07] px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-orange-200 transition-colors hover:bg-orange-500/12 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowUpRight size={14} />
                  Change Plan
                </button>

                <button
                  type="button"
                  onClick={() => setIsViewPlansOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[0.9rem] border table-border user-surface-soft px-5 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-slate-300 transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.04] hover:text-white"
                >
                  <Eye size={14} />
                  View Plans
                </button>

                {hasQueuedMembership && (
                  <div className="rounded-[0.8rem] border border-amber-500/15 bg-amber-500/[0.06] px-4 py-3 text-xs leading-relaxed text-amber-200/80">
                    Renewal locked — one upcoming membership is already queued.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <MembershipPlanDialog
          open={isPlanDialogOpen}
          onOpenChange={setIsPlanDialogOpen}
          title={activeAction === "change-plan" ? "Change Plan" : "Renew Subscription"}
          description={
            activeAction === "change-plan"
              ? "Pick another plan or billing cycle, then continue into the renew checkout."
              : "Review the current selection and continue into the renew checkout."
          }
          onContinue={() => setRenewActionStep("payment")}
          continueDisabled={continueActionDisabled}
          continueLabel="Continue to Payment"
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

        <ViewPlansDialog
          open={isViewPlansOpen}
          onOpenChange={setIsViewPlansOpen}
          plans={plans ?? []}
          highlightedPlanId={selectedPlanDetails?.planId ?? null}
          defaultBillingCycle={billingCycle}
          highlightLabel="Current Selection"
          description="Browse plans in a popup, compare monthly or yearly pricing, and keep the current selection in focus on both desktop and mobile."
          isLoading={plansQuery.isLoading}
          isError={plansQuery.isError}
        />

        <MembershipActionSurface
          open={isRenewActionOpen && renewActionStep !== "plan"}
          onOpenChange={handleActionSurfaceOpenChange}
          isMobile={isMobile}
          title={renewFlowTitle}
          description={renewFlowDescription}
          className="sm:max-w-6xl"
        >
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { key: "plan", label: "Plan + Billing" },
              { key: "payment", label: "Payment" },
            ].map((step, index) => {
              const isActive = renewActionStep === step.key;
              const isComplete = renewStepIndex > index;

              return (
                <div
                  key={step.key}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]",
                    isActive
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-200"
                      : isComplete
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 user-surface-muted text-slate-400"
                  )}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current/20 text-[9px]">
                    {index + 1}
                  </span>
                  {step.label}
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-5 sm:p-6">
              <SectionLabel>Payment Gateway</SectionLabel>
              <p className="mb-5 max-w-2xl text-sm leading-relaxed table-text-muted">
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
                          const seededBilling = seedPaymentBilling({
                            firstName: profile.firstName,
                            lastName: profile.lastName,
                            userName: profile.userName,
                            email: profile.email,
                            phoneNo: profile.phoneNo,
                            fallbackEmail: auth.email,
                          });
                          setKhaltiBilling((current) => ({
                            ...seededBilling,
                            name: current.name || seededBilling.name,
                            email: current.email || seededBilling.email,
                            phone: current.phone || seededBilling.phone,
                          }));
                        }
                      }}
                      disabled={!method.isAvailable}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-[18px] border p-4 text-left transition-all",
                        !method.isAvailable && "cursor-not-allowed opacity-60",
                        isSelected
                          ? "border-orange-500/40 bg-orange-500/10"
                          : "table-border user-surface-soft hover:border-orange-500/30 hover:bg-orange-500/[0.04]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-16 w-24 shrink-0 items-center justify-center rounded-[14px]",
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
                            <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-200">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed table-text-muted">
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
                <PaymentFailureAlert
                  paymentFeedback={paymentFeedback}
                  retryLabel="Retry payment"
                  onRetry={handleUpgrade}
                  onSecondaryAction={() => navigate("/profile?tab=membership")}
                  secondaryActionLabel="Return to profile"
                  busy={continueActionDisabled}
                  variant="membership"
                />
              ) : null}

              {selectedPaymentMethod === "khalti" ? (
                <KhaltiBillingFields
                  values={khaltiBilling}
                  errors={khaltiBillingErrors}
                  onFieldChange={setKhaltiBillingField}
                  variant="membership"
                />
              ) : null}

              <div className="mt-5 rounded-[18px] border table-border user-surface-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase text-white">
                      Secure membership checkout
                    </p>
                    <p className="mt-1 text-sm leading-relaxed table-text-muted">
                      We send only the minimum payment details to the selected gateway. Your
                      FitPal membership changes after backend verification succeeds.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:sticky xl:top-6">
              <div className="rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-5 sm:p-6">
                <SectionLabel>Order Summary</SectionLabel>

                <div className="rounded-[18px] border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-200">
                        Selected Membership
                      </p>
                      <p className="mt-2 text-xl font-black uppercase text-white">
                        {selectedPlanDetails?.name ?? "Choose a plan"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-orange-100/80">
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

                <div className="my-5 h-px table-border-cell" />

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] table-text-muted">
                      Total
                    </p>
                    <p className="mt-1 text-3xl font-black text-white">
                      {currency} {formatCurrencyAmount(totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-full border table-border user-surface-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200">
                    {billingCycle === "yearly" ? "Yearly bill" : "Monthly bill"}
                  </div>
                </div>

                <div className="mt-5 rounded-[18px] border table-border user-surface-soft p-4">
                  <p className="text-sm font-black uppercase text-white">
                    Checkout note
                  </p>
                  <p className="mt-2 text-sm leading-relaxed table-text-muted">
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/35 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Redirecting...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <ArrowUpRight size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewActionStep("plan")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border table-border user-surface-soft px-6 py-3 text-sm font-black uppercase tracking-[0.08em] text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    Back
                  </button>
                </div>

                <p className="mt-4 text-center text-[11px] leading-relaxed table-text-muted">
                  By continuing you agree to FitPal&apos;s subscription and payment policy.
                </p>
              </div>
            </div>
          </div>
        </MembershipActionSurface>

        <Collapsible open={isPauseHistoryOpen} onOpenChange={setIsPauseHistoryOpen}>
          <section className="rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-5 sm:p-6">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="mb-5 flex w-full flex-col gap-3 text-left sm:flex-row sm:items-end sm:justify-between"
              >
                <div>
                  <SectionLabel>Pause History</SectionLabel>
                  <p className="max-w-2xl text-sm leading-relaxed table-text-muted">
                    Current-subscription pause events are shown newest first. Cancelled scheduled
                    pauses stay visible here for reference.
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  {currentMembership ? (
                    <div className="rounded-full border table-border user-surface-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 sm:px-4 sm:py-2 sm:text-[11px]">
                      {currentPauseHistory.length} event{currentPauseHistory.length === 1 ? "" : "s"}
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border table-border user-surface-soft text-slate-400 transition-transform duration-200",
                      isPauseHistoryOpen ? "rotate-90 text-orange-300" : undefined
                    )}
                  >
                    <ChevronRight size={18} />
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>

              {!currentMembership ? (
                <div className="rounded-[18px] border border-dashed table-border user-surface-soft p-5">
                  <p className="text-lg font-black uppercase text-white">No current subscription</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed table-text-muted">
                    Pause history appears once you have an active membership term to manage.
                  </p>
                </div>
              ) : currentPauseHistory.length === 0 ? (
                <div className="rounded-[18px] border border-dashed table-border user-surface-soft p-5">
                  <p className="text-lg font-black uppercase text-white">No pause events yet</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed table-text-muted">
                    Schedule a future pause from this page when needed. Completed, resumed, and
                    cancelled scheduled pauses will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {currentPauseHistory.map((event) => (
                    <div
                      key={event.pauseEventId}
                      className="rounded-[14px] border table-border user-surface-soft p-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/[0.04] sm:rounded-[18px] sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.14em] table-text-muted sm:text-[10px]">
                            Pause event
                          </p>
                          <p className="mt-1 text-base font-black uppercase text-white sm:mt-2 sm:text-lg">
                            {formatPauseDuration(event.pauseDays)}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] sm:px-3 sm:py-1.5 sm:text-[10px]",
                            getPauseHistoryStatusClasses(event.historyStatus)
                          )}
                        >
                          {getPauseHistoryLabel(event.historyStatus)}
                        </div>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                        <div className="rounded-[10px] border table-border user-surface p-2.5 sm:rounded-[14px] sm:p-4">
                          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] table-text-muted sm:gap-2 sm:text-[10px]">
                            <CalendarDays size={12} className="sm:hidden" />
                            <CalendarDays size={14} className="hidden sm:block" />
                            Pause Start
                          </p>
                          <p className="mt-1 text-xs font-semibold text-white sm:mt-2 sm:text-sm">
                            {formatMembershipDate(event.pauseStartAt)}
                          </p>
                        </div>

                        <div className="rounded-[10px] border table-border user-surface p-2.5 sm:rounded-[14px] sm:p-4">
                          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] table-text-muted sm:gap-2 sm:text-[10px]">
                            <Clock3 size={12} className="sm:hidden" />
                            <Clock3 size={14} className="hidden sm:block" />
                            Planned Resume
                          </p>
                          <p className="mt-1 text-xs font-semibold text-white sm:mt-2 sm:text-sm">
                            {formatMembershipDate(event.plannedResumeAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 rounded-[10px] border table-border user-surface p-2.5 sm:mt-3 sm:rounded-[14px] sm:p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] table-text-muted sm:text-[10px]">
                          Actual Outcome
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:mt-2 sm:text-sm">
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
            </CollapsibleContent>
          </section>
        </Collapsible>

        <Collapsible open={isSubscriptionHistoryOpen} onOpenChange={setIsSubscriptionHistoryOpen}>
          <section className="rounded-3xl border table-border user-surface shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] p-5 sm:p-6">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="mb-5 flex w-full flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <SectionLabel>Subscription History</SectionLabel>
                  <p className="max-w-3xl text-sm leading-relaxed table-text-muted">
                    Review every membership term on the account, including pending, upcoming, active, paused, expired, cancelled, and failed subscriptions.
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <div className="rounded-full border table-border user-surface-soft px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 sm:px-4 sm:py-2 sm:text-[11px]">
                    {subscriptionHistoryTotalItems} total
                  </div>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border table-border user-surface-soft text-slate-400 transition-transform duration-200",
                      isSubscriptionHistoryOpen ? "rotate-90 text-orange-300" : undefined
                    )}
                  >
                    <ChevronRight size={18} />
                  </div>
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mb-5 flex flex-col gap-4 rounded-[18px] border table-border user-surface-soft p-4 sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="max-w-3xl text-sm leading-relaxed table-text-muted">
                      Filter the history list by status, sort order, and page through previous terms.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSubscriptionHistoryRefresh}
                      disabled={subscriptionHistoryQuery.isFetching}
                      className="flex items-center gap-1.5 rounded-full border table-border user-surface px-3.5 py-[7px] text-[12px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
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
                      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${subscriptionHistorySortDirection !== "DESC"
                          ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                          : "user-surface table-border table-text hover:border-orange-500/30 hover:text-orange-400"
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
                        className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${subscriptionHistoryFilterOpen
                            ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                            : "user-surface table-border table-text hover:border-orange-500/30 hover:text-orange-400"
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
                        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[240px] rounded-2xl border table-border user-surface p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
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
                                className={`flex w-full items-center justify-between rounded-[14px] px-3 py-2 text-left text-sm transition-colors ${isActive
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
                        className="flex items-center gap-1.5 rounded-full border table-border user-surface px-3.5 py-[7px] text-[12px] font-bold table-text transition-all hover:border-white/20 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                        Clear
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-relaxed table-text-muted">
                    {subscriptionHistoryTotalItems > 0
                      ? `Showing ${subscriptionHistoryItems.length} of ${subscriptionHistoryTotalItems} membership terms.`
                      : "No membership terms match the current filters yet."}
                  </p>
                  <span className="hidden w-fit items-center rounded-full border table-border user-surface-soft px-3.5 py-1.5 text-[11px] font-semibold text-white sm:inline-flex">
                    {subscriptionHistoryTotalItems} total
                  </span>
                </div>
              </div>

              {subscriptionHistoryQuery.isLoading ? (
                <div className="flex items-center justify-center rounded-[18px] border table-border user-surface py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500/20 border-t-orange-500" />
                </div>
              ) : subscriptionHistoryQuery.isError ? (
                <div className="rounded-[18px] border table-border user-surface p-6 text-center">
                  <p className="text-sm font-bold text-red-200">
                    Subscription history could not be loaded.
                  </p>
                  <p className="mt-2 text-xs table-text-muted">
                    {getApiErrorMessage(subscriptionHistoryQuery.error, "Try refreshing the history list.")}
                  </p>
                </div>
              ) : subscriptionHistoryItems.length === 0 ? (
                <div className="rounded-[18px] border table-border user-surface px-6 py-14 text-center">
                  <Search className="mx-auto h-10 w-10 text-orange-400" />
                  <p className="mt-4 text-lg font-black uppercase text-white">No subscriptions found</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed table-text-muted">
                    There are no membership terms matching the current filters yet.
                  </p>
                </div>
              ) : isMobile ? (
                <SubscriptionHistoryCards items={subscriptionHistoryItems} />
              ) : (
                <div className="overflow-hidden rounded-[18px] border table-border user-surface">
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
                      className="rounded-full border table-border user-surface px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="rounded-full border table-border user-surface-soft px-4 py-1.5 text-[11px] font-semibold text-white">
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
                      className="rounded-full border table-border user-surface px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </CollapsibleContent>
          </section>
        </Collapsible>

        <Dialog open={isPauseDialogOpen} onOpenChange={setIsPauseDialogOpen}>
          <DialogContent className="overflow-hidden rounded-[1.6rem] border-white/10 bg-[#090909] p-0 text-white sm:max-w-lg">
            <div className="border border-white/8 bg-[linear-gradient(135deg,rgba(249,115,22,0.12),rgba(9,9,9,0.98))] p-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase text-white">
                  {hasScheduledPause ? "Scheduled Pause" : "Schedule Pause"}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-slate-400">
                  {hasScheduledPause
                    ? "Another pause cannot be created while this schedule is still active."
                    : "Choose when the pause should begin and how long it should last."}
                </DialogDescription>
              </DialogHeader>

              {hasScheduledPause ? (
                <>
                  <div className="mt-5 rounded-[1.2rem] border border-sky-500/20 bg-sky-500/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                      Current scheduled pause
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-sky-50">
                      Starts on {formatMembershipDate(currentMembership?.scheduledPauseStartAt)}
                      {" "}and runs until {formatMembershipDate(currentMembership?.scheduledPauseUntil)}.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-sky-50/90">
                      Another pause cannot be created until this one is cancelled or completed.
                      Use Resume Subscription on the page to cancel this schedule first.
                    </p>
                  </div>

                  <DialogFooter className="mt-6 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setIsPauseDialogOpen(false)}
                      className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 user-surface-muted px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                    >
                      Close
                    </button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Pause Starts At" error={pauseStartDateError}>
                      <CustomDatePicker
                        value={pauseStartDate}
                        onChange={(value) => {
                          setPauseStartDate(value);
                          setPauseStartDateError("");
                        }}
                        minDate={earliestPauseStartDate ?? undefined}
                        maxDate={hasValidLatestPauseStartDate ? latestPauseStartDate! : undefined}
                        invalid={Boolean(pauseStartDateError)}
                      />
                    </Field>

                    <Field label="Pause For How Many Days" error={pauseDaysError}>
                      <TextInput
                        type="number"
                        min={PAUSE_DAYS_MIN}
                        max={PAUSE_DAYS_MAX}
                        step={1}
                        inputMode="numeric"
                        value={pauseDays > 0 ? String(pauseDays) : ""}
                        onChange={handlePauseDaysChange}
                        onBlur={handlePauseDaysBlur}
                        placeholder="Enter days"
                        aria-label="Pause duration in days"
                        aria-invalid={Boolean(pauseDaysError)}
                      />
                    </Field>
                  </div>

                  <div className="mt-5 rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Pause summary
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white">
                      Paused until{" "}
                      <span className="font-bold text-orange-300">
                        {pauseUntilPreview ? formatMembershipDate(pauseUntilPreview) : "Not scheduled"}
                      </span>
                      . Remaining pauses:{" "}
                      <span className="font-bold text-white">
                        {remainingFlexiblePauses} total
                      </span>
                      {" "}and{" "}
                      <span className="font-bold text-white">
                        {remainingPausesThisWindow} this billing window
                      </span>
                      .
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Only active memberships can schedule a pause, and another pause cannot be
                      added until the current scheduled or active pause is cancelled or completed.
                    </p>
                  </div>

                  <DialogFooter className="mt-6 gap-3 sm:justify-between sm:space-x-0">
                    <button
                      type="button"
                      onClick={() => setIsPauseDialogOpen(false)}
                      className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 user-surface-muted px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handlePauseMembership()}
                      disabled={!isPauseFormValid || isUpdatingMembership}
                      className="inline-flex items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#FF6A00,#FF9500)] px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_8px_24px_-6px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-6px_rgba(249,115,22,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdatingMembership ? "Scheduling..." : "Confirm Pause"}
                    </button>
                  </DialogFooter>
                </>
              )}
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
                <div className="rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Pause limits
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    This subscription can use {totalPauseLimit} pauses across its full term,
                    with up to {pauseLimitPerWindow} pauses in the current billing window.
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Pause timing
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Pauses are scheduled from a future start date. The membership stays active
                    until that date, then access is temporarily disabled for the selected window.
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Resume early
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    You do not need to wait for the full pause window. Resume anytime and
                    FitPal removes unused paused days from the extra time added at the end. If
                    the pause has not started yet, resume simply cancels the schedule.
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-white/10 user-surface-muted p-4">
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
                  className="inline-flex items-center justify-center rounded-[1rem] border border-white/10 user-surface-muted px-5 py-3 text-sm font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.07]"
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
