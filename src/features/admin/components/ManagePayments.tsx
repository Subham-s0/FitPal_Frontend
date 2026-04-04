import { useEffect, useMemo, useRef, useState } from "react";
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
  Check,
  CreditCard,
  Eye,
  Loader2,
  MoreVertical,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

import {
  getAdminPaymentHistoryApi,
  getAdminPaymentMetricsApi,
  getAdminRevenueTrendApi,
} from "@/features/admin/admin-payment.api";
import type { AdminPaymentHistoryItemResponse } from "@/features/admin/admin-payment.model";
import {
  getPaymentMethodLabel,
  getPaymentStatusBadgeClassName,
  revenueTrendGranularityLabel,
  type RevenueTrendGranularity,
  REVENUE_TREND_GRANULARITIES,
} from "@/features/payment/payment.constants";
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
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const PAGE_SIZES = ["10", "15", "20"] as const;

/** Recharts tooltips: dark bg + light text (default was unreadable on hover). */
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

const formatMoney = (amount: number, currency: string) => {
  const c = currency?.trim() || "NPR";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${c} ${amount.toFixed(2)}`;
  }
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const formatTrendAxis = (iso: string, g: RevenueTrendGranularity) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (g === "YEARLY") return String(d.getFullYear());
  if (g === "MONTHLY") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

type StatusFilter = "ALL" | PaymentStatus;
type MethodFilter = "ALL" | PaymentMethod;

export default function ManagePayments() {
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("ALL");
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [trendGranularity, setTrendGranularity] = useState<RevenueTrendGranularity>("MONTHLY");
  const [detail, setDetail] = useState<AdminPaymentHistoryItemResponse | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [debounced, pageSize, statusFilter, methodFilter, sortDirection]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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
    queryKey: [
      "admin-payments",
      "history",
      debounced,
      page,
      pageSize,
      statusFilter,
      methodFilter,
      sortDirection,
    ],
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

  const metrics = metricsQ.data;
  const currency = metrics?.currency ?? "NPR";

  const gatewayPieData = useMemo(() => {
    if (!metrics) return [];
    const k = metrics.khaltiRevenueCompleted ?? 0;
    const e = metrics.esewaRevenueCompleted ?? 0;
    return [
      { name: "Khalti", value: k, fill: "#ea580c" },
      { name: "eSewa", value: e, fill: "#14b8a6" },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const trendChartData = useMemo(() => {
    const pts = trendQ.data?.points ?? [];
    return pts.map((p) => ({
      label: formatTrendAxis(p.periodStart, trendGranularity),
      totalAmount: p.totalAmount,
      raw: p.periodStart,
    }));
  }, [trendQ.data?.points, trendGranularity]);

  /** Flat line at 0 when API returns no buckets so the chart still renders readably. */
  const trendChartDisplay = useMemo(() => {
    if (trendQ.isLoading) return [];
    if (trendChartData.length > 0) return trendChartData;
    return [{ label: "—", totalAmount: 0, isPlaceholder: true as const }];
  }, [trendChartData, trendQ.isLoading]);

  const items = historyQ.data?.items ?? [];
  const total = historyQ.data?.totalItems ?? 0;
  const totalPages = Math.max(historyQ.data?.totalPages ?? 1, 1);

  const refresh = async () => {
    await Promise.all([metricsQ.refetch(), trendQ.refetch(), historyQ.refetch()]);
  };

  const hasActiveFilters =
    searchInput.length > 0 || statusFilter !== "ALL" || methodFilter !== "ALL" || sortDirection !== "DESC" || filterOpen;

  const clearFilters = () => {
    setSearchInput("");
    setDebounced("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setSortDirection("DESC");
    setFilterOpen(false);
    setPage(0);
  };

  const COL_W = ["22%", "14%", "14%", "12%", "10%", "10%", "14%", "4%"];
  const colStyle = (i: number) => ({ width: COL_W[i] });

  return (
    <div className="space-y-5 font-['Outfit',system-ui,sans-serif]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Manage <span style={fireStyle}>Payments</span>
          </h1>
          <p className="mt-1 text-[13px] table-text-muted">
            Filters and search query the backend; the table is server-paged and server-filtered.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={metricsQ.isFetching || trendQ.isFetching || historyQ.isFetching}
          className="flex flex-shrink-0 items-center gap-1.5 self-start rounded-full border table-border table-bg table-text px-3.5 py-[7px] text-[12px] font-bold transition-all hover:border-white/20 hover:text-white disabled:opacity-50 sm:self-auto"
        >
          {metricsQ.isFetching || trendQ.isFetching || historyQ.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* One horizontal strip: revenue + compact charts (counts for Pending/Failed/etc. live in Filters) */}
      <div className="flex min-w-0 flex-nowrap items-stretch gap-2 overflow-x-auto pb-1">
        <div className="flex w-[132px] shrink-0 flex-col justify-center rounded-xl border border-orange-500/25 bg-orange-500/[0.06] px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 shrink-0 text-orange-400" />
            <span className="text-[8px] font-black uppercase tracking-wider text-orange-400/90">Revenue</span>
          </div>
          <p className="mt-1 truncate text-[15px] font-black leading-tight text-white">
            {metricsQ.isLoading ? "—" : formatMoney(metrics?.totalRevenueCompleted ?? 0, currency)}
          </p>
          <p className="text-[8px] text-slate-500">Completed only</p>
        </div>

        <div className="flex w-[150px] shrink-0 flex-col rounded-xl border table-border table-bg px-1.5 py-1">
          <div className="flex items-center justify-between gap-1 px-0.5">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Gateways</span>
            <CreditCard className="h-3 w-3 text-orange-400/70" />
          </div>
          <div className="relative h-[104px] w-full">
            {gatewayPieData.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-0.5 text-center">
                <span className="text-[10px] font-bold text-slate-500">{formatMoney(0, currency)}</span>
                <span className="text-[8px] text-slate-600">No completed revenue</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gatewayPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={42}
                    paddingAngle={2}
                  >
                    {gatewayPieData.map((_, i) => (
                      <Cell key={i} fill={gatewayPieData[i].fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, currency)}
                    {...CHART_TOOLTIP}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-[200px] flex-1 rounded-xl border table-border table-bg px-1.5 py-1">
          <div className="mb-0.5 flex flex-wrap items-center justify-between gap-1 px-0.5">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Trend</span>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400/80" />
              <Select value={trendGranularity} onValueChange={(v) => setTrendGranularity(v as RevenueTrendGranularity)}>
                <SelectTrigger className="h-6 w-[108px] rounded-full border table-border table-bg px-2 text-[9px] font-bold table-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="table-border table-bg-alt text-white">
                  {REVENUE_TREND_GRANULARITIES.map((g) => (
                    <SelectItem key={g} value={g} className="text-[11px]">
                      {revenueTrendGranularityLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="h-[104px] w-full">
            {trendQ.isLoading ? (
              <div className="flex h-full items-center justify-center gap-1.5 text-[10px] table-text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendChartDisplay}
                  margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="adminPayRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ea580c" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#ea580c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" />
                  <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 8 }} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fill: "#737373", fontSize: 8 }}
                    width={32}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    formatter={(v: number) => formatMoney(v, currency)}
                    labelFormatter={(label) => (String(label) === "—" ? "No data in range" : label)}
                    {...CHART_TOOLTIP}
                  />
                  <Area type="monotone" dataKey="totalAmount" stroke="#ea580c" strokeWidth={1.5} fill="url(#adminPayRevenueFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {(metricsQ.isError || trendQ.isError || historyQ.isError) && (
        <div className="space-y-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
          {metricsQ.isError ? <p>{getApiErrorMessage(metricsQ.error, "Could not load metrics")}</p> : null}
          {trendQ.isError ? <p>{getApiErrorMessage(trendQ.error, "Could not load revenue trend")}</p> : null}
          {historyQ.isError ? <p>{getApiErrorMessage(historyQ.error, "Could not load payment history")}</p> : null}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-[320px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 table-text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search email, invoice, gateway id…"
            className="w-full rounded-full border table-border table-bg py-2 pl-9 pr-4 text-[13px] font-medium text-white placeholder:table-text-muted outline-none transition-all focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)]"
          />
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSortDirection((d) => (d === "DESC" ? "ASC" : "DESC"))}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
              sortDirection === "ASC" ? "border-orange-500/30 bg-orange-500/10 text-orange-400" : "table-border table-bg table-text hover:border-orange-500/30 hover:text-orange-400"
            }`}
          >
            {sortDirection === "DESC" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
            {sortDirection === "DESC" ? "Newest first" : "Oldest first"}
          </button>

          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
                filterOpen ? "border-orange-500/30 bg-orange-500/10 text-orange-400" : "table-border table-bg table-text hover:border-orange-500/30 hover:text-orange-400"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[240px] rounded-2xl border table-border table-bg p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                <div className="px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">Status</div>
                {(
                  [
                    ["ALL", "All statuses", (m: typeof metrics) => m?.totalPaymentCount],
                    ["COMPLETED", "Completed", (m: typeof metrics) => m?.completedPaymentCount],
                    ["PENDING", "Pending", (m: typeof metrics) => m?.pendingPaymentCount],
                    ["FAILED", "Failed", (m: typeof metrics) => m?.failedPaymentCount],
                    ["CANCELLED", "Cancelled", (m: typeof metrics) => m?.cancelledPaymentCount],
                  ] as const
                ).map(([key, label, countFn]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors ${
                      statusFilter === key ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="min-w-0 truncate text-left text-[12px] font-semibold table-text">{label}</span>
                    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-black text-slate-400">
                        {metricsQ.isLoading ? "…" : (countFn(metrics) ?? "—")}
                      </span>
                      {statusFilter === key ? <Check className="h-3.5 w-3.5 text-orange-400" /> : null}
                    </span>
                  </button>
                ))}
                <div className="mt-1 border-t border-[hsl(0,0%,13%)] px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">
                  Payment method
                </div>
                {(
                  [
                    ["ALL", "All methods", (m: typeof metrics) => m?.totalPaymentCount],
                    ["ESEWA", "eSewa", (m: typeof metrics) => m?.esewaPaymentCount],
                    ["KHALTI", "Khalti", (m: typeof metrics) => m?.khaltiPaymentCount],
                  ] as const
                ).map(([key, label, countFn]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMethodFilter(key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors ${
                      methodFilter === key ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-[12px] font-semibold table-text">{label}</span>
                    <span className="flex shrink-0 items-center gap-1.5 tabular-nums">
                      <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-black text-slate-400">
                        {metricsQ.isLoading ? "…" : (countFn(metrics) ?? "—")}
                      </span>
                      {methodFilter === key ? <Check className="h-3.5 w-3.5 text-orange-400" /> : null}
                    </span>
                  </button>
                ))}
                <div className="mt-1 border-t border-[hsl(0,0%,13%)] px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">
                  Page size
                </div>
                <div className="px-2 pb-2">
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                    <SelectTrigger className="h-9 w-full rounded-xl border table-border table-bg text-[12px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="table-border table-bg-alt text-white">
                      {PAGE_SIZES.map((v) => (
                        <SelectItem key={v} value={v} className="text-[12px]">
                          {v} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all hover:border-orange-500/30 hover:text-orange-400 ${
              hasActiveFilters ? "border-orange-500/30 text-orange-400" : "table-border table-bg table-text opacity-50"
            }`}
          >
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
              {["User", "Invoice", "Plan", "Amount", "Method", "Status", "Paid at", ""].map((h, i) => (
                <th
                  key={h}
                  style={colStyle(i)}
                  className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted first:pl-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historyQ.isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-orange-500" />
                  <div className="text-[13px] table-text-muted">Loading payments…</div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 table-text-muted" strokeWidth={1.5} />
                  <div className="text-[16px] font-bold table-text">{debounced ? "No results" : "No payments yet"}</div>
                  <div className="mt-1 text-[13px] table-text-muted">
                    {debounced ? `Nothing matches “${debounced}”` : "Completed and other attempts will show here."}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.paymentAttemptId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                  <td className="px-3.5 py-3.5 pl-5" style={colStyle(0)}>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-bold text-blue-400/95">{row.accountEmail}</div>
                      <div className="truncate font-mono text-[10px] table-text-muted">#{row.accountId}</div>
                    </div>
                  </td>
                  <td className="table-text-muted truncate px-3.5 py-3.5 font-mono text-[11px]" style={colStyle(1)}>
                    {row.invoiceNumber ?? `—`}
                  </td>
                  <td className="truncate px-3.5 py-3.5 text-[12px] table-text" style={colStyle(2)}>
                    {row.planName ?? "—"}
                  </td>
                  <td className="px-3.5 py-3.5 text-[13px] font-bold text-white" style={colStyle(3)}>
                    {formatMoney(row.totalAmount, row.currency)}
                  </td>
                  <td className="px-3.5 py-3.5 text-[11px] font-semibold" style={colStyle(4)}>
                    {getPaymentMethodLabel(row.paymentMethod)}
                  </td>
                  <td className="px-3.5 py-3.5" style={colStyle(5)}>
                    <Badge className={cn("text-[10px] font-black uppercase", getPaymentStatusBadgeClassName(row.paymentStatus))}>
                      {row.paymentStatus}
                    </Badge>
                  </td>
                  <td className="table-text truncate px-3.5 py-3.5 text-[12px]" style={colStyle(6)}>
                    {formatDateTime(row.paymentTime)}
                  </td>
                  <td className="px-2 py-3.5 text-right" style={colStyle(7)}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
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
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border table-border table-bg px-4 py-10 text-center text-[13px] table-text-muted">No payments</div>
        ) : (
          items.map((row) => (
            <button
              key={row.paymentAttemptId}
              type="button"
              onClick={() => setDetail(row)}
              className="w-full rounded-2xl border table-border table-bg p-4 text-left transition-colors hover:table-bg-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-blue-400/95">{row.accountEmail}</p>
                  <p className="mt-1 font-mono text-[11px] table-text-muted">{row.invoiceNumber ?? `#${row.paymentAttemptId}`}</p>
                  <p className="mt-2 text-[15px] font-black text-white">{formatMoney(row.totalAmount, row.currency)}</p>
                </div>
                <Badge className={cn("shrink-0", getPaymentStatusBadgeClassName(row.paymentStatus))}>{row.paymentStatus}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>{getPaymentMethodLabel(row.paymentMethod)}</span>
                <span>·</span>
                <span>{formatDateTime(row.paymentTime)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t table-border-cell pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] table-text-muted">Filters apply to the payment history table below.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0 || historyQ.isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="rounded-full border table-border table-bg-alt px-4 py-1.5 text-[11px] font-semibold text-white">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!historyQ.data?.hasNext || historyQ.isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white sm:max-w-[480px]">
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
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Account</Label>
                  <p className="font-semibold text-blue-400/95">{detail.accountEmail}</p>
                  <p className="font-mono text-[11px] table-text-muted">#{detail.accountId}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Paid at</Label>
                  <p className="font-semibold">{formatDateTime(detail.paymentTime)}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Method</Label>
                  <p>{getPaymentMethodLabel(detail.paymentMethod)}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Plan</Label>
                  <p>{detail.planName ?? "—"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Gateway</Label>
                  <p className="break-all font-mono text-[11px] table-text-muted">
                    {detail.gatewayTransactionId ?? detail.gatewayReference ?? "—"}
                  </p>
                </div>
                {detail.gatewayResponseMessage ? (
                  <div className="col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Gateway message</Label>
                    <p className="text-[12px] text-slate-300">{detail.gatewayResponseMessage}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" className="text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => setDetail(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
