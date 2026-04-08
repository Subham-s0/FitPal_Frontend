import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  MoreVertical,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";

import {
  getAdminPaymentHistoryApi,
  getAdminPaymentMetricsApi,
  getAdminRevenueTrendApi,
} from "@/features/admin/admin-payment.api";
import { getAdminPayoutBatchesApi } from "@/features/admin/admin-settlement.api";
import type { AdminPaymentHistoryItemResponse } from "@/features/admin/admin-payment.model";
import type {
  PayoutSettlementResponse,
  PayoutSettlementStatus,
} from "@/features/admin/admin-settlement.model";
import {
  getPaymentMethodLabel,
  getPaymentStatusBadgeClassName,
  type RevenueTrendGranularity,
  REVENUE_TREND_GRANULARITIES,
} from "@/features/payment/payment.constants";
import { PaymentAttemptDetailFields } from "@/features/payment/components/PaymentAttemptDetailFields";
import type { PaymentMethod, PaymentStatus } from "@/features/payment/model";
import { getApiErrorMessage } from "@/shared/api/client";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent } from "@/shared/ui/tabs";
import { cn } from "@/shared/lib/utils";

/*  Shared constants (mirrors ManageSettlements)  */
const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const MG_TOOLBAR_BASE =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform";
const MG_FILTER_IDLE =
  "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]";
const MG_FILTER_ACTIVE = "border-orange-500/50 bg-orange-500 text-white";
const MG_REFRESH =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/20 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] disabled:opacity-50";
const MG_DIALOG_OUTLINE = `${MG_TOOLBAR_BASE} ${MG_FILTER_IDLE}`;
const MG_DIALOG_CLEAR = `${MG_TOOLBAR_BASE} border-white/10 bg-white/[0.03] text-zinc-400 hover:border-orange-500/30 hover:text-orange-400`;

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

const PAGE_SIZES = ["10", "15", "20"] as const;
const BATCH_PAGE_SIZE = 20;

type BatchSortKey = null | "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
const BATCH_SORTS: { key: BatchSortKey; label: string }[] = [
  { key: null, label: "Sort" },
  { key: "date-desc", label: "Date (Newest)" },
  { key: "date-asc", label: "Date (Oldest)" },
  { key: "amount-desc", label: "Amount (High)" },
  { key: "amount-asc", label: "Amount (Low)" },
];

type BatchStatusFilter = "ALL" | PayoutSettlementStatus;

/*  Helpers  */
const formatMoney = (amount: number, currency?: string | null) => {
  const c = (currency?.trim() || "NPR");
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 2 }).format(amount ?? 0);
  } catch {
    return `${c} ${(amount ?? 0).toFixed(2)}`;
  }
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const formatTrendAxis = (iso: string, g: RevenueTrendGranularity) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (g === "YEARLY") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  if (g === "MONTHLY") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
};

function batchStatusClassName(status: PayoutSettlementStatus) {
  switch (status) {
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "APPROVED":
      return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    case "REJECTED":
    case "FAILED":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "CANCELLED":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "GYM_REVIEW_PENDING":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  }
}

function isInsideRadixPortalSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-radix-popper-content-wrapper]") ||
    target.closest("[data-radix-select-content]") ||
    target.closest("[data-radix-dropdown-menu-content]")
  );
}

/*  PaginationControls (mirrors ManageSettlements)  */
function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPageChange,
  hasNext,
  hasPrevious,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  hasNext: boolean;
  hasPrevious: boolean;
}) {
  const pages: (number | "...")[] = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(Math.max(1, totalPages) - 1, page + 2);

  if (start > 0) pages.push(0);
  if (start > 1) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 2) pages.push("...");
  if (end < totalPages - 1) pages.push(totalPages - 1);

  return (
    <div className="flex items-center justify-between border-t table-border px-4 py-3">
      <p className="text-[12px] table-text-muted">
        Page {page + 1} of {Math.max(totalPages, 1)} - {totalItems} total
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-full border table-border table-bg px-3.5 text-[11px] table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-50"
          disabled={!hasPrevious}
          onClick={() => onPageChange(Math.max(page - 1, 0))}
        >
          Prev
        </Button>
        {pages.map((p, i) =>
          typeof p === "number" ? (
            <Button
              key={i}
              type="button"
              variant={p === page ? "default" : "outline"}
              className={cn(
                "h-8 min-w-[32px] rounded-full px-2 text-[11px] tabular-nums transition-colors",
                p === page
                  ? "border border-orange-500/50 bg-orange-500 text-white"
                  : "border table-border table-bg table-text transition-all hover:border-orange-500/30 hover:text-orange-400"
              )}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </Button>
          ) : (
            <span key={i} className="px-2 text-xs text-zinc-600">
              {p}
            </span>
          )
        )}
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-full border table-border table-bg px-3.5 text-[11px] table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-50"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/*  Types  */
type StatusFilter = "ALL" | PaymentStatus;
type MethodFilter = "ALL" | PaymentMethod;
type RevenueWindow = "ALL_TIME" | "THIS_MONTH";
const DEFAULT_BATCH_FILTERS = { status: "ALL" as BatchStatusFilter };

export default function ManagePayments() {
  /*  Subscription tab state  */
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [trendGranularity, setTrendGranularity] = useState<RevenueTrendGranularity>("WEEKLY");
  const [revenueWindow, setRevenueWindow] = useState<RevenueWindow>("ALL_TIME");
  const [detail, setDetail] = useState<AdminPaymentHistoryItemResponse | null>(null);

  /*  Payouts tab state  */
  const [batchPage, setBatchPage] = useState(0);
  const [batchStatus, setBatchStatus] = useState<BatchStatusFilter>(DEFAULT_BATCH_FILTERS.status);
  const [draftBatchStatus, setDraftBatchStatus] = useState<BatchStatusFilter>(DEFAULT_BATCH_FILTERS.status);
  const [batchFilterDialogOpen, setBatchFilterDialogOpen] = useState(false);
  const [batchSortIdx, setBatchSortIdx] = useState(0);
  const [batchDetail, setBatchDetail] = useState<PayoutSettlementResponse | null>(null);

  const syncBatchDraftFromApplied = useCallback(() => {
    setDraftBatchStatus(batchStatus);
  }, [batchStatus]);

  useEffect(() => {
    if (batchFilterDialogOpen) syncBatchDraftFromApplied();
  }, [batchFilterDialogOpen, syncBatchDraftFromApplied]);

  const applyBatchFilters = () => {
    setBatchStatus(draftBatchStatus);
    setBatchPage(0);
    setBatchFilterDialogOpen(false);
  };
  const clearBatchFilters = () => {
    setBatchStatus(DEFAULT_BATCH_FILTERS.status);
    setDraftBatchStatus(DEFAULT_BATCH_FILTERS.status);
    setBatchPage(0);
    setBatchFilterDialogOpen(false);
  };

  const batchSortMode = BATCH_SORTS[batchSortIdx] ?? BATCH_SORTS[0];
  const BatchSortIcon = ArrowUpDown;

  const batchFilterPillItems = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (batchStatus !== "ALL") pills.push({ key: "status", label: batchStatus });
    return pills;
  }, [batchStatus]);

  const removeAppliedBatchFilter = (key: string) => {
    if (key === "status") { setBatchStatus("ALL"); setBatchPage(0); }
  };

  /*  Subscription debounce + page reset  */
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [debounced, pageSize, statusFilter, methodFilter, sortDirection]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /*  Queries  */
  const metricsQ = useQuery({
    queryKey: ["admin-payments", "metrics"],
    queryFn: getAdminPaymentMetricsApi,
    staleTime: 30_000,
  });

  const trendQ = useQuery({
    queryKey: ["admin-payments", "trend", trendGranularity],
    queryFn: () => getAdminRevenueTrendApi(trendGranularity),
    staleTime: 60_000,
  });

  const historyQ = useQuery({
    queryKey: ["admin-payments", "history", debounced, page, pageSize, statusFilter, methodFilter, sortDirection],
    queryFn: () =>
      getAdminPaymentHistoryApi({
        query: debounced || undefined,
        statuses: statusFilter === "ALL" ? undefined : [statusFilter],
        paymentMethods: methodFilter === "ALL" ? undefined : [methodFilter],
        sortBy: "paymentTime",
        sortDirection,
        page,
        size: pageSize,
      }),
    placeholderData: (prev) => prev,
  });

  const batchesQ = useQuery({
    queryKey: ["admin-payments", "payouts", batchGymIdKey(), batchStatus, batchSortIdx, batchPage],
    queryFn: () => {
      const sortKey = batchSortMode.key;
      const sortBy = sortKey === "amount-asc" || sortKey === "amount-desc" ? "grossAmount" : "createdAt";
      const sortDirection = sortKey === "date-asc" || sortKey === "amount-asc" ? "ASC" : "DESC";
      return getAdminPayoutBatchesApi({
        status: batchStatus === "ALL" ? undefined : batchStatus,
        sortBy,
        sortDirection,
        page: batchPage,
        size: BATCH_PAGE_SIZE,
      });
    },
    placeholderData: (prev) => prev,
  });

  function batchGymIdKey() { return "all"; }

  /*  Derived  */
  const metrics = metricsQ.data;
  const currency = metrics?.currency ?? "NPR";
  const revenueMonthToDate = metrics?.totalRevenueCompletedMonthToDate ?? 0;
  const revenueAllTime = metrics?.totalRevenueCompleted ?? 0;
  const displayedRevenue = revenueWindow === "THIS_MONTH" ? revenueMonthToDate : revenueAllTime;
  const secondaryRevenueLabel =
    revenueWindow === "THIS_MONTH"
      ? `All-time completed: ${formatMoney(revenueAllTime, currency)}`
      : `This month completed: ${formatMoney(revenueMonthToDate, currency)}`;

  const gatewayPieData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Khalti", value: metrics.khaltiRevenueCompleted ?? 0, fill: "#ea580c" },
      { name: "eSewa", value: metrics.esewaRevenueCompleted ?? 0, fill: "#14b8a6" },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const trendChartData = useMemo(() => {
    return (trendQ.data?.points ?? []).map((p) => ({
      label: formatTrendAxis(p.periodStart, trendGranularity),
      totalAmount: p.totalAmount,
    }));
  }, [trendQ.data?.points, trendGranularity]);

  const trendChartDisplay = useMemo(() => {
    if (trendQ.isLoading) return [];
    if (trendChartData.length > 0) return trendChartData;
    return [{ label: "-", totalAmount: 0, isPlaceholder: true as const }];
  }, [trendChartData, trendQ.isLoading]);

  const items = historyQ.data?.items ?? [];
  const total = historyQ.data?.totalItems ?? 0;
  const totalPages = Math.max(historyQ.data?.totalPages ?? 1, 1);

  const hasActiveSubFilters =
    searchInput.length > 0 || statusFilter !== "ALL" || methodFilter !== "ALL" || sortDirection !== "DESC" || filterOpen;

  const clearSubFilters = () => {
    setSearchInput(""); setDebounced(""); setStatusFilter("ALL");
    setMethodFilter("ALL"); setSortDirection("DESC"); setFilterOpen(false); setPage(0);
  };

  const COL_W = ["17%", "11%", "12%", "14%", "11%", "9%", "9%", "10%", "7%"];
  const colStyle = (i: number) => ({ width: COL_W[i] });

  return (
    <div className="space-y-5 font-['Outfit',system-ui,sans-serif]">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Manage <span style={fireStyle}>Payments</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void Promise.all([metricsQ.refetch(), trendQ.refetch(), historyQ.refetch(), batchesQ.refetch()])}
          disabled={metricsQ.isFetching || trendQ.isFetching || historyQ.isFetching || batchesQ.isFetching}
          className={MG_REFRESH}
        >
          {(metricsQ.isFetching || trendQ.isFetching || historyQ.isFetching || batchesQ.isFetching) ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      <Tabs defaultValue="subscriptions">

        {/* 
            TAB 1  MEMBER PAYMENTS (subscription attempts)
         */}
        <TabsContent value="subscriptions" className="mt-0 space-y-5">
          <p className="text-[13px] table-text-muted">
            Filters and search query the backend; the table is server-paged and server-filtered.
          </p>

          {/* Charts strip */}
          <div className="flex w-full min-w-0 flex-nowrap items-stretch gap-3 overflow-x-auto pb-1">
            {/* Revenue */}
            <div className="flex flex-1 min-w-[130px] flex-col rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-3">
              <div className="mb-2 flex w-full items-center justify-between gap-2 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400">Revenue</span>
                <div className="inline-flex gap-[3px] rounded-full border border-white/10 bg-white/[0.02] p-[3px]">
                  <button type="button" onClick={() => setRevenueWindow("ALL_TIME")}
                    className={cn("rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                      "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform",
                      revenueWindow === "ALL_TIME" 
                        ? "bg-orange-500 text-white" 
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]")}>
                    All time
                  </button>
                  <button type="button" onClick={() => setRevenueWindow("THIS_MONTH")}
                    className={cn("rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                      "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform",
                      revenueWindow === "THIS_MONTH" 
                        ? "bg-orange-500 text-white" 
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]")}>
                    This month
                  </button>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="mb-0.5 truncate text-[18px] font-black leading-tight text-white">
                  {metricsQ.isLoading ? "-" : formatMoney(displayedRevenue, currency)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {revenueWindow === "THIS_MONTH" ? "Month to date" : "All time"} - completed only
                </p>
                <p className="mt-1 text-[10px] text-slate-600">{metricsQ.isLoading ? "-" : secondaryRevenueLabel}</p>
              </div>
            </div>

            {/* Gateways */}
            <div className="flex flex-1 min-w-[160px] flex-col rounded-xl border table-border table-bg p-3">
              <div className="mb-2 flex w-full items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Gateways</span>
                <CreditCard className="h-3.5 w-3.5 text-orange-400/80" />
              </div>
              <div className="flex flex-1 items-center gap-3">
                <div className="relative h-[80px] flex-1">
                  {gatewayPieData.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-0.5 text-center">
                      <span className="text-[11px] font-bold text-slate-500">{formatMoney(0, currency)}</span>
                      <span className="text-[9px] text-slate-600">No completed revenue</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={gatewayPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={26} outerRadius={38} paddingAngle={2}>
                          {gatewayPieData.map((_, i) => (
                            <Cell key={i} fill={gatewayPieData[i].fill} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatMoney(v, currency)} {...CHART_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {gatewayPieData.length > 0 && (
                  <div className="flex shrink-0 flex-col gap-2.5 pr-1">
                    {gatewayPieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[11px] font-bold text-white">
                        <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: d.fill }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Outcomes */}
            <div className="flex flex-1 min-w-[130px] flex-col rounded-xl border border-slate-500/20 bg-slate-500/[0.06] p-3">
              <div className="mb-2 flex w-full items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Outcomes</span>
                <Check className="h-3.5 w-3.5 text-emerald-400/80" />
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
                <p className="flex flex-wrap items-baseline justify-center gap-1.5 text-[18px] font-black leading-none text-emerald-400">
                  {metricsQ.isLoading ? "" : (metrics?.completedPaymentCount ?? 0)}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">done</span>
                </p>
                <p className="flex flex-wrap items-baseline justify-center gap-1.5 text-[14px] font-black leading-none text-red-400/80">
                  {metricsQ.isLoading ? "" : (metrics?.failedPaymentCount ?? 0)}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">failed</span>
                </p>
                <p className="flex flex-wrap items-baseline justify-center gap-1.5 text-[14px] font-black leading-none text-slate-400">
                  {metricsQ.isLoading ? "" : (metrics?.cancelledPaymentCount ?? 0)}
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">cancelled</span>
                </p>
              </div>
            </div>

            {/* Revenue trend */}
            <div className="flex min-w-[260px] flex-[0_0_35%] flex-col rounded-xl border table-border table-bg p-3">
              <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-2 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Trend</span>
                <div className="inline-flex gap-[3px] rounded-full border border-white/10 bg-white/[0.02] p-[3px]">
                  {REVENUE_TREND_GRANULARITIES.map((granularity) => (
                    <button
                      key={granularity}
                      type="button"
                      onClick={() => setTrendGranularity(granularity)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform",
                        trendGranularity === granularity
                          ? "bg-orange-500 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                      )}
                    >
                      {granularity === "WEEKLY" ? "Week" : granularity === "MONTHLY" ? "Month" : "Year"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[80px] w-full flex-1">
                {trendQ.isLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartDisplay} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="adminPayRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ea580c" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#ea580c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" />
                      <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 8 }}
                        interval={trendGranularity === "MONTHLY" ? 4 : trendGranularity === "YEARLY" ? 0 : "preserveStartEnd"}
                        minTickGap={trendGranularity === "MONTHLY" ? 6 : 4} />
                      <YAxis tick={{ fill: "#737373", fontSize: 9 }} width={32}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} domain={[0, "auto"]} />
                      <Tooltip formatter={(v: number) => formatMoney(v, currency)}
                        labelFormatter={(label) => (String(label) === "" ? "No data in range" : label)} {...CHART_TOOLTIP} />
                      <Area type="monotone" dataKey="totalAmount" stroke="#ea580c" strokeWidth={1.5}
                        fill="url(#adminPayRevenueFill)" isAnimationActive={false}
                        dot={trendGranularity === "WEEKLY" ? { r: 2.5, fill: "#ea580c", strokeWidth: 0 } : false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Errors */}
          {(metricsQ.isError || trendQ.isError || historyQ.isError) && (
            <div className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
              {metricsQ.isError && <p>{getApiErrorMessage(metricsQ.error, "Could not load metrics")}</p>}
              {trendQ.isError && <p>{getApiErrorMessage(trendQ.error, "Could not load revenue trend")}</p>}
              {historyQ.isError && <p>{getApiErrorMessage(historyQ.error, "Could not load payment history")}</p>}
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative max-w-[320px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 table-text-muted" />
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search email, invoice, gateway id"
                className="w-full rounded-full border table-border table-bg py-2 pl-9 pr-4 text-[13px] font-medium text-white placeholder:table-text-muted outline-none transition-all focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)]" />
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              <button type="button" onClick={() => setSortDirection((d) => (d === "DESC" ? "ASC" : "DESC"))}
                className={cn(MG_TOOLBAR_BASE, sortDirection === "ASC" ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}>
                {sortDirection === "DESC" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                {sortDirection === "DESC" ? "Newest first" : "Oldest first"}
              </button>

              <div ref={filterRef} className="relative">
                <button type="button" onClick={() => setFilterOpen((v) => !v)}
                  className={cn(MG_TOOLBAR_BASE, filterOpen ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[240px] rounded-2xl border table-border table-bg p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                    <div className="px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">Status</div>
                    {([
                      ["ALL", "All statuses", (m: typeof metrics) => m?.totalPaymentCount],
                      ["COMPLETED", "Completed", (m: typeof metrics) => m?.completedPaymentCount],
                      ["PENDING", "Pending", (m: typeof metrics) => m?.pendingPaymentCount],
                      ["FAILED", "Failed", (m: typeof metrics) => m?.failedPaymentCount],
                      ["CANCELLED", "Cancelled", (m: typeof metrics) => m?.cancelledPaymentCount],
                    ] as const).map(([key, label, countFn]) => (
                      <button key={key} type="button" onClick={() => setStatusFilter(key)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors ${statusFilter === key ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}>
                        <span className="min-w-0 truncate text-left text-[12px] font-semibold table-text">{label}</span>
                        <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-black text-slate-400">
                            {metricsQ.isLoading ? "..." : (countFn(metrics) ?? "-")}
                          </span>
                          {statusFilter === key && <Check className="h-3.5 w-3.5 text-orange-400" />}
                        </span>
                      </button>
                    ))}
                    <div className="mt-1 border-t border-[hsl(0,0%,13%)] px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">Payment method</div>
                    {([
                      ["ALL", "All methods", (m: typeof metrics) => m?.totalPaymentCount],
                      ["ESEWA", "eSewa", (m: typeof metrics) => m?.esewaPaymentCount],
                      ["KHALTI", "Khalti", (m: typeof metrics) => m?.khaltiPaymentCount],
                    ] as const).map(([key, label, countFn]) => (
                      <button key={key} type="button" onClick={() => setMethodFilter(key)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors ${methodFilter === key ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}>
                        <span className="text-[12px] font-semibold table-text">{label}</span>
                        <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-black text-slate-400">
                            {metricsQ.isLoading ? "..." : (countFn(metrics) ?? "-")}
                          </span>
                          {methodFilter === key && <Check className="h-3.5 w-3.5 text-orange-400" />}
                        </span>
                      </button>
                    ))}
                    <div className="mt-1 border-t border-[hsl(0,0%,13%)] px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">Page size</div>
                    <div className="px-2 pb-2">
                      <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                        <SelectTrigger className="h-9 w-full rounded-xl border table-border table-bg text-[12px] font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="table-border table-bg-alt text-white">
                          {PAGE_SIZES.map((v) => <SelectItem key={v} value={v} className="text-[12px]">{v} / page</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <button type="button" onClick={clearSubFilters}
                className={cn(MG_TOOLBAR_BASE, hasActiveSubFilters ? MG_FILTER_ACTIVE : "table-border table-bg table-text opacity-50 hover:border-orange-500/30 hover:text-orange-400")}>
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>

          {total > 0 && (
            <p className="text-[12px] table-text-muted">
              <span className="font-semibold text-white">{total}</span> payment{total !== 1 ? "s" : ""} match your filters
            </p>
          )}

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[18px] border table-border table-bg md:block">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <thead>
                <tr className="table-header-bg border-b table-border">
                  {["User", "Invoice", "Plan", "Billing", "Amount", "Method", "Status", "Paid at", ""].map((h, i) => (
                    <th key={h} style={colStyle(i)} className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyQ.isLoading ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-orange-500" />
                    <div className="text-[13px] table-text-muted">Loading payments</div>
                  </td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <Search className="mx-auto mb-2 h-8 w-8 table-text-muted" strokeWidth={1.5} />
                    <div className="text-[16px] font-bold table-text">{debounced ? "No results" : "No payments yet"}</div>
                    <div className="mt-1 text-[13px] table-text-muted">
                      {debounced ? `Nothing matches "${debounced}"` : "Completed and other attempts will show here."}
                    </div>
                  </td></tr>
                ) : (
                  items.map((row) => (
                    <tr key={row.paymentAttemptId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                      <td className="px-3.5 py-3.5 pl-5" style={colStyle(0)}>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-bold text-white">{row.accountUserName?.trim() || "-"}</div>
                          <div className="mt-0.5 truncate text-[12px] font-medium text-slate-400">{row.accountEmail}</div>
                          <div className="truncate font-mono text-[10px] table-text-muted">#{row.accountId}</div>
                        </div>
                      </td>
                      <td className="table-text-muted truncate px-3.5 py-3.5 font-mono text-[11px]" style={colStyle(1)}>{row.invoiceNumber ?? "-"}</td>
                      <td className="truncate px-3.5 py-3.5 text-[12px] table-text" style={colStyle(2)}>{row.planName ?? "-"}</td>
                      <td className="px-3.5 py-3.5 align-top text-[11px] text-slate-300" style={colStyle(3)}>
                        <p className="line-clamp-2 font-semibold text-white">{row.billingName?.trim() || "-"}</p>
                        <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{[row.billingAddress, row.billingCity].filter(Boolean).join(", ") || "-"}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{row.billingPhoneNumber || "-"}</p>
                      </td>
                      <td className="px-3.5 py-3.5 text-[13px] font-bold text-white" style={colStyle(4)}>{formatMoney(row.totalAmount, row.currency)}</td>
                      <td className="px-3.5 py-3.5 text-[11px] font-semibold" style={colStyle(5)}>{getPaymentMethodLabel(row.paymentMethod)}</td>
                      <td className="px-3.5 py-3.5" style={colStyle(6)}>
                        <Badge className={cn("text-[10px] font-black uppercase", getPaymentStatusBadgeClassName(row.paymentStatus))}>{row.paymentStatus}</Badge>
                      </td>
                      <td className="table-text truncate px-3.5 py-3.5 text-[12px]" style={colStyle(7)}>{formatDateTime(row.paymentTime)}</td>
                      <td className="px-2 py-3.5 text-right" style={colStyle(8)}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#0f0f0f] text-white">
                            <DropdownMenuItem className="cursor-pointer focus:bg-white/10 focus:text-white" onClick={() => setDetail(row)}>
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {historyQ.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[13px] table-text-muted">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" /> Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border table-border table-bg px-4 py-10 text-center text-[13px] table-text-muted">No payments</div>
            ) : (
              items.map((row) => (
                <button key={row.paymentAttemptId} type="button" onClick={() => setDetail(row)}
                  className="w-full rounded-2xl border table-border table-bg p-4 text-left transition-colors hover:table-bg-hover">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-white">{row.accountUserName?.trim() || "-"}</p>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-slate-400">{row.accountEmail}</p>
                      <p className="mt-1 font-mono text-[11px] table-text-muted">{row.invoiceNumber ?? `#${row.paymentAttemptId}`}</p>
                      <p className="mt-2 text-[15px] font-black text-white">{formatMoney(row.totalAmount, row.currency)}</p>
                    </div>
                    <Badge className={cn("shrink-0", getPaymentStatusBadgeClassName(row.paymentStatus))}>{row.paymentStatus}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span>{getPaymentMethodLabel(row.paymentMethod)}</span>
                    <span>-</span>
                    <span>{formatDateTime(row.paymentTime)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t table-border-cell pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] table-text-muted">Filters apply to the payment history table above.</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 0 || historyQ.isFetching} onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              <span className="rounded-full border table-border table-bg-alt px-4 py-1.5 text-[11px] font-semibold text-white">
                Page {page + 1} of {totalPages}
              </span>
              <button type="button" disabled={!historyQ.data?.hasNext || historyQ.isFetching} onClick={() => setPage((p) => p + 1)}
                className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
            </div>
          </div>

          {/* Detail dialog */}
          <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-black">Payment details</DialogTitle>
                <DialogDescription className="text-[13px] text-[hsl(0,0%,50%)]">
                  Read-only snapshot from the gateway and subscription record.
                </DialogDescription>
              </DialogHeader>
              {detail && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-4">
                    <p className="text-3xl font-black">{formatMoney(detail.totalAmount, detail.currency)}</p>
                    <Badge className={cn(getPaymentStatusBadgeClassName(detail.paymentStatus))}>{detail.paymentStatus}</Badge>
                    <p className="font-mono text-[11px] table-text-muted">{detail.invoiceNumber ?? `Attempt #${detail.paymentAttemptId}`}</p>
                  </div>
                  <PaymentAttemptDetailFields detail={detail} account={{ userName: detail.accountUserName, email: detail.accountEmail, accountId: detail.accountId }} />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" className="text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setDetail(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 
            TAB 2  GYM PAYOUTS (payout settlement batches)
         */}
        <TabsContent value="payouts" className="mt-0 space-y-4">
          {/* Toolbar  mirrors ManageSettlements batches toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button"
              className={cn(MG_TOOLBAR_BASE, batchFilterDialogOpen ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}
              onClick={() => { syncBatchDraftFromApplied(); setBatchFilterDialogOpen(true); }}>
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button type="button"
              onClick={() => setBatchSortIdx((i) => (i + 1) % BATCH_SORTS.length)}
              className={cn(MG_TOOLBAR_BASE, batchSortIdx !== 0 ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}>
              <BatchSortIcon className="h-4 w-4" />
              {batchSortMode.label}
            </button>

            {/* Filter dialog */}
            <Dialog open={batchFilterDialogOpen} onOpenChange={(open) => { setBatchFilterDialogOpen(open); if (open) syncBatchDraftFromApplied(); }}>
              <DialogContent
                className="max-h-[90vh] overflow-y-auto border table-border table-bg text-white sm:max-w-md"
                onInteractOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}
                onFocusOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}>
                <DialogHeader>
                  <DialogTitle className="text-white">Payout batch filters</DialogTitle>
                  <DialogDescription className="table-text-muted">Apply to update the table below.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pt-2">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Batch status</p>
                    <Select value={draftBatchStatus} onValueChange={(v) => setDraftBatchStatus(v as BatchStatusFilter)}>
                      <SelectTrigger className="h-9 border table-border table-bg text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="border table-border table-bg-alt text-white">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="GYM_REVIEW_PENDING">GYM_REVIEW_PENDING</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button"
                      className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400"
                      onClick={applyBatchFilters}>
                      Apply filters
                    </button>
                    <button type="button" className={MG_DIALOG_OUTLINE}
                      onClick={() => setDraftBatchStatus(DEFAULT_BATCH_FILTERS.status)}>
                      Reset draft
                    </button>
                    <button type="button" className={MG_DIALOG_CLEAR} onClick={clearBatchFilters}>Clear all</button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Active filter pills */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {batchFilterPillItems.length === 0 ? (
                <span className="text-[11px] text-zinc-600">
                  <Filter className="mr-1 inline h-3 w-3" />
                  No active filters
                </span>
              ) : (
                batchFilterPillItems.map((pill) => (
                  <Badge key={`batch-${pill.key}-${pill.label}`} variant="outline"
                    className="gap-1 border-orange-500/30 bg-orange-500/10 pl-2 pr-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-100">
                    {pill.label}
                    <button type="button"
                      className="rounded p-0.5 text-orange-200 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
                      aria-label={`Remove ${pill.label}`}
                      onClick={() => removeAppliedBatchFilter(pill.key)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" className={MG_REFRESH} onClick={() => { setBatchPage(0); batchesQ.refetch(); }}>
                {batchesQ.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-[18px] border table-border table-bg">
            {batchesQ.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-12 text-sm table-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading payout batches...
              </div>
            ) : batchesQ.isError ? (
              <p className="px-4 py-6 text-sm text-red-300">{getApiErrorMessage(batchesQ.error, "Failed to load payout batches")}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1020px] table-fixed border-collapse text-left">
                    <thead>
                      <tr className="table-header-bg border-b table-border">
                        <th scope="col" className="w-[5%] whitespace-nowrap px-3 py-3 pl-4 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Batch</th>
                        <th scope="col" className="w-[14%] px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Gym</th>
                        <th scope="col" className="w-[10%] whitespace-nowrap px-3 py-3 text-right align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Net Amount</th>
                        <th scope="col" className="w-[11%] whitespace-nowrap px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Created</th>
                        <th scope="col" className="w-[11%] whitespace-nowrap px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Paid by</th>
                        <th scope="col" className="w-[11%] whitespace-nowrap px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Paid at</th>
                        <th scope="col" className="w-[7%] whitespace-nowrap px-3 py-3 text-center align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Proof</th>
                        <th scope="col" className="w-[13%] whitespace-nowrap px-3 py-3 text-center align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Status</th>
                        <th scope="col" className="w-[10%] whitespace-nowrap px-3 py-3 pr-4 text-center align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] font-semibold text-zinc-200">
                      {(batchesQ.data?.items ?? []).length === 0 ? (
                        <tr>
                          <td className="py-12 text-center align-middle table-text-muted" colSpan={9}>
                            No payout batches found for current filters.
                          </td>
                        </tr>
                      ) : (
                        (batchesQ.data?.items ?? []).map((batch) => (
                          <tr key={batch.payoutSettlementId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                            <td className="whitespace-nowrap px-3 py-3 pl-4 align-middle font-mono text-[11px] table-text-muted">
                              #{batch.payoutSettlementId}
                            </td>
                            <td className="max-w-0 px-3 py-3 align-middle text-[12px] text-white">
                              <span className="block truncate" title={batch.gymName ?? `Gym #${batch.gymId}`}>
                                {batch.gymName ?? `Gym #${batch.gymId}`}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right align-middle text-[13px] font-bold tabular-nums text-emerald-300">
                              {formatMoney(batch.netAmount, batch.currency)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 align-middle text-[11px] table-text-muted">
                              {formatDateTime(batch.createdAt)}
                            </td>
                            <td className="max-w-0 px-3 py-3 align-middle text-[11px] text-zinc-400">
                              <span className="block truncate">{batch.paidByName || "-"}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 align-middle text-[11px] table-text-muted">
                              {formatDateTime(batch.paidAt)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
                              {batch.proofUrl ? (
                                <a href={batch.proofUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-block text-orange-300 underline decoration-orange-500/40 underline-offset-2 hover:text-orange-200">
                                  View
                                </a>
                              ) : (
                                <span className="text-[10px] font-medium text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center align-middle">
                              <span className={`inline-flex max-w-full whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${batchStatusClassName(batch.status)}`}>
                                {batch.status.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-3 py-3 pr-4 text-center align-middle">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button type="button" className="rounded p-1 transition-colors hover:bg-white/10">
                                    <MoreVertical className="h-4 w-4 text-zinc-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border table-border table-bg-alt text-white">
                                  <DropdownMenuItem onClick={() => setBatchDetail(batch)}>
                                    <Eye className="mr-2 h-3.5 w-3.5" /> View details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  page={batchesQ.data?.page ?? 0}
                  totalPages={batchesQ.data?.totalPages ?? 1}
                  totalItems={batchesQ.data?.totalItems ?? 0}
                  onPageChange={setBatchPage}
                  hasNext={batchesQ.data?.hasNext ?? false}
                  hasPrevious={batchesQ.data?.hasPrevious ?? false}
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/*  Batch Detail Dialog  */}
      <Dialog open={!!batchDetail} onOpenChange={(o) => { if (!o) setBatchDetail(null); }}>
        <DialogContent className="max-w-lg border-zinc-700/50 bg-zinc-900 text-white sm:rounded-2xl"
          onPointerDownOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Payout Batch #{batchDetail?.payoutSettlementId}</DialogTitle>
          </DialogHeader>
          {batchDetail && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow label="Gym" value={batchDetail.gymName ?? `#${batchDetail.gymId}`} />
              <DetailRow label="Status" value={batchDetail.status.replace(/_/g, " ")} />
              <DetailRow label="Net Amount" value={formatMoney(batchDetail.netAmount, batchDetail.currency)} />
              <DetailRow label="Gross Amount" value={formatMoney(batchDetail.grossAmount, batchDetail.currency)} />
              <DetailRow label="Commission" value={formatMoney(batchDetail.commissionAmount, batchDetail.currency)} />
              <DetailRow label="Settlements" value={String(batchDetail.settlementCount)} />
              <DetailRow label="Created" value={formatDateTime(batchDetail.createdAt)} />
              <DetailRow label="Created by" value={batchDetail.createdByName ?? "-"} />
              <DetailRow label="Paid at" value={formatDateTime(batchDetail.paidAt)} />
              <DetailRow label="Paid by" value={batchDetail.paidByName ?? "-"} />
              <DetailRow label="Gym reviewed" value={formatDateTime(batchDetail.gymReviewedAt)} />
              <DetailRow label="Reference" value={batchDetail.transactionReference ?? "-"} />
              <DetailRow label="Wallet" value={batchDetail.walletIdentifierSnapshot || "-"} />
              <DetailRow label="Provider" value={batchDetail.provider || "-"} />
              {batchDetail.note && <div className="col-span-2"><DetailRow label="Note" value={batchDetail.note} /></div>}
              {batchDetail.proofUrl && (
                <div className="col-span-2 pt-1">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Proof</p>
                  <a href={batchDetail.proofUrl} target="_blank" rel="noopener noreferrer">
                    <img src={batchDetail.proofUrl} alt="proof" className="max-h-48 rounded-lg border border-zinc-700/50 object-contain" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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

