import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenuItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Loader2,
  MessageSquare,
  MoreVertical,
  MonitorSmartphone,
  ShieldAlert,
  Star,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/shared/lib/utils";
import { reviewGymPayoutSettlementApi } from "@/features/admin/admin-settlement.api";
import type { PayoutSettlementResponse } from "@/features/admin/admin-settlement.model";
import {
  getGymDashboardCheckInTrendApi,
  getGymDashboardOverviewApi,
  getGymDashboardRevenueTrendApi,
} from "@/features/gym-dashboard/gym-dashboard.api";
import { getGymSavedMembersSummaryApi } from "@/features/gym-dashboard/gym-members.api";
import type { GymCheckInDenyReason } from "@/features/gym-dashboard/gym-checkins.model";
import type { GymMembersWindow } from "@/features/gym-dashboard/gym-members.model";
import { getApiErrorMessage } from "@/shared/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { parseYmdLocal } from "@/features/admin/settlement-chart-data";

/* ─── Theme (gym-unique, admin-consistent) ────────────────────────────── */

const panelCls =
  "rounded-2xl border table-border table-bg shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]";

const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #404040",
    borderRadius: 8,
    color: "#fafafa",
    fontSize: 11,
  },
  itemStyle: { color: "#fafafa" },
  labelStyle: { color: "#a3a3a3", fontSize: 10 },
  wrapperStyle: { outline: "none" },
} as const;

const CHART_MIN_H = "h-[200px]";

/* ─── Shared helpers ──────────────────────────────────────────────────── */

const formatMoney = (amount: number, currency = "NPR") => {
  const c = currency?.trim() || "NPR";
  if (amount >= 100000) return `${c} ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${c} ${(amount / 1000).toFixed(1)}K`;
  return `${c} ${amount.toLocaleString()}`;
};

const formatMoneyFull = (amount: number, currency = "NPR") => {
  const c = currency?.trim() || "NPR";
  return `${c} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatDenyReason = (reason: GymCheckInDenyReason) =>
  reason
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

const is503 = (error: unknown): boolean => {
  if (!error) return false;
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 503;
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const formatYmdAxisLabel = (ymd: string) => {
  const date = parseYmdLocal(ymd);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatYmdLongLabel = (ymd: string) => {
  const date = parseYmdLocal(ymd);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
};

const batchStatusTone = (
  status: PayoutSettlementResponse["status"]
): "green" | "red" | "amber" | "blue" | "teal" | "purple" | "orange" | "yellow" | "zinc" | "cyan" => {
  if (status === "PAID") return "green";
  if (status === "APPROVED") return "blue";
  if (status === "GYM_REVIEW_PENDING") return "purple";
  if (status === "REJECTED") return "red";
  return "amber";
};

const gymBatchLabel = (status: PayoutSettlementResponse["status"]) =>
  status === "PAID" ? "RECEIVED" : status.replace(/_/g, " ");

const isInsideRadixPortalSurface = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-radix-popper-content-wrapper]") ||
    target.closest("[data-radix-select-content]") ||
    target.closest("[data-radix-dropdown-menu-content]")
  );
};

/* ─── Shared micro-components ─────────────────────────────────────────── */

const SectionLabel = ({ children }: { children: string }) => (
  <div className="mb-3 flex items-center gap-3">
    <span className="text-[9.5px] font-black uppercase tracking-[0.2em] text-orange-500">{children}</span>
    <span className="h-px flex-1 bg-orange-500/10" />
  </div>
);

const FilterTabs = ({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex gap-[3px] rounded-full table-bg border table-border p-[3px]">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={cn(
          "relative rounded-full px-3.5 py-1 text-[11px] font-bold",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "transform-gpu will-change-transform",
          value === o.value
            ? "bg-orange-500 text-white"
            : "table-text hover:text-white hover:bg-white/[0.03] hover:border-white/10 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-xl bg-white/[0.04]", className)} />
);

const CardShell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(panelCls, "p-5", className)}>{children}</div>
);

const ServiceUnavailable = () => (
  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center">
    <ShieldAlert className="h-5 w-5 text-zinc-600" />
    <p className="text-[11px] font-bold text-zinc-500">Service Unavailable</p>
    <p className="text-[10px] text-zinc-600">Please try again later</p>
  </div>
);

const QueryErrorState = ({ error, fallback }: { error: unknown; fallback: string }) => {
  if (is503(error)) {
    return <ServiceUnavailable />;
  }

  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center">
      <AlertTriangle className="h-5 w-5 text-zinc-600" />
      <p className="text-[11px] font-bold text-zinc-500">Request failed</p>
      <p className="max-w-[260px] text-[10px] text-zinc-600">{getApiErrorMessage(error, fallback)}</p>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-1 text-center">
    <p className="text-[11px] font-medium text-zinc-500">{message}</p>
  </div>
);

function KPICard({
  label,
  value,
  meta,
  theme = "orange",
  icon: Icon,
}: {
  label: string;
  value: string;
  theme?: "orange" | "green" | "amber" | "red";
  icon?: React.ElementType;
  meta?: ReactNode;
}) {
  const styles: Record<string, { border: string; bg: string; text: string }> = {
    orange: { border: "border-orange-500/10", bg: "from-orange-500/[0.06]", text: "text-orange-500" },
    green: { border: "border-emerald-500/10", bg: "from-emerald-500/[0.06]", text: "text-emerald-500" },
    amber: { border: "border-amber-500/10", bg: "from-amber-500/[0.06]", text: "text-amber-500" },
    red: { border: "border-red-500/10", bg: "from-red-500/[0.06]", text: "text-red-500" },
  };
  const t = styles[theme];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br to-transparent px-4 py-3 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]",
        t.border,
        t.bg,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className={cn("h-3.5 w-3.5", t.text)} />}
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">{label}</p>
      </div>
      <p className="font-mono text-2xl font-bold tracking-tight text-white leading-none">{value}</p>
      {meta && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] table-text-muted">{meta}</div>}
    </div>
  );
}

function Badge({
  c,
  children,
}: {
  c: "green" | "red" | "amber" | "blue" | "teal" | "purple" | "orange" | "yellow" | "zinc" | "cyan";
  children: ReactNode;
}) {
  const cls: Record<string, { dot: string; bg: string }> = {
    green: { dot: "bg-emerald-400", bg: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
    red: { dot: "bg-red-400", bg: "border-red-500/25 bg-red-500/10 text-red-400" },
    amber: { dot: "bg-amber-400", bg: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
    blue: { dot: "bg-blue-400", bg: "border-blue-500/25 bg-blue-500/10 text-blue-400" },
    teal: { dot: "bg-teal-400", bg: "border-teal-500/25 bg-teal-500/10 text-teal-400" },
    purple: { dot: "bg-purple-400", bg: "border-purple-500/25 bg-purple-500/10 text-purple-400" },
    orange: { dot: "bg-orange-400", bg: "border-orange-500/25 bg-orange-500/10 text-orange-400" },
    yellow: { dot: "bg-yellow-400", bg: "border-yellow-500/25 bg-yellow-500/10 text-yellow-400" },
    zinc: { dot: "bg-zinc-400", bg: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400" },
    cyan: { dot: "bg-cyan-400", bg: "border-cyan-500/25 bg-cyan-500/10 text-cyan-400" },
  };
  const cfg = cls[c] ?? cls.orange;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider",
        cfg.bg,
      )}
    >
      <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", cfg.dot)} />
      {children}
    </span>
  );
}

function MiniStat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <p className="font-mono text-[17px] font-bold text-white">{value}</p>
      <p className="text-[11px] table-text-muted">{label}</p>
      {children && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-200">{value}</p>
    </div>
  );
}

/* ─── Check-in Trend range type ───────────────────────────────────────── */

type CheckInTrendRange = "WEEK" | "MONTH" | "YEAR" | "ALL_TIME";
type PeakActivityRange = "TODAY" | "WEEK" | "ALL_TIME";
type RevenueTrendRange = "WEEKLY" | "MONTHLY" | "YEARLY";

const CHECKIN_TREND_OPTIONS: { label: string; value: CheckInTrendRange }[] = [
  { label: "This week", value: "WEEK" },
  { label: "This month", value: "MONTH" },
  { label: "This year", value: "YEAR" },
  { label: "All time", value: "ALL_TIME" },
];
const CHECKIN_TREND_LABEL: Record<CheckInTrendRange, string> = {
  WEEK: "This week",
  MONTH: "This month",
  YEAR: "This year",
  ALL_TIME: "All time",
};

const dropdownItemCls =
  "rounded-xl py-2 pl-3 pr-3 text-[12px] font-semibold text-zinc-300 focus:bg-white/[0.05] focus:text-white data-[state=checked]:bg-orange-500/10 data-[state=checked]:text-orange-300 [&>span]:hidden";

/* ─── Dashboard Home ──────────────────────────────────────────────────── */

export default function GymDashboardHome() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [trendRange, setTrendRange] = useState<CheckInTrendRange>("WEEK");
  const [peakRange, setPeakRange] = useState<PeakActivityRange>("ALL_TIME");
  const [revenueRange, setRevenueRange] = useState<RevenueTrendRange>("WEEKLY");
  const membersWindow: GymMembersWindow = "WEEK";
  const [batchDetail, setBatchDetail] = useState<PayoutSettlementResponse | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ batch: PayoutSettlementResponse; approved: boolean } | null>(null);

  /* ── Queries ── */
  const overviewQ = useQuery({
    queryKey: ["gym-home", "overview", membersWindow],
    queryFn: () => getGymDashboardOverviewApi({ membersWindow }),
    staleTime: 60_000,
    retry: (count, err) => !is503(err) && count < 3,
  });

  const trendQ = useQuery({
    queryKey: ["gym-home", "check-in-trend", trendRange],
    queryFn: () => getGymDashboardCheckInTrendApi(trendRange),
    staleTime: 60_000,
    retry: (count, err) => !is503(err) && count < 3,
  });

  const revenueTrendQ = useQuery({
    queryKey: ["gym-home", "revenue-trend", revenueRange],
    queryFn: () => getGymDashboardRevenueTrendApi(revenueRange),
    staleTime: 60_000,
    retry: (count, err) => !is503(err) && count < 3,
  });

  const savedSummaryQ = useQuery({
    queryKey: ["gym-home", "saved-summary"],
    queryFn: getGymSavedMembersSummaryApi,
    staleTime: 60_000,
    retry: (count, err) => !is503(err) && count < 3,
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewGymPayoutSettlementApi(reviewTarget!.batch.payoutSettlementId, reviewTarget!.approved),
    onSuccess: () => {
      toast.success(reviewTarget?.approved ? "Payout confirmed as received" : "Payout rejected");
      setReviewTarget(null);
      setBatchDetail(null);
      queryClient.invalidateQueries({ queryKey: ["gym-home"] });
      queryClient.invalidateQueries({ queryKey: ["gym-settlement"] });
      queryClient.invalidateQueries({ queryKey: ["gym-payout-batches", "pending-count"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Review failed")),
  });

  /* ── Derived data ── */
  const overview = overviewQ.data;
  const settlementQ = {
    data: overview?.settlementAnalytics,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const dueTimelineQ = {
    data: overview?.dueTimeline,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const checkInQ = {
    data: overview?.checkInAnalytics,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const reviewQ = {
    data: overview?.reviewAnalytics,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const membersQ = {
    data: overview?.membersMetrics,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const deviceQ = {
    data: overview?.doorDevice ?? null,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const profileQ = {
    data: overview?.profile,
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const sa = overview?.settlementAnalytics;
  const ci = overview?.checkInAnalytics;
  const rv = overview?.reviewAnalytics;
  const mm = overview?.membersMetrics;
  const recentPayoutBatches = overview?.recentPayoutBatches ?? [];
  const payoutBatchesQ = {
    data: { content: recentPayoutBatches },
    isLoading: overviewQ.isLoading,
    isError: overviewQ.isError,
    error: overviewQ.error,
  };
  const currency = sa?.currency ?? "NPR";

  const successRate = ci ? (ci.totalScans > 0 ? ((ci.successfulScans / ci.totalScans) * 100).toFixed(1) : "0") : null;

  /* Check-in trend data */
  const trendData = useMemo(() => {
    return trendQ.data?.points ?? [];
  }, [trendQ.data?.points]);

  const trendMax = useMemo(() => Math.max(...trendData.map((d) => d.count), 0), [trendData]);

  /* Peak activity data */
  const peakData = useMemo(() => {
    const source = peakRange === "TODAY"
      ? ci?.peakToday
      : peakRange === "WEEK"
        ? ci?.peakWeekAverage
        : ci?.peakAllTimeAverage;
    return (source ?? []).map((hourly) => ({
      key: String(hourly.hour),
      label: `${hourly.hour}:00`,
      count: hourly.count,
    }));
  }, [ci?.peakAllTimeAverage, ci?.peakToday, ci?.peakWeekAverage, peakRange]);

  const peakMax = useMemo(() => Math.max(...peakData.map((d) => d.count), 0), [peakData]);

  /* Due timeline data */
  const dueTimelineData = useMemo(() => dueTimelineQ.data?.points ?? [], [dueTimelineQ.data?.points]);
  const dueTimelineCurrency = dueTimelineQ.data?.currency ?? currency;
  const dueTimelineTotalDue = dueTimelineQ.data?.totalDue ?? 0;
  const dueTimelineXAxisInterval = useMemo(() => {
    if (dueTimelineData.length <= 10) return 0;
    return Math.max(0, Math.floor(dueTimelineData.length / 8));
  }, [dueTimelineData]);
  const dueTimelineYMax = useMemo(() => {
    if (!dueTimelineData.length) return 1;
    const peak = Math.max(...dueTimelineData.map((d) => Math.max(d.checkinAmount, d.dueAmount)), 0);
    return peak <= 0 ? 1 : Math.max(1, Math.ceil(peak * 1.1));
  }, [dueTimelineData]);

  const revenueTrendData = useMemo(() => {
    return revenueTrendQ.data?.points ?? [];
  }, [revenueTrendQ.data?.points]);
  const revenueTrendCurrency = revenueTrendQ.data?.currency ?? currency;

  /* Success/Denied pie */
  const scanPieData = useMemo(() => {
    if (!ci) return [];
    return [
      { name: "Success", value: ci.successfulScans, color: "#f97316" },
      { name: "Denied", value: ci.deniedScans, color: "#ef4444" },
    ];
  }, [ci]);

  /* Rating distribution */
  const ratingData = useMemo(() => {
    if (!rv?.ratingDistribution) return [];
    return [...rv.ratingDistribution].sort((a, b) => b.rating - a.rating);
  }, [rv]);

  /* Device heartbeat status */
  const deviceStatus = useMemo(() => {
    if (!deviceQ.data) return null;
    const dev = deviceQ.data;
    if (!dev.active) return { label: "Inactive", tone: "red" as const };
    if (!dev.lastSeenAt) return { label: "Never seen", tone: "amber" as const };
    const diffMs = Date.now() - new Date(dev.lastSeenAt).getTime();
    const thresholdMs = (dev.pollIntervalSeconds ?? 60) * 3 * 1000;
    if (diffMs > thresholdMs) return { label: "Stale", tone: "amber" as const };
    return { label: "Online", tone: "green" as const };
  }, [deviceQ.data]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-black tracking-tight text-white">
          Gym{" "}
          <span
            style={{
              background: "var(--gradient-fire)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Dashboard
          </span>
        </h1>
        {profileQ.data?.gymName && (
          <p className="mt-1 text-[12px] text-zinc-500">
            {profileQ.data.gymName}
            {profileQ.data.city ? ` \u00B7 ${profileQ.data.city}` : ""}
          </p>
        )}
      </div>

      {/* ── SECTION 1: GYM SNAPSHOT ───────────────────────────── */}
      <div>
        <SectionLabel>Gym snapshot</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {overviewQ.isError ? (
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-5">
              <CardShell className="min-h-[112px]">
                <QueryErrorState error={overviewQ.error} fallback="Failed to load gym snapshot" />
              </CardShell>
            </div>
          ) : settlementQ.isLoading || checkInQ.isLoading || reviewQ.isLoading || membersQ.isLoading || deviceQ.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : (
            <>
              <KPICard
                label="Active customers"
                value={mm ? mm.activeCustomers.toLocaleString() : "—"}
                theme="orange"
                icon={Activity}
              />
              <KPICard
                label="Success rate"
                value={successRate != null ? `${successRate}%` : "—"}
                theme={Number(successRate ?? 0) >= 90 ? "green" : Number(successRate ?? 0) >= 70 ? "amber" : "red"}
                icon={CheckCircle2}
                meta={ci && ci.deniedScans > 0 ? <Badge c="red">{ci.deniedScans} denied</Badge> : undefined}
              />
              <KPICard
                label="Revenue"
                value={sa ? formatMoneyFull(sa.netSum, currency) : "—"}
                theme="amber"
                icon={Wallet}
                meta={sa ? <span className="font-mono text-[10px]">{sa.totalCheckinSettlements} check-in settlements</span> : undefined}
              />
              <KPICard
                label="Avg rating"
                value={rv?.averageRating != null ? `${rv.averageRating.toFixed(1)} \u2605` : "—"}
                theme={
                  (rv?.averageRating ?? 0) >= 4
                    ? "green"
                    : (rv?.averageRating ?? 0) >= 3
                      ? "amber"
                      : "red"
                }
                icon={Star}
                meta={rv ? <span>{rv.totalReviews} reviews</span> : undefined}
              />
              <KPICard
                label="Door device"
                value={deviceStatus?.label ?? (deviceQ.isError ? "Unavailable" : "—")}
                theme={
                  deviceStatus?.tone === "green"
                    ? "green"
                    : deviceStatus?.tone === "amber"
                      ? "amber"
                      : "red"
                }
                icon={MonitorSmartphone}
                meta={
                  deviceQ.data?.lastSeenAt ? (
                    <span className="font-mono text-[10px]">
                      Last: {new Date(deviceQ.data.lastSeenAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : undefined
                }
              />
            </>
          )}
        </div>
      </div>

      {/* ── SECTION 2: REVENUE & PAYOUTS ──────────────────────── */}
      <div>
        <SectionLabel>Revenue &amp; payouts</SectionLabel>
        {settlementQ.isError ? (
          <CardShell className={CHART_MIN_H}>
            <QueryErrorState error={settlementQ.error} fallback="Failed to load settlement analytics" />
          </CardShell>
        ) : settlementQ.isLoading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : sa ? (
          <>
            {/* Payout summary cards */}
            <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <CardShell>
                <div className="mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Pending</p>
                </div>
                <p className="font-mono text-[24px] font-bold text-amber-400">
                  {formatMoneyFull(sa.pendingAmount, currency)}
                </p>
                <div className="mt-2 space-y-1 text-[10px] table-text-muted">
                  <div className="flex justify-between">
                    <span>Check-ins pending</span>
                    <span className="font-mono text-white">{sa.checkinPendingCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In payout amount</span>
                    <span className="font-mono text-white">{formatMoneyFull(sa.inPayoutAmount, currency)}</span>
                  </div>
                </div>
              </CardShell>

              <CardShell>
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-400" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Review pending</p>
                </div>
                <p className="font-mono text-[24px] font-bold text-orange-400">
                  {formatMoneyFull(sa.gymReviewPendingAmount, currency)}
                </p>
                <div className="mt-2 text-[10px] table-text-muted">
                  <span className="font-mono text-white">{sa.gymReviewPendingCount}</span> batches awaiting your review
                </div>
              </CardShell>

              <CardShell>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Received</p>
                </div>
                <p className="font-mono text-[24px] font-bold text-emerald-400">
                  {formatMoneyFull(sa.receivedAmount, currency)}
                </p>
                <div className="mt-2 space-y-1 text-[10px] table-text-muted">
                  <div className="flex justify-between">
                    <span>Total check-in settlements</span>
                    <span className="font-mono text-white">{sa.totalCheckinSettlements}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="font-mono text-white">{sa.checkinPaidCount}</span>
                  </div>
                </div>
              </CardShell>
            </div>

            {/* Revenue trend + due timeline + check-in trend */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <CardShell>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Revenue trend</p>
                  </div>
                  <FilterTabs
                    options={[
                      { label: "Week", value: "WEEKLY" },
                      { label: "Month", value: "MONTHLY" },
                      { label: "Year", value: "YEARLY" },
                    ]}
                    value={revenueRange}
                    onChange={(v) => setRevenueRange(v as RevenueTrendRange)}
                  />
                </div>
                <div className={cn(CHART_MIN_H, "w-full")}>
                  {revenueTrendQ.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : revenueTrendQ.isError ? (
                    <QueryErrorState error={revenueTrendQ.error} fallback="Failed to load revenue trend" />
                  ) : revenueTrendData.length === 0 ? (
                    <EmptyState message="No revenue trend data yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData}>
                        <defs>
                          <linearGradient id="gymRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="#52525b"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => formatMoney(v, revenueTrendCurrency)}
                        />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => formatMoneyFull(v, revenueTrendCurrency)} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#f97316"
                          strokeWidth={2}
                          fill="url(#gymRevenueGrad)"
                          name="Revenue"
                        />
                        <Area
                          type="monotone"
                          dataKey="paid"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          fill="none"
                          name="Received"
                          strokeDasharray="4 3"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardShell>

              {/* Due timeline */}
              <CardShell>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-400" />
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Due timeline</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-orange-400">Total due</p>
                    <p className="font-mono text-[12px] font-bold text-white">
                      {formatMoney(dueTimelineTotalDue, dueTimelineCurrency)}
                    </p>
                  </div>
                </div>
                <div className={cn(CHART_MIN_H, "w-full")}>
                  {dueTimelineQ.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : dueTimelineQ.isError ? (
                    <QueryErrorState error={dueTimelineQ.error} fallback="Failed to load due timeline" />
                  ) : dueTimelineData.length === 0 ? (
                    <EmptyState message="No pending settlements." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dueTimelineData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#737373", fontSize: 8 }}
                          axisLine={false}
                          tickLine={false}
                          interval={dueTimelineXAxisInterval}
                          tickFormatter={(value: string) => formatYmdAxisLabel(value)}
                          minTickGap={18}
                        />
                        <YAxis
                          domain={[0, dueTimelineYMax]}
                          tick={{ fill: "#737373", fontSize: 9 }}
                          axisLine={false}
                          tickLine={false}
                          width={52}
                          tickFormatter={(value: number) => formatMoney(value, dueTimelineCurrency)}
                        />
                        <Tooltip
                          {...CHART_TOOLTIP}
                          labelFormatter={(label: string) => formatYmdLongLabel(label)}
                          formatter={(value: number, name: string) => [formatMoney(value, dueTimelineCurrency), name]}
                        />
                        <ReferenceLine
                          y={0}
                          stroke="rgba(255,255,255,0.14)"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                        />
                        <Bar
                          dataKey="checkinAmount"
                          name="Check-in settlements"
                          fill="#f97316"
                          radius={[2, 2, 0, 0]}
                          minPointSize={2}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="dueAmount"
                          name="Total due"
                          stroke="#f43f5e"
                          strokeWidth={2}
                          dot={{ r: 2, fill: "#f43f5e", strokeWidth: 0 }}
                          activeDot={{ r: 3 }}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardShell>

              {/* Check-in trend */}
              <CardShell>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-400" />
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Check-in trend</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border table-border table-bg px-3.5 py-1.5 text-[11px] font-bold table-text transition-all hover:text-white"
                      >
                        {CHECKIN_TREND_LABEL[trendRange]}
                        <ChevronDown className="h-3 w-3 opacity-55" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-2xl border border-white/10 bg-[#121212] p-2 text-white shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
                    >
                      <DropdownMenuLabel className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                        Time range
                      </DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={trendRange}
                        onValueChange={(v) => setTrendRange(v as CheckInTrendRange)}
                      >
                        {CHECKIN_TREND_OPTIONS.map((o) => (
                          <DropdownMenuRadioItem key={o.value} value={o.value} className={dropdownItemCls}>
                            {o.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className={cn(CHART_MIN_H, "w-full")}>
                  {trendQ.isLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : trendQ.isError ? (
                    <QueryErrorState error={trendQ.error} fallback="Failed to load check-in trend" />
                  ) : trendData.length === 0 ? (
                    <EmptyState message="No check-in data" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="#52525b"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          domain={[0, trendMax > 0 ? (dm: number) => Math.ceil(dm * 1.15) : 5]}
                        />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => [`${v}`, "Check-ins"]} />
                        <Bar dataKey="count" name="Check-ins" radius={[3, 3, 0, 0]} fill="#ea580c" minPointSize={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardShell>
            </div>
          </>
        ) : (
          <CardShell className={CHART_MIN_H}>
            <EmptyState message="No settlement data yet" />
          </CardShell>
        )}
      </div>

      {/* ── SECTION 3: ACCESS & ACTIVITY ──────────────────────── */}
      <div>
        <SectionLabel>Access &amp; activity</SectionLabel>
        {checkInQ.isError ? (
          <CardShell className={CHART_MIN_H}>
            <QueryErrorState error={checkInQ.error} fallback="Failed to load check-in analytics" />
          </CardShell>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr]">
            {/* Peak activity chart */}
            <CardShell>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-400" />
                  <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Peak activity</p>
                </div>
                <FilterTabs
                  options={[
                    { label: "Today", value: "TODAY" },
                    { label: "Week", value: "WEEK" },
                    { label: "All", value: "ALL_TIME" },
                  ]}
                  value={peakRange}
                  onChange={(v) => setPeakRange(v as PeakActivityRange)}
                />
              </div>
              <div className={cn(CHART_MIN_H, "w-full")}>
                {checkInQ.isLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : peakData.length === 0 ? (
                  <EmptyState message="No activity data" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakData} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} interval={2} />
                      <YAxis
                        stroke="#52525b"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        domain={[0, peakMax > 0 ? (dm: number) => Math.ceil(dm * 1.15) : 5]}
                      />
                      <Tooltip
                        {...CHART_TOOLTIP}
                        formatter={(v: number) => [`${v} check-ins`, "Activity"]}
                      />
                      <Bar
                        dataKey="count"
                        name="Check-ins"
                        radius={[3, 3, 0, 0]}
                        fill="#fb923c"
                        minPointSize={2}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardShell>

            {/* Success vs Denied pie */}
            <CardShell className="flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-orange-400" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Scan result</p>
              </div>
              <div className="flex flex-1 items-center justify-center">
                {checkInQ.isLoading ? (
                  <Skeleton className="h-[140px] w-[140px] rounded-full" />
                ) : ci && ci.totalScans > 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={scanPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {scanPieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip {...CHART_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-3 text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-sm bg-orange-500" />
                        {ci.successfulScans} success
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
                        {ci.deniedScans} denied
                      </span>
                    </div>
                  </div>
                ) : (
                  <EmptyState message="No scan data" />
                )}
              </div>
            </CardShell>

            {/* Top denied reasons */}
            <CardShell className="flex flex-col">
              <div className="mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Top denied reasons</p>
              </div>
              {checkInQ.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}
                </div>
              ) : ci && ci.deniedReasons.length > 0 ? (
                <div className="space-y-2">
                  {ci.deniedReasons.slice(0, 5).map((dr) => {
                    const pct = ci.deniedScans > 0 ? (dr.count / ci.deniedScans) * 100 : 0;
                    return (
                      <div key={dr.reason}>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400 truncate max-w-[70%]">{formatDenyReason(dr.reason)}</span>
                          <span className="font-mono text-white">{dr.count}</span>
                        </div>
                        <div className="mt-0.5 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-red-500/60"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="No denied scans" />
              )}
            </CardShell>
          </div>
        )}
      </div>

      {/* ── SECTION 4: MEMBERS & REVIEWS ──────────────────────── */}
      <div>
        <SectionLabel>Members &amp; reviews</SectionLabel>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Member pulse */}
          <CardShell>
            <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-400" />
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Member pulse</p>
            </div>
            {membersQ.isError ? (
              <QueryErrorState error={membersQ.error} fallback="Failed to load member metrics" />
            ) : membersQ.isLoading || savedSummaryQ.isLoading ? (
              <Skeleton className="h-36" />
            ) : mm ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <MiniStat label="Total members" value={mm.uniqueCustomers.toLocaleString()} />
                  <MiniStat
                    label="Saved members"
                    value={savedSummaryQ.isError ? "—" : String(savedSummaryQ.data?.totalSavedMembers ?? 0)}
                  />
                  <MiniStat label="Repeat customers" value={mm.repeatCustomers.toLocaleString()} />
                  <MiniStat label="Repeat rate" value={`${mm.repeatRatePct.toFixed(1)}%`}>
                    <Badge c={mm.repeatRatePct >= 50 ? "green" : mm.repeatRatePct >= 30 ? "amber" : "red"}>
                      {mm.repeatRatePct >= 50 ? "strong" : mm.repeatRatePct >= 30 ? "moderate" : "low"}
                    </Badge>
                  </MiniStat>
                </div>
                {mm.mostCheckedInMember && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2">
                    {mm.mostCheckedInMember.profileImageUrl ? (
                      <img
                        src={mm.mostCheckedInMember.profileImageUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover bg-white/[0.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 font-mono text-[10px] font-bold text-orange-400">
                        {mm.mostCheckedInMember.memberName?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-white truncate">
                        {mm.mostCheckedInMember.memberName ?? "Unknown"}
                      </p>
                        <p className="text-[10px] text-zinc-500">Most frequent visitor / all time</p>
                    </div>
                    <span className="font-mono text-sm font-bold text-orange-400">
                      {mm.mostCheckedInMember.visitCount} visits
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="No member data yet" />
            )}
          </CardShell>

          {/* Review quality */}
          <CardShell>
            <div className="mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Review quality</p>
            </div>
            {reviewQ.isError ? (
              <QueryErrorState error={reviewQ.error} fallback="Failed to load review analytics" />
            ) : reviewQ.isLoading ? (
              <Skeleton className="h-36" />
            ) : rv ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <MiniStat label="Average rating" value={rv.averageRating != null ? `${rv.averageRating.toFixed(1)} \u2605` : "—"} />
                  <MiniStat label="Total reviews" value={rv.totalReviews.toLocaleString()} />
                  <MiniStat label="Unreplied" value={rv.unrepliedCount.toLocaleString()}>
                    <Badge c={rv.unrepliedCount > 0 ? "amber" : "green"}>
                      {rv.unrepliedCount > 0 ? "needs reply" : "all replied"}
                    </Badge>
                  </MiniStat>
                </div>
                {ratingData.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-500">Rating distribution</p>
                    {ratingData.map((r) => (
                      <div key={r.rating} className="flex items-center gap-2">
                        <span
                          className="w-5 text-right text-[11px] font-bold"
                          style={{
                            color: r.rating >= 4 ? "#4ade80" : r.rating === 3 ? "#fbbf24" : "#ef4444",
                          }}
                        >
                          {r.rating}{"\u2605"}
                        </span>
                        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(r.percentage, 1)}%`,
                              background: r.rating >= 4 ? "#4ade80" : r.rating === 3 ? "#fbbf24" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="w-9 text-right font-mono text-[11px] text-zinc-500">
                          {r.percentage.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="No review data yet" />
            )}
          </CardShell>
        </div>
      </div>

      {/* ── SECTION 5: ACTION RAIL ────────────────────────────── */}
      <div>
        <SectionLabel>Action rail</SectionLabel>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
          {/* Pending payout batches */}
          <CardShell>
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-400" />
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Recent payout batches</p>
            </div>
            {payoutBatchesQ.isError ? (
              <QueryErrorState error={payoutBatchesQ.error} fallback="Failed to load payout batches" />
            ) : payoutBatchesQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : payoutBatchesQ.data?.content && payoutBatchesQ.data.content.length > 0 ? (
              <div className="divide-y divide-white/[0.06]">
                {payoutBatchesQ.data.content.map((p) => (
                  <div key={p.payoutSettlementId} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-white">
                        Batch #{p.payoutSettlementId}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(p.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {" \u00B7 "}
                        {p.settlementCount} settlements
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-white">
                          {formatMoneyFull(p.netAmount, p.currency)}
                        </p>
                        <Badge c={batchStatusTone(p.status)}>
                          {gymBatchLabel(p.status).toLowerCase()}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                            aria-label={`Actions for batch #${p.payoutSettlementId}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 border table-border table-bg-alt text-white">
                          <DropdownMenuItem
                            className="cursor-pointer focus:bg-white/10 focus:text-white"
                            onClick={() => setBatchDetail(p)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {p.proofUrl ? (
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-white/10 focus:text-white"
                              onClick={() => setProofUrl(p.proofUrl)}
                            >
                              <Wallet className="mr-2 h-4 w-4" />
                              View proof
                            </DropdownMenuItem>
                          ) : null}
                          {p.status === "GYM_REVIEW_PENDING" ? (
                            <>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                className="cursor-pointer text-emerald-300 focus:bg-emerald-500/10 focus:text-emerald-200"
                                onClick={() => setReviewTarget({ batch: p, approved: true })}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                                onClick={() => setReviewTarget({ batch: p, approved: false })}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No payout batches yet" />
            )}
          </CardShell>

          {/* Alerts & quick links */}
          <div className="space-y-3">
            <CardShell>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Alerts</p>
              </div>
              {overviewQ.isError ? (
                <QueryErrorState error={overviewQ.error} fallback="Failed to load alerts" />
              ) : overviewQ.isLoading ? (
                <Skeleton className="h-28" />
              ) : (
                <div className="space-y-2">
                  {/* Device alert */}
                  {deviceStatus && deviceStatus.tone !== "green" && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3">
                      <MonitorSmartphone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                      <div>
                        <p className="text-xs font-bold text-amber-400">Door device {deviceStatus.label.toLowerCase()}</p>
                        <p className="text-[10px] text-zinc-500">Check device connectivity</p>
                      </div>
                    </div>
                  )}

                  {/* Unreplied reviews alert */}
                  {rv && rv.unrepliedCount > 0 && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-orange-400/15 bg-orange-400/5 p-3">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                      <div>
                        <p className="text-xs font-bold text-orange-400">{rv.unrepliedCount} unreplied reviews</p>
                        <p className="text-[10px] text-zinc-500">Respond to improve engagement</p>
                      </div>
                    </div>
                  )}

                  {/* Gym review pending payouts */}
                  {sa && sa.gymReviewPendingCount > 0 && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-purple-400/15 bg-purple-400/5 p-3">
                      <Wallet className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-400" />
                      <div>
                        <p className="text-xs font-bold text-purple-400">{sa.gymReviewPendingCount} payouts need review</p>
                        <p className="text-[10px] text-zinc-500">{formatMoneyFull(sa.gymReviewPendingAmount, currency)} awaiting your review</p>
                      </div>
                    </div>
                  )}

                  {/* Profile readiness */}
                  {profileQ.data && !profileQ.data.readyForReviewSubmission && profileQ.data.approvalStatus === "DRAFT" && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-orange-400/15 bg-orange-400/5 p-3">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                      <div>
                        <p className="text-xs font-bold text-orange-400">Profile incomplete</p>
                        <p className="text-[10px] text-zinc-500">Complete setup to enable check-ins</p>
                      </div>
                    </div>
                  )}

                  {/* All clear */}
                  {deviceStatus?.tone === "green" &&
                    (!rv || rv.unrepliedCount === 0) &&
                    (!sa || sa.gymReviewPendingCount === 0) &&
                    (profileQ.data?.readyForReviewSubmission || profileQ.data?.approvalStatus !== "DRAFT") && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-emerald-400">All clear</p>
                        <p className="text-[10px] text-zinc-500">No pending actions required</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardShell>

            <CardShell>
              <p className="mb-3 text-[9px] font-black uppercase tracking-[0.12em] text-orange-500">Quick links</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Revenue", icon: Wallet, section: "revenue" },
                  { label: "Members", icon: Users, section: "members" },
                  { label: "Reviews", icon: Star, section: "reviews" },
                  { label: "QR / Access", icon: MonitorSmartphone, section: "qr" },
                ].map(({ label, icon: I, section }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate("/dashboard", { state: { activeSection: section } })}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left text-[11px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <I className="h-3.5 w-3.5 text-orange-500" />
                    {label}
                    <ArrowRight className="ml-auto h-3 w-3 text-zinc-600" />
                  </button>
                ))}
              </div>
            </CardShell>
          </div>
        </div>
      </div>

      <Dialog open={!!batchDetail} onOpenChange={(open) => { if (!open) setBatchDetail(null); }}>
        <DialogContent
          className="max-w-lg border-zinc-700/50 bg-zinc-900 text-white sm:rounded-2xl"
          onInteractOutside={(event) => { if (isInsideRadixPortalSurface(event.target)) event.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Payout #{batchDetail?.payoutSettlementId}</DialogTitle>
          </DialogHeader>
          {batchDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailRow label="Status" value={gymBatchLabel(batchDetail.status)} />
                <DetailRow label="Net amount" value={formatMoneyFull(batchDetail.netAmount, batchDetail.currency)} />
                <DetailRow label="Gross amount" value={formatMoneyFull(batchDetail.grossAmount, batchDetail.currency)} />
                <DetailRow label="Service fee" value={formatMoneyFull(batchDetail.commissionAmount, batchDetail.currency)} />
                <DetailRow label="Settlements" value={String(batchDetail.settlementCount)} />
                <DetailRow label="Created" value={formatDateTime(batchDetail.createdAt)} />
                <DetailRow label="Created by" value={batchDetail.createdByName ?? "—"} />
                <DetailRow label="Paid at" value={formatDateTime(batchDetail.paidAt)} />
                <DetailRow label="Paid by" value={batchDetail.paidByName ?? "—"} />
                <DetailRow label="Reviewed" value={formatDateTime(batchDetail.gymReviewedAt)} />
                <DetailRow label="Reference" value={batchDetail.transactionReference ?? "—"} />
                <DetailRow label="Wallet" value={batchDetail.walletIdentifierSnapshot || "—"} />
                {batchDetail.note ? (
                  <div className="col-span-2">
                    <DetailRow label="Note" value={batchDetail.note} />
                  </div>
                ) : null}
              </div>
              {batchDetail.proofUrl ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Proof</p>
                  <button type="button" className="block w-full" onClick={() => setProofUrl(batchDetail.proofUrl)}>
                    <img
                      src={batchDetail.proofUrl}
                      alt={`Payment proof for batch ${batchDetail.payoutSettlementId}`}
                      className="max-h-48 rounded-lg border border-zinc-700/50 object-contain"
                    />
                  </button>
                </div>
              ) : null}
              {batchDetail.status === "GYM_REVIEW_PENDING" ? (
                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                  <button
                    type="button"
                    onClick={() => setReviewTarget({ batch: batchDetail, approved: false })}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-[11px] font-bold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTarget({ batch: batchDetail, approved: true })}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-500"
                  >
                    Confirm received
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofUrl} onOpenChange={(open) => { if (!open) setProofUrl(null); }}>
        <DialogContent className="max-w-sm border-zinc-700/50 bg-zinc-900 p-4 text-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Payment proof</DialogTitle>
          </DialogHeader>
          {proofUrl ? <img src={proofUrl} alt="Payment proof preview" className="w-full rounded-lg object-contain" /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) setReviewTarget(null); }}>
        <AlertDialogContent className="border-zinc-700/50 bg-zinc-900 text-white sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewTarget?.approved ? "Confirm receipt" : "Reject payout"} — Batch #{reviewTarget?.batch.payoutSettlementId}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {reviewTarget?.approved
                ? `You are confirming that you received ${formatMoneyFull(reviewTarget.batch.netAmount, reviewTarget.batch.currency)}.`
                : `You are rejecting this payout of ${formatMoneyFull(reviewTarget?.batch.netAmount ?? 0, reviewTarget?.batch.currency)}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={reviewMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                reviewMutation.mutate();
              }}
              className={reviewTarget?.approved ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-red-600 text-white hover:bg-red-500"}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : reviewTarget?.approved ? "Yes, confirm received" : "Reject payout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
