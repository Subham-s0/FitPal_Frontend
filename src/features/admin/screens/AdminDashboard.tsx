import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bell,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Dumbbell,
  DollarSign,
  UserPlus,
  BarChart3,
  Zap,
  Clock,
  ShieldAlert,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DefaultLayout } from "@/shared/layout/dashboard-shell";
import ManageGyms from "@/features/admin/components/ManageGyms";
import ManagePayments from "@/features/admin/components/ManagePayments";
import ManagePlans from "@/features/admin/components/ManagePlans";
import ManageSettlements from "@/features/admin/components/ManageSettlements";
import ManageUsers from "@/features/admin/components/ManageUsers";
import AdminSettings from "@/features/admin/components/AdminSettings";
import AdminAnnouncementsPage from "@/features/announcements/components/AdminAnnouncementsPage";
import {
  getDashboardSnapshotApi,
  getDashboardRevenueApi,
  getDashboardRevenueTrendApi,
  getDashboardPeakActivityApi,
  getDashboardMembersApi,
  getDashboardRecentSignupsApi,
  getDashboardMemberActivityApi,
  getDashboardTopGymsApi,
  getDashboardRecentPayoutsApi,
  getDashboardApiHealthApi,
} from "@/features/admin/admin-dashboard.api";
import type {
  RevenueTrendRange,
  PeakActivityRange,
  TopGymsRange,
  ApiHealthRange,
} from "@/features/admin/admin-dashboard.model";
import { cn } from "@/shared/lib/utils";
import { useLocation } from "react-router-dom";

type AdminSection =
  | "home"
  | "users"
  | "gyms"
  | "plans"
  | "payments"
  | "settlements"
  | "announcements"
  | "settings";

type RevenueWindow = "THIS_MONTH" | "ALL_TIME";

/* ─── Shared styling ─────────────────────────────────────────────────── */

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

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

const formatMoney = (amount: number, currency = "NPR") => {
  const c = currency?.trim() || "NPR";
  if (amount >= 100000) return `${c} ${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${c} ${(amount / 1000).toFixed(1)}K`;
  return `${c} ${amount.toLocaleString()}`;
};

const formatMoneyFull = (amount: number, currency = "NPR") => {
  const c = currency?.trim() || "NPR";
  return `${c} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const formatRatePercent = (rate: number | null | undefined) => {
  const numeric = Number(rate ?? 0);
  return `${(numeric * 100).toFixed(2).replace(/\.?0+$/, "")}%`;
};

const formatEnumLabel = (value: string | null | undefined) => {
  if (!value) return "-";
  const normalized = value.replace(/_/g, " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? "+100" : "0";
  return ((current - previous) / previous * 100).toFixed(0);
};

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
            : "table-text hover:text-white hover:bg-white/[0.03] hover:border-white/10 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
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

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

/* ─── Dashboard Home ─────────────────────────────────────────────────── */

function DashboardHome() {
  const [revTrendRange, setRevTrendRange] = useState<RevenueTrendRange>("WEEKLY");
  const [peakRange, setPeakRange] = useState<PeakActivityRange>("ALL_TIME");
  const [topGymsRange, setTopGymsRange] = useState<TopGymsRange>("LAST_WEEK");
  const [apiRange, setApiRange] = useState<ApiHealthRange>("TODAY");
  const [revenueWindow, setRevenueWindow] = useState<RevenueWindow>("ALL_TIME");

  const snapshotQ = useQuery({ queryKey: ["dash", "snapshot"], queryFn: getDashboardSnapshotApi, staleTime: 30_000 });
  const revenueQ = useQuery({ queryKey: ["dash", "revenue"], queryFn: getDashboardRevenueApi, staleTime: 60_000 });
  const revTrendQ = useQuery({ queryKey: ["dash", "rev-trend", revTrendRange], queryFn: () => getDashboardRevenueTrendApi(revTrendRange), staleTime: 60_000 });
  const peakQ = useQuery({ queryKey: ["dash", "peak", peakRange], queryFn: () => getDashboardPeakActivityApi(peakRange), staleTime: 60_000 });
  const membersQ = useQuery({ queryKey: ["dash", "members"], queryFn: getDashboardMembersApi, staleTime: 60_000 });
  const signupsQ = useQuery({ queryKey: ["dash", "signups"], queryFn: getDashboardRecentSignupsApi, staleTime: 60_000 });
  const activityQ = useQuery({ queryKey: ["dash", "member-activity"], queryFn: getDashboardMemberActivityApi, staleTime: 60_000 });
  const topGymsQ = useQuery({ queryKey: ["dash", "top-gyms", topGymsRange], queryFn: () => getDashboardTopGymsApi(topGymsRange), staleTime: 60_000 });
  const payoutsQ = useQuery({ queryKey: ["dash", "payouts"], queryFn: getDashboardRecentPayoutsApi, staleTime: 60_000 });
  const apiHealthQ = useQuery({ queryKey: ["dash", "api-health", apiRange], queryFn: () => getDashboardApiHealthApi(apiRange), staleTime: 30_000 });

  const snap = snapshotQ.data;
  const rev = revenueQ.data;
  const members = membersQ.data;
  const act = activityQ.data;
  const api = apiHealthQ.data;
  const currency = rev?.currency ?? "NPR";

  const trendChartData = useMemo(() => {
    if (!revTrendQ.data?.points) return [];
    return revTrendQ.data.points.map((p) => {
      const d = new Date(p.timestamp);
      let label: string;
      if (revTrendRange === "YEARLY") label = d.toLocaleDateString(undefined, { month: "short" });
      else label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return { label, amount: p.amount };
    });
  }, [revTrendQ.data, revTrendRange]);

  const peakChartData = useMemo(() => {
    const points = peakQ.data?.points ?? [];
    return points.map((p) => {
      const raw = Number(p?.count ?? 0);
      return {
        label: p?.label ?? "",
        count: Number.isFinite(raw) ? Math.max(raw, 0) : 0,
      };
    });
  }, [peakQ.data]);

  const peakMax = useMemo(() => Math.max(...peakChartData.map((p) => p.count), 0), [peakChartData]);
  const trendMax = useMemo(() => Math.max(...(trendChartData.map((d) => Number(d.amount))), 0), [trendChartData]);

  const apiReqChange = api ? pctChange(api.totalRequests, api.totalRequestsPrev) : "0";
  const apiVolMax = useMemo(() => Math.max(...(api?.volumePoints?.map((p) => p.count) ?? [0])), [api]);

  const planTypes = ["BASIC", "PRO", "ELITE"] as const;
  const planColors: Record<string, string> = { BASIC: "#f59e0b", PRO: "#ea580c", ELITE: "#e11d48" };

  return (
    <div className="mx-auto max-w-[1600px] space-y-7">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-black tracking-tight text-white">
          Dashboard <span style={fireStyle}>Overview</span>
        </h1>
      </div>

      {/* ── PLATFORM SNAPSHOT ─────────────────────────────────── */}
      <div>
        <SectionLabel>Platform snapshot</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshotQ.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : snap ? (
            <>
              <KPICard
                label="Connected gyms"
                value={snap.totalGyms.toLocaleString()}
                theme="blue"
                icon={Dumbbell}
                meta={<><Badge c="green">{snap.onlineGyms} online</Badge> · {snap.offlineGyms} offline</>}
              />
              <KPICard
                label="Active check-ins"
                value={snap.activeCheckIns.toLocaleString()}
                theme="green"
                icon={Activity}
                meta={
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[9px] font-black uppercase tracking-wider text-emerald-400">Live</span>
                  </div>
                }
              />
              <KPICard
                label="Total check-ins today"
                value={snap.checkInsToday.toLocaleString()}
                theme="orange"
                icon={Clock}
                meta={
                  <Badge c={snap.checkInsToday >= snap.checkInsYesterday ? "green" : "red"}>
                    {snap.checkInsToday >= snap.checkInsYesterday ? "↑" : "↓"}{" "}
                    {Math.abs(snap.checkInsToday - snap.checkInsYesterday)}
                  </Badge>
                }
              />
              <KPICard
                label="Total members"
                value={snap.totalMembers.toLocaleString()}
                theme="purple"
                icon={Users}
                meta={<Badge c="amber">+{snap.newMembersThisMonth}</Badge>}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* ── REVENUE & PAYOUTS ─────────────────────────────────── */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>Revenue &amp; payouts</SectionLabel>
          <FilterTabs
            options={[
              { label: "This month", value: "THIS_MONTH" },
              { label: "All time", value: "ALL_TIME" },
            ]}
            value={revenueWindow}
            onChange={(v) => setRevenueWindow(v as RevenueWindow)}
          />
        </div>
        {revenueQ.isLoading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : rev ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Total collected */}
            <CardShell>
              {(() => {
                const selectedCollected = revenueWindow === "THIS_MONTH"
                  ? rev.totalCollected
                  : (rev.allTimeTotalCollected ?? rev.totalCollected ?? 0);
                const selectedCount = revenueWindow === "THIS_MONTH"
                  ? rev.subscriptionCount
                  : (rev.allTimeCompletedCount ?? rev.subscriptionCount ?? 0);
                const selectedBase = revenueWindow === "THIS_MONTH"
                  ? rev.baseAmount
                  : (rev.allTimeBaseAmount ?? rev.baseAmount ?? 0);
                const selectedServiceCharge = revenueWindow === "THIS_MONTH"
                  ? rev.serviceChargeAmount
                  : (rev.allTimeServiceChargeAmount ?? rev.serviceChargeAmount ?? 0);
                const selectedTaxAmount = revenueWindow === "THIS_MONTH"
                  ? (rev.taxAmount ?? 0) + (rev.vatAmount ?? 0)
                  : (rev.allTimeTaxAmount ?? rev.taxAmount ?? 0) + (rev.allTimeVatAmount ?? rev.vatAmount ?? 0);
                const selectedTaxRate = selectedBase > 0 ? selectedTaxAmount / selectedBase : 0;
                const selectedServiceRate = selectedBase > 0 ? selectedServiceCharge / selectedBase : 0;

                return (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Total collected</p>
                      </div>
                      <Badge c="zinc">{revenueWindow === "THIS_MONTH" ? "Month to date" : "All time"}</Badge>
                    </div>

                    <p className="mt-2 font-mono text-2xl font-bold text-white">
                      {selectedCollected == null ? "—" : formatMoneyFull(selectedCollected, currency)}
                    </p>

                    <div className="mt-3 flex h-[5px] gap-[1px] overflow-hidden rounded-full">
                      {selectedCollected > 0 && (
                        <>
                          <div className="rounded-l-full bg-orange-500" style={{ width: `${(selectedBase / selectedCollected * 100).toFixed(1)}%` }} />
                          <div className="bg-amber-500" style={{ width: `${(selectedServiceCharge / selectedCollected * 100).toFixed(1)}%` }} />
                          <div className="flex-1 rounded-r-full bg-red-500" />
                        </>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] table-text-muted">
                      <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-orange-500" />Base {formatMoneyFull(selectedBase, currency)}</span>
                      <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-500" />Svc {formatRatePercent(selectedServiceRate)} {formatMoneyFull(selectedServiceCharge, currency)}</span>
                      <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red-500" />Tax {formatRatePercent(selectedTaxRate)} {formatMoneyFull(selectedTaxAmount, currency)}</span>
                    </div>
                    <div className="mt-1 text-[10px] table-text-muted">
                      Average effective rates: Tax {formatRatePercent(selectedTaxRate)} | Svc {formatRatePercent(selectedServiceRate)}
                    </div>
                    <div className="mt-2 text-[11px] table-text-muted">
                      {revenueWindow === "THIS_MONTH" ? (
                        <>
                          MoM{" "}
                          <Badge c={rev.totalCollected >= rev.totalCollectedPrevPeriod ? "green" : "red"}>
                            {rev.totalCollected >= rev.totalCollectedPrevPeriod ? "↑" : "↓"}{" "}
                            {Math.abs(Number(pctChange(rev.totalCollected, rev.totalCollectedPrevPeriod)))}%
                          </Badge>
                          {" · "}<span className="font-mono">{selectedCount} subscriptions</span>
                        </>
                      ) : (
                        <>
                          Completed payment attempts · <span className="font-mono text-white">{selectedCount}</span>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </CardShell>

            {/* Due to gyms */}
            <CardShell>
              <div className="mb-4 flex items-center gap-2 shrink-0">
                <Wallet className="h-4 w-4 text-amber-400" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Due to gyms</p>
              </div>
              <p className="mt-2 font-mono text-[28px] font-bold text-orange-500">{formatMoneyFull(rev.dueToGyms, currency)}</p>
              <div className="mt-3 space-y-1.5 text-[10px] table-text-muted">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                  <span>Paid to gyms</span>
                  <span className="ml-auto font-mono text-white">{formatMoneyFull(rev.paidToGyms, currency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-sm bg-orange-500" />
                  <span>Pending / In-payout</span>
                  <span className="ml-auto font-mono text-white">{formatMoneyFull(rev.dueToGyms, currency)}</span>
                </div>
              </div>
            </CardShell>

            {/* Platform net */}
            <CardShell>
              <div className="mb-4 flex items-center gap-2 shrink-0">
                <Zap className="h-4 w-4 text-emerald-500" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Platform net revenue</p>
              </div>
              {(() => {
                const selectedCollected = revenueWindow === "THIS_MONTH"
                  ? rev.totalCollected
                  : (rev.allTimeTotalCollected ?? rev.totalCollected ?? 0);
                const net = selectedCollected == null
                  ? null
                  : selectedCollected - rev.paidToGyms - rev.dueToGyms;

                return (
                  <>
                    <p className="mt-2 font-mono text-[28px] font-bold text-emerald-400">
                      {net == null ? "—" : formatMoneyFull(net, currency)}
                    </p>
                    <div className="mt-3 space-y-1.5 text-[10px] table-text-muted">
                      <div className="flex items-center justify-between">
                        <span>Total collected ({revenueWindow === "THIS_MONTH" ? "month" : "all-time"})</span>
                        <span className="font-mono text-white">
                          {selectedCollected == null ? "—" : formatMoneyFull(selectedCollected, currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>− Paid to gyms</span>
                        <span className="font-mono table-text">{formatMoneyFull(rev.paidToGyms, currency)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>− Due to gyms</span>
                        <span className="font-mono table-text">{formatMoneyFull(rev.dueToGyms, currency)}</span>
                      </div>
                      <div className="mt-1 border-t border-white/[0.06] pt-1 flex items-center justify-between font-medium">
                        <span className="text-white">Net</span>
                        <span className="font-mono text-emerald-400">
                          {net == null ? "—" : formatMoneyFull(net, currency)}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardShell>
          </div>
        ) : null}
      </div>

      {/* ── REVENUE TREND + PEAK ACTIVITY ─────────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <CardShell>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 shrink-0">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Revenue trend</p>
              </div>
              <p className="text-[11px] table-text-muted">{revTrendQ.data?.subtitle ?? "Loading..."}</p>
            </div>
            <FilterTabs
              options={[
                { label: "Week", value: "WEEKLY" },
                { label: "Month", value: "MONTHLY" },
                { label: "Year", value: "YEARLY" },
              ]}
              value={revTrendRange}
              onChange={(v) => setRevTrendRange(v as RevenueTrendRange)}
            />
          </div>
          <div className="h-[180px] w-full">
            {revTrendQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="40%" stopColor="#ea580c" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#52525b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatMoney(v, currency)}
                    domain={[0, trendMax > 0 ? (dm: number) => Math.ceil(dm * 1.15) : 100]}
                  />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => formatMoneyFull(v, currency)} />
                  <Area type="monotone" dataKey="amount" stroke="url(#revenueStroke)" strokeWidth={2} fill="url(#revenueGrad)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardShell>

        <CardShell>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 shrink-0">
                <Activity className="h-4 w-4 text-blue-500" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Peak activity</p>
              </div>
              <p className="text-[11px] table-text-muted">{peakQ.data?.subtitle ?? "Loading..."}</p>
            </div>
            <FilterTabs
              options={[
                { label: "Week", value: "THIS_WEEK" },
                { label: "Month", value: "THIS_MONTH" },
                { label: "All", value: "ALL_TIME" },
              ]}
              value={peakRange}
              onChange={(v) => setPeakRange(v as PeakActivityRange)}
            />
          </div>
          <div className="h-[180px] w-full">
            {peakQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakChartData} margin={{ top: 4, right: 2, left: -20, bottom: 0 }}>
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
                    formatter={(v: number) => [`${v} check-ins`, "Check-ins"]}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Bar dataKey="count" name="Check-ins" radius={[3, 3, 0, 0]} fill="#ea580c" minPointSize={3} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardShell>
      </div>

      {/* ── SIGNUPS + PLAN DISTRIBUTION + PLATFORM USERS ───────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-stretch">
        {/* Recent sign-ups */}
        <CardShell className="flex h-full min-h-0 flex-col">
          <div className="mb-3 flex items-center gap-2 shrink-0">
            <UserPlus className="h-4 w-4 text-green-400" />
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Recent sign-ups <span className="font-medium text-[11px] table-text-muted">(latest 6)</span></p>
          </div>
          {signupsQ.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-0 divide-y divide-white/[0.06]">
              {signupsQ.data?.slice(0, 6).map((s) => {
                const initials = s.name
                  ? s.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                  : s.email.slice(0, 2).toUpperCase();
                const isGym = s.role === "GYM";
                const gymStatusColor = s.gymApprovalStatus === "APPROVED"
                  ? "green"
                  : s.gymApprovalStatus === "PENDING_REVIEW"
                  ? "yellow"
                  : s.gymApprovalStatus === "REJECTED"
                  ? "red"
                  : "zinc";
                return (
                  <div key={s.accountId} className="flex items-center gap-2.5 py-2">
                    {s.profileImageUrl ? (
                      <img
                        src={s.profileImageUrl}
                        alt=""
                        className="h-[30px] w-[30px] flex-shrink-0 rounded-full object-cover bg-white/[0.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-mono text-[10px] font-bold text-orange-400">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-white">{s.name ?? s.email}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <Badge c={isGym ? "orange" : "green"}>{formatEnumLabel(s.role)}</Badge>
                        {isGym ? (
                          <Badge c={gymStatusColor}>{formatEnumLabel(s.gymApprovalStatus)}</Badge>
                        ) : s.planName ? (
                          <Badge c="orange">{s.planName} {s.billingCycle}</Badge>
                        ) : (
                          <span className="text-[10px] table-text-muted">No subscription yet</span>
                        )}
                      </div>
                    </div>
                    <span className="whitespace-nowrap font-mono text-[10px] table-text-muted">{timeAgo(s.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardShell>

        {/* Plan distribution + compact activity */}
        <CardShell className="flex h-full min-h-0 flex-col">
          <div className="mb-3 flex items-center gap-2 shrink-0">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Plan distribution</p>
          </div>
          {membersQ.isLoading ? (
            <Skeleton className="h-36 flex-1" />
          ) : members ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-px overflow-hidden rounded-lg bg-white/[0.06]">
                <div className="bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] table-text-muted" />
                <div className="bg-white/[0.04] px-2 py-1 text-center text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Monthly</div>
                <div className="bg-white/[0.04] px-2 py-1 text-center text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Yearly</div>
                {planTypes.map((pt) => {
                  const monthly = members.planDistribution.find((d) => d.planType === pt && d.billingCycle === "MONTHLY");
                  const yearly = members.planDistribution.find((d) => d.planType === pt && d.billingCycle === "YEARLY");
                  return [
                    <div key={`${pt}-name`} className="flex items-center gap-1.5 bg-white/[0.02] px-2 py-1.5 text-[11px] font-semibold text-white">
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: planColors[pt] }} />
                      {pt.charAt(0) + pt.slice(1).toLowerCase()}
                    </div>,
                    <div key={`${pt}-m`} className="bg-white/[0.02] px-2 py-1.5 text-center">
                      <p className="font-mono text-[12px] font-bold text-white">{monthly?.count ?? 0}</p>
                      <p className="text-[9px] table-text-muted">{monthly?.percent ?? 0}%</p>
                    </div>,
                    <div key={`${pt}-y`} className="bg-white/[0.02] px-2 py-1.5 text-center">
                      <p className="font-mono text-[12px] font-bold text-white">{yearly?.count ?? 0}</p>
                      <p className="text-[9px] table-text-muted">{yearly?.percent ?? 0}%</p>
                    </div>,
                  ];
                })}
              </div>
              {members.mostPopularPlan && (
                <div className="relative overflow-hidden flex shrink-0 items-center justify-between rounded-lg border border-orange-500/50 bg-[linear-gradient(160deg,rgba(249,115,22,0.14),rgba(17,17,17,0.98))] px-3 py-2.5 shadow-[inset_0_0_20px_rgba(249,115,22,0.15)]">
                  {/* Grid-line overlay */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.07]"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
                      backgroundSize: '18px 18px',
                    }}
                  />
                  <span className="text-[12px] font-black uppercase tracking-[0.1em] text-orange-400">Most popular</span>
                  <span className="flex items-center gap-2.5">
                    <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-300">{members.mostPopularPlan}</span>
                    <span className="font-mono text-[14px] font-bold text-white">{members.mostPopularCount}</span>
                  </span>
                </div>
              )}

              {activityQ.isLoading || snapshotQ.isLoading ? (
                <Skeleton className="h-24 shrink-0" />
              ) : act ? (
                (() => {
                  const totalMembers = Math.max(snap?.totalMembers ?? 0, 0);
                  const checkedInToday = Math.max(act.checkedInToday ?? 0, 0);
                  const participationRate = totalMembers > 0
                    ? Math.min(100, (checkedInToday / totalMembers) * 100)
                    : 0;
                  const participationLabel = participationRate >= 35
                    ? "Strong"
                    : participationRate >= 18
                    ? "Moderate"
                    : "Low";
                  const participationTone = participationRate >= 35
                    ? "green"
                    : participationRate >= 18
                    ? "amber"
                    : "red";
                  return (
                    <div className="mt-auto shrink-0 space-y-2 border-t border-white/[0.06] pt-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-500">Member pulse</p>
                      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-[0.12em] table-text-muted">Today participation</span>
                          <Badge c={participationTone as "green" | "amber" | "red"}>{participationLabel}</Badge>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                          <span className="font-mono text-lg font-bold text-white">{participationRate.toFixed(1)}%</span>
                          <span className="text-[9px] table-text-muted">
                            {checkedInToday.toLocaleString()} / {totalMembers.toLocaleString()} checked in
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              participationRate >= 35
                                ? "bg-emerald-500"
                                : participationRate >= 18
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${participationRate.toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          ) : null}
        </CardShell>

        {/* Platform users — churn & cohort stats (no duplicate pulse) */}
        <CardShell className="flex h-full min-h-0 flex-col">
          <div className="mb-3 flex items-center gap-2 shrink-0">
            <Users className="h-4 w-4 text-blue-400" />
            <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Platform users</p>
          </div>
          {membersQ.isLoading ? (
            <Skeleton className="h-60 flex-1" />
          ) : members ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Total users" value={members.totalPlatformUsers.toLocaleString()} />
                <MiniStat label="New this month" value={members.newThisMonth.toLocaleString()} />
                <MiniStat label="Churned users" value={members.churned.toLocaleString()} />
                <MiniStat label="Verified" value={`${members.verifiedPercent}%`} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <span className="text-[11px] table-text-muted">Churned gyms (last 30d)</span>
                <Badge c={members.churnedGyms > 0 ? "amber" : "blue"}>{members.churnedGyms}</Badge>
              </div>

              {activityQ.isLoading ? (
                <Skeleton className="h-24" />
              ) : act ? (
                (() => {
                  const suspendedMembers = Math.max(act.suspendedAccounts ?? 0, 0);
                  return (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-orange-500">Engagement summary</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-center">
                          <p className="font-mono text-[15px] font-bold text-white">{act.avgSessionsPerWeek.toFixed(1)}/wk</p>
                          <p className="text-[9px] table-text-muted mt-1">Avg sessions/member</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-center">
                          <div className="mb-0.5 flex items-center justify-center gap-1">
                            <p className="font-mono text-[15px] font-bold text-white">{suspendedMembers.toLocaleString()}</p>
                            <Badge c={suspendedMembers > 0 ? "red" : "green"}>{suspendedMembers > 0 ? "attention" : "healthy"}</Badge>
                          </div>
                          <p className="text-[9px] table-text-muted mt-1">Suspended accounts</p>
                        </div>
                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-center">
                          <p className="font-mono text-[15px] font-bold text-white">{Math.round(act.avgSessionMinutes)} min</p>
                          <p className="text-[9px] table-text-muted mt-1">Avg session length</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}

              <div className="mt-auto grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-center">
                  <p className="font-mono text-[15px] font-bold text-emerald-400">{members.gymsApproved}</p>
                  <p className="text-[9px] table-text-muted">Approved gyms</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-center">
                  <p className="font-mono text-[15px] font-bold text-amber-400">{members.gymsPendingApproval}</p>
                  <p className="text-[9px] table-text-muted">Pending</p>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-2 text-center">
                  <p className="font-mono text-[15px] font-bold text-red-400">{members.gymsRejected}</p>
                  <p className="text-[9px] table-text-muted">Rejected</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardShell>
      </div>

      {/* ── TOP GYMS + PENDING PAYOUTS ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <CardShell>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Dumbbell className="h-4 w-4 text-orange-400" />
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Top gyms</p>
            </div>
            <FilterTabs
              options={[
                { label: "All time", value: "ALL_TIME" },
                { label: "Month", value: "LAST_MONTH" },
                { label: "Week", value: "LAST_WEEK" },
              ]}
              value={topGymsRange}
              onChange={(v) => setTopGymsRange(v as TopGymsRange)}
            />
          </div>
          {topGymsQ.isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : topGymsQ.data && topGymsQ.data.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-white/[0.06]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Gym</th>
                    <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Check-ins</th>
                    <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Joined</th>
                    <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Access mode</th>
                    <th className="px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Eligibility</th>
                    {topGymsRange !== "ALL_TIME" && (
                      <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-[0.1em] table-text-muted">Trend</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {topGymsQ.data.map((g, i) => (
                    <tr key={g.gymId} className="transition-colors hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {g.logoUrl ? (
                            <img src={g.logoUrl} alt="" className="h-7 w-7 rounded-full object-cover bg-white/[0.04]" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-400">
                              {g.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[12.5px] font-medium text-white">{g.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold text-white">
                        {g.checkIns.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[11px] text-zinc-400">
                        {g.joinedAt ? new Date(g.joinedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-center text-[11px] text-zinc-400">
                        {formatEnumLabel(g.accessMode)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <Badge c={g.eligible ? "green" : "red"}>{g.eligible ? "Eligible" : "Not eligible"}</Badge>
                          <span className="text-[10px] table-text-muted">Tier: {formatEnumLabel(g.eligibleTier)}</span>
                        </div>
                      </td>
                      {topGymsRange !== "ALL_TIME" && (
                        <td className="px-3 py-2.5 text-right">
                          {g.trendPercent != null ? (
                            <Badge c={g.trendPercent >= 0 ? "green" : "red"}>
                              {g.trendPercent >= 0 ? "↑" : "↓"} {Math.abs(g.trendPercent)}%
                            </Badge>
                          ) : (
                          <span className="text-[10px] table-text-muted">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-xs table-text-muted">No gym data available</p>
          )}
        </CardShell>

        <div className="space-y-3">
          <CardShell>
            <div className="mb-4 flex items-center gap-2 shrink-0">
              <Clock className="h-4 w-4 text-amber-400" />
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">Pending payouts</p>
            </div>
            {payoutsQ.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (
              <div className="space-y-0 divide-y divide-white/[0.06]">
                {payoutsQ.data?.map((p) => (
                  <div key={p.payoutSettlementId} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-white">{p.gymName}</p>
                      <p className="text-[11px] table-text-muted">{new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-white">{formatMoneyFull(p.netAmount, p.currency)}</p>
                      <Badge c={p.status === "APPROVED" ? "blue" : p.status === "GYM_REVIEW_PENDING" ? "purple" : "amber"}>
                        {p.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!payoutsQ.data || payoutsQ.data.length === 0) && (
                  <p className="py-6 text-center text-xs table-text-muted">No pending payouts</p>
                )}
              </div>
            )}
          </CardShell>
        </div>
      </div>

      {/* ── API HEALTH ─────────────────────────────────────────── */}
      <div>
        <CardShell>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 shrink-0">
                <Zap className="h-4 w-4 text-yellow-400" />
                <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">API health</p>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] table-text-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> All endpoints nominal
              </p>
            </div>
            <FilterTabs
              options={[
                { label: "Today", value: "TODAY" },
                { label: "Week", value: "LAST_WEEK" },
                { label: "Month", value: "LAST_MONTH" },
              ]}
              value={apiRange}
              onChange={(v) => setApiRange(v as ApiHealthRange)}
            />
          </div>

          {apiHealthQ.isLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : api ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <MiniStat label="Requests" value={api.totalRequests.toLocaleString()}>
                  <Badge c={Number(apiReqChange) >= 0 ? "green" : "red"}>
                    {Number(apiReqChange) >= 0 ? "↑" : "↓"} {Math.abs(Number(apiReqChange))}%
                  </Badge>
                </MiniStat>
                <MiniStat label="Avg response" value={`${api.avgResponseMs}ms`}>
                  <span className="font-mono text-[10px] text-zinc-500">p95: {api.p95ResponseMs}ms</span>
                </MiniStat>
                <MiniStat label="Error rate" value={`${api.errorRate}%`}>
                  <Badge c={api.errorRate < 1 ? "amber" : "red"}>{api.errorCount} errors</Badge>
                </MiniStat>
                <MiniStat label="Slowest endpoint" value={`${api.slowestMs}ms`}>
                  <span className="font-mono text-[9.5px] text-zinc-500">{api.slowestEndpoint}</span>
                </MiniStat>
              </div>

              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-orange-500">Request volume</p>
              <div className="flex h-[52px] items-end gap-[2px]">
                {api.volumePoints.map((p, i) => {
                  const isZero = apiVolMax === 0;
                  const pct = isZero ? 6 : Math.max((p.count / apiVolMax) * 100, 2);
                  const color = isZero ? "bg-white/[0.06]" : pct >= 75 ? "bg-orange-500" : pct >= 45 ? "bg-orange-500/40" : "bg-white/[0.06]";
                  return <div key={i} className={cn("flex-1 rounded-t-sm", color)} style={{ height: `${pct}%` }} title={isZero ? `${p.label}: no data` : `${p.label}: ${p.count}`} />;
                })}
              </div>
              <div className="mt-1 flex justify-between text-[9px] font-mono table-text-muted">
                {api.volumePoints.length > 8
                  ? api.volumePoints
                      .filter((_, i, arr) => i === 0 || i === arr.length - 1 || i % Math.ceil(arr.length / 8) === 0)
                      .map((p, i) => <span key={i}>{p.label}</span>)
                  : api.volumePoints.map((p, i) => <span key={i}>{p.label}</span>)}
              </div>

              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-orange-500">Slowest endpoints</p>
                    {api.slowestEndpoints.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 border-b border-white/[0.04] py-1.5 text-[11px] last:border-b-0">
                        <span className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold",
                          e.method === "GET" ? "bg-teal-500/15 text-teal-400" :
                          e.method === "POST" ? "bg-blue-500/15 text-blue-400" :
                          e.method === "PATCH" ? "bg-amber-500/15 text-amber-400" :
                          "bg-red-500/15 text-red-400"
                        )}>
                          {e.method}
                        </span>
                        <span className="flex-1 truncate font-mono text-[11.5px] font-light text-slate-300">{e.endpoint}</span>
                        <span className="whitespace-nowrap font-mono text-[11px] text-zinc-400">{e.hits.toLocaleString()}x</span>
                        <span className={cn(
                          "whitespace-nowrap font-mono text-[11px]",
                          e.avgMs < 150 ? "text-emerald-400" : e.avgMs < 300 ? "text-amber-400" : "text-red-400"
                        )}>
                          {e.avgMs}ms
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-orange-500">Error breakdown</p>
                    {api.errorBreakdown.map((e, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-white/[0.04] py-1.5 text-[12px] last:border-b-0">
                        <span className="flex items-center gap-2 font-light text-slate-300">
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: e.category === "server_error" ? "#ef4444" : "#f59e0b" }}
                          />
                          {e.category.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono font-bold text-white">{e.count.toLocaleString()}</span>
                      </div>
                    ))}
                    {api.errorBreakdown.length === 0 && (
                      <p className="py-3 text-center text-xs table-text-muted">No errors in period</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </CardShell>
      </div>
    </div>
  );
}

/* ─── Tiny shared components ─────────────────────────────────────────── */

function KPICard({ label, value, meta, theme = "orange", icon: Icon }: { label: string; value: string; theme?: "orange" | "green" | "blue" | "purple"; icon?: React.ElementType; meta: ReactNode }) {
  const styles: Record<string, { border: string, bg: string, text: string }> = {
    orange: { border: "border-orange-500/10", bg: "from-orange-500/[0.06]", text: "text-orange-500" },
    green: { border: "border-emerald-500/10", bg: "from-emerald-500/[0.06]", text: "text-emerald-500" },
    blue: { border: "border-blue-500/10", bg: "from-blue-500/[0.06]", text: "text-blue-500" },
    purple: { border: "border-purple-500/10", bg: "from-purple-500/[0.06]", text: "text-purple-500" },
  };
  const t = styles[theme];

  return (
    <div className={cn("rounded-2xl border bg-gradient-to-br to-transparent px-4 py-3 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]", t.border, t.bg)}>
      <div className="mb-2 flex items-center gap-2">
        {Icon && <Icon className={cn("h-3.5 w-3.5", t.text)} />}
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-zinc-400">{label}</p>
      </div>
      <p className="font-mono text-2xl font-bold tracking-tight text-white leading-none">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] table-text-muted">{meta}</div>
    </div>
  );
}

function Badge({ c, children }: { c: "green" | "red" | "amber" | "blue" | "teal" | "purple" | "orange" | "yellow" | "zinc"; children: ReactNode }) {
  const cls: Record<string, { dot: string; bg: string }> = {
    green:  { dot: "bg-emerald-400",  bg: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
    red:    { dot: "bg-red-400",      bg: "border-red-500/25 bg-red-500/10 text-red-400" },
    amber:  { dot: "bg-amber-400",    bg: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
    blue:   { dot: "bg-blue-400",     bg: "border-blue-500/25 bg-blue-500/10 text-blue-400" },
    teal:   { dot: "bg-teal-400",     bg: "border-teal-500/25 bg-teal-500/10 text-teal-400" },
    purple: { dot: "bg-purple-400",   bg: "border-purple-500/25 bg-purple-500/10 text-purple-400" },
    orange: { dot: "bg-orange-400",   bg: "border-orange-500/25 bg-orange-500/10 text-orange-400" },
    yellow: { dot: "bg-yellow-400",   bg: "border-yellow-500/25 bg-yellow-500/10 text-yellow-400" },
    zinc:   { dot: "bg-zinc-400",     bg: "border-zinc-500/25 bg-zinc-500/10 text-zinc-400" },
  };
  const cfg = cls[c] ?? cls.blue;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider", cfg.bg)}>
      <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", cfg.dot)} />
      {children}
    </span>
  );
}

function MiniStat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="font-mono text-[17px] font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[10px] table-text-muted">{label}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

/* ─── Main Screen ────────────────────────────────────────────────────── */

const AdminDashboard = () => {
  const location = useLocation();
  const requestedSection = (location.state as { activeSection?: string } | null)?.activeSection;
  const resolveSection = (value: string | undefined): AdminSection =>
    value === "users" ||
    value === "gyms" ||
    value === "plans" ||
    value === "payments" ||
    value === "settlements" ||
    value === "announcements" ||
    value === "settings"
      ? value
      : "home";

  const [activeSection, setActiveSection] = useState<AdminSection>(() => resolveSection(requestedSection));

  useEffect(() => {
    if (!requestedSection) return;
    setActiveSection(resolveSection(requestedSection));
  }, [requestedSection]);

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return <DashboardHome />;
      case "users":
        return <ManageUsers />;
      case "gyms":
        return <ManageGyms />;
      case "plans":
        return <ManagePlans />;
      case "payments":
        return <ManagePayments />;
      case "settlements":
        return <ManageSettlements />;
      case "announcements":
        return <AdminAnnouncementsPage />;
      case "settings":
        return (
          <div className="mx-auto max-w-[1400px]">
            <AdminSettings />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DefaultLayout
      role="ADMIN"
      activeSection={activeSection}
      onSectionChange={(section) => setActiveSection(resolveSection(section))}
      onPrimaryAction={() => setActiveSection("users")}
      onProfileClick={() => setActiveSection("home")}
      contentClassName="px-4 py-6 sm:px-6 lg:px-8"
    >
      {renderContent()}
    </DefaultLayout>
  );
};

export default AdminDashboard;
