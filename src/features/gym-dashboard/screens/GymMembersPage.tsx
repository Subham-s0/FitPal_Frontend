import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, RefreshCcw, Search, SlidersHorizontal, Users, UserCheck, Repeat, Star, Bookmark, X } from "lucide-react";
import { getGymCheckInsApi } from "@/features/gym-dashboard/gym-checkins.api";
import type { AccessTier, GymCheckInDenyReason, GymCheckInStatus } from "@/features/gym-dashboard/gym-checkins.model";
import {
  getGymMembersMetricsApi,
  getGymRecentSigninsApi,
  getGymSavedMembersApi,
  getGymSavedMembersSummaryApi,
  getGymTopVisitorsApi,
} from "@/features/gym-dashboard/gym-members.api";
import type { GymMembersWindow, GymVisitorsRange } from "@/features/gym-dashboard/gym-members.model";
import { getApiErrorMessage } from "@/shared/api/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/utils";

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const avatarFallback = (name?: string | null) => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
};

const denyReasonLabel = (reason: GymCheckInDenyReason) =>
  reason
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

function statusBadge(status: GymCheckInStatus) {
  switch (status) {
    case "CHECKED_IN":
      return { dot: "bg-green-400", cls: "border-green-500/30 bg-green-500/10 text-green-400" };
    case "CHECKED_OUT":
      return { dot: "bg-blue-400", cls: "border-blue-500/30 bg-blue-500/10 text-blue-400" };
    case "DENIED":
      return { dot: "bg-red-400", cls: "border-red-500/30 bg-red-500/10 text-red-400" };
    default:
      return { dot: "bg-yellow-400", cls: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400" };
  }
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div className="dashboard-mobile-pagination flex items-center justify-between border-t border-white/[0.08] px-4 py-3">
      <p className="text-[12px] text-zinc-500">
        Page {page + 1} of {Math.max(totalPages, 1)}
      </p>
      <div className="dashboard-mobile-pagination-actions flex items-center gap-1.5">
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-bold text-zinc-400 transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span className="dashboard-mobile-page-pill rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold text-white">
          {page + 1}
        </span>
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[11px] font-bold text-zinc-400 transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const GymMembersPage: FC = () => {
  const [window, setWindow] = useState<GymMembersWindow>("WEEK");
  const [topRange, setTopRange] = useState<GymVisitorsRange>("WEEK");

  const [checkinPage, setCheckinPage] = useState(0);
  const [checkinSortBy, setCheckinSortBy] = useState<"checkInAt" | "checkOutAt" | "status">("checkInAt");
  const [checkinSortDirection, setCheckinSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [checkinNamePrefix, setCheckinNamePrefix] = useState("");
  const [checkinStatus, setCheckinStatus] = useState<"ALL" | GymCheckInStatus>("ALL");
  const [checkinTier, setCheckinTier] = useState<"ALL" | AccessTier>("ALL");
  const [checkinDenyReason, setCheckinDenyReason] = useState<"ALL" | GymCheckInDenyReason>("ALL");
  const [checkinFilterOpen, setCheckinFilterOpen] = useState(false);
  const checkinFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-checkin-filter-select='true']")) return;
      if (checkinFilterRef.current && !checkinFilterRef.current.contains(target)) setCheckinFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const checkinActiveFilterCount = [
    checkinStatus !== "ALL" ? 1 : 0,
    checkinTier !== "ALL" ? 1 : 0,
    checkinDenyReason !== "ALL" ? 1 : 0,
    (checkinSortBy !== "checkInAt" || checkinSortDirection !== "DESC") ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const [savedPage, setSavedPage] = useState(0);
  const [savedSortIdx, setSavedSortIdx] = useState(0);

  // Sort options for saved members (icon-only style like ManageGyms)
  const SAVED_SORTS: { label: string; sortBy: "savedAt" | "memberName"; sortDir: "ASC" | "DESC"; Icon: React.ElementType }[] = [
    { label: "Sort", sortBy: "savedAt", sortDir: "DESC", Icon: ArrowUpDown },
    { label: "Newest", sortBy: "savedAt", sortDir: "DESC", Icon: ArrowDown },
    { label: "Oldest", sortBy: "savedAt", sortDir: "ASC", Icon: ArrowUp },
    { label: "A-Z", sortBy: "memberName", sortDir: "ASC", Icon: ArrowUp },
    { label: "Z-A", sortBy: "memberName", sortDir: "DESC", Icon: ArrowDown },
  ];
  const savedSortMode = SAVED_SORTS[savedSortIdx];
  const SavedSortIcon = savedSortMode.Icon;

  const metricsQ = useQuery({
    queryKey: ["gym-members", "metrics", window],
    queryFn: () => getGymMembersMetricsApi(window),
  });
  const topVisitorsQ = useQuery({
    queryKey: ["gym-members", "top-visitors", topRange],
    queryFn: () => getGymTopVisitorsApi(topRange, 5),
  });
  const recentQ = useQuery({
    queryKey: ["gym-members", "recent-signins"],
    queryFn: () => getGymRecentSigninsApi(5),
  });
  const savedSummaryQ = useQuery({
    queryKey: ["gym-members", "saved-summary"],
    queryFn: getGymSavedMembersSummaryApi,
  });
  // Mini query for saved members card with pagination
  const savedMiniQ = useQuery({
    queryKey: ["gym-members", "saved-mini", savedPage, savedSortMode.sortBy, savedSortMode.sortDir],
    queryFn: () =>
      getGymSavedMembersApi({
        page: savedPage,
        size: 5,
        sortBy: savedSortMode.sortBy,
        sortDirection: savedSortMode.sortDir,
      }),
  });

  const checkinsTableQ = useQuery({
    queryKey: [
      "gym-members",
      "checkins-table",
      checkinPage,
      checkinSortBy,
      checkinSortDirection,
      checkinNamePrefix,
      checkinStatus,
      checkinTier,
      checkinDenyReason,
    ],
    queryFn: () =>
      getGymCheckInsApi({
        page: checkinPage,
        size: 10,
        sortBy: checkinSortBy,
        sortDirection: checkinSortDirection,
        statuses: checkinStatus === "ALL" ? undefined : [checkinStatus],
        membershipTier: checkinTier === "ALL" ? undefined : checkinTier,
        denyReason: checkinDenyReason === "ALL" ? undefined : checkinDenyReason,
        memberNamePrefix: checkinNamePrefix.trim() || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const repeatRate = useMemo(() => {
    const raw = metricsQ.data?.repeatRatePct ?? 0;
    return `${raw.toFixed(1)}%`;
  }, [metricsQ.data?.repeatRatePct]);

  const METRIC_CARDS: { label: string; icon: React.ElementType; border: string; bg: string; accent: string }[] = [
    { label: "Unique Customers", icon: Users, border: "border-blue-500/25", bg: "bg-blue-500/[0.06]", accent: "text-blue-400" },
    { label: "Active Customers", icon: UserCheck, border: "border-green-500/25", bg: "bg-green-500/[0.06]", accent: "text-green-400" },
    { label: "Repeat Rate", icon: Repeat, border: "border-orange-500/25", bg: "bg-orange-500/[0.06]", accent: "text-orange-400" },
    { label: "Most Checked-In", icon: Star, border: "border-violet-500/25", bg: "bg-violet-500/[0.06]", accent: "text-violet-300" },
    { label: "Saved This Gym", icon: Bookmark, border: "border-pink-500/25", bg: "bg-pink-500/[0.06]", accent: "text-pink-400" },
  ];

  const metricValues = [
    metricsQ.isLoading ? "-" : String(metricsQ.data?.uniqueCustomers ?? 0),
    metricsQ.isLoading ? "-" : String(metricsQ.data?.activeCustomers ?? 0),
    metricsQ.isLoading ? "-" : repeatRate,
    null, // special render
    savedSummaryQ.isLoading ? "-" : String(savedSummaryQ.data?.totalSavedMembers ?? 0),
  ];

  return (
    <div className="dashboard-mobile-page max-w-[1600px] animate-fade-in space-y-5 font-['Outfit',system-ui,sans-serif]">
      {/*  Header + Time Window Filter  */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Members &amp; <span style={fireStyle}>Visitors</span>
          </h1>
        </div>
        <div className="inline-flex gap-[3px] rounded-full border border-white/10 bg-white/[0.02] p-[3px]">
          {(["WEEK", "MONTH"] as GymMembersWindow[]).map((w) => (
            <button
              key={w}
              type="button"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform",
                window === w 
                  ? "bg-orange-500 text-white" 
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
              )}
              onClick={() => setWindow(w)}
            >
              {w[0] + w.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/*  Privacy notice  */}
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-[12px] text-zinc-500">
        <span className="font-semibold text-zinc-300">Privacy:</span> Visit counts and plan tiers only. Email, phone,
        and payment info stay with FitPal.
      </p>

      {/*  Stat Cards  */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {METRIC_CARDS.map((mc, i) => {
          const Icon = mc.icon;
          return (
            <div
              key={mc.label}
              className={`flex h-full min-h-[95px] flex-col rounded-2xl border p-3 transition-all hover:border-white/20 ${mc.border} ${mc.bg}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Icon className={`h-4 w-4 flex-shrink-0 ${mc.accent}`} />
                <p className="truncate text-[10px] font-black uppercase tracking-wider text-zinc-500">{mc.label}</p>
              </div>
              {i === 3 ? (
                // Most Checked-In Member  special render
                <div className="mt-2.5 min-h-[28px]">
                  {metricsQ.isLoading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                  ) : metricsQ.data?.mostCheckedInMember ? (
                    <>
                      <p className="text-sm font-bold text-white">{metricsQ.data.mostCheckedInMember.memberName ?? "Unknown"}</p>
                      <p className="text-[10px] text-zinc-500">{metricsQ.data.mostCheckedInMember.visitCount} visits</p>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500">No data</p>
                  )}
                </div>
              ) : (
                <div className="mt-2.5 flex min-h-[28px] items-center">
                  <p className={`text-[20px] font-black leading-none ${i === 2 ? mc.accent : "text-white"}`}>
                    {metricValues[i]}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/*  Top Visitors, Saved Members & Recent Sign-Ins (3-column)  */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Top Visitors */}
        <div className="flex flex-col rounded-2xl border table-border bg-[#121212] p-4 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Top Visitors</span>
            <div className="inline-flex gap-[3px] rounded-full border border-white/10 bg-white/[0.02] p-[3px]">
              {(["WEEK", "MONTH", "ALL_TIME"] as GymVisitorsRange[]).map((r) => (
                <button
                  key={r}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform",
                    topRange === r 
                      ? "bg-orange-500 text-white" 
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                  )}
                  onClick={() => setTopRange(r)}
                >
                  {r === "ALL_TIME" ? "All" : r[0] + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            {topVisitorsQ.isLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : topVisitorsQ.isError ? (
              <p className="text-sm text-red-300">{getApiErrorMessage(topVisitorsQ.error, "Failed to load")}</p>
            ) : (topVisitorsQ.data?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">No visitors yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {topVisitorsQ.data?.slice(0, 5).map((v, idx) => (
                  <li
                    key={`${v.accountId}-${v.lastVisitDate}`}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition-all hover:bg-white/[0.04]",
                      idx === 0 && "relative overflow-hidden border-orange-500/30 bg-gradient-to-r from-orange-500/[0.08] via-orange-500/[0.04] to-transparent shadow-[inset_0_0_18px_rgba(249,115,22,0.18),inset_0_0_40px_rgba(249,115,22,0.08),inset_0_1px_0_rgba(249,115,22,0.2)]"
                    )}
                  >
                    {/* Inner grid-line overlay for rank 1 */}
                    {idx === 0 && (
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.07]"
                        style={{
                          backgroundImage:
                            'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
                          backgroundSize: '18px 18px',
                        }}
                      />
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-black",
                        idx === 0
                          ? "bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-white shadow-[0_0_8px_rgba(249,115,22,0.3)]"
                          : "bg-orange-500/10 text-orange-400"
                      )}>{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-white">{v.memberName ?? "Unknown"}</p>
                        <p className="text-[9px] text-zinc-500">Last: {formatDate(v.lastVisitDate)}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2 py-0.5 text-[10px] font-black text-orange-400">{v.visitCount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Saved Members (mini card) */}
        <div className="flex flex-col rounded-2xl border table-border bg-[#121212] p-4 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Saved Members</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSavedSortIdx((i) => (i + 1) % SAVED_SORTS.length);
                  setSavedPage(0);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all ${savedSortIdx !== 0 ? "border-orange-500/30 bg-orange-500/10 text-orange-400" : "border-white/10 text-zinc-400 hover:text-white"}`}
              >
                <SavedSortIcon className="h-3 w-3" />{savedSortMode.label}
              </button>
              <button
                type="button"
                onClick={() => setSavedPage((p) => Math.max(0, p - 1))}
                disabled={!(savedMiniQ.data?.hasPrevious ?? false) || savedMiniQ.isFetching}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold text-zinc-300">
                {(savedMiniQ.data?.page ?? savedPage) + 1}/{Math.max(1, savedMiniQ.data?.totalPages ?? 1)}
              </span>
              <button
                type="button"
                onClick={() => setSavedPage((p) => p + 1)}
                disabled={!(savedMiniQ.data?.hasNext ?? false) || savedMiniQ.isFetching}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
          <div className="flex-1">
            {savedMiniQ.isLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : savedMiniQ.isError ? (
              <p className="text-sm text-red-300">{getApiErrorMessage(savedMiniQ.error, "Failed to load")}</p>
            ) : (savedMiniQ.data?.items?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">No saved members yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {savedMiniQ.data?.items?.slice(0, 5).map((v) => (
                  <li key={`${v.accountId}-${v.savedAt}`} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.04]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-6 w-6 rounded-full border border-pink-500/25">
                        <AvatarImage src={v.profileImageUrl ?? undefined} alt={v.memberName ?? "Member"} className="object-cover" />
                        <AvatarFallback className="rounded-full bg-pink-500/10 text-[9px] font-black text-pink-400">
                          {avatarFallback(v.memberName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate text-[12px] font-bold text-white">{v.memberName ?? "Unknown"}</p>
                    </div>
                    <p className="flex-shrink-0 text-[9px] text-zinc-500">{formatDate(v.savedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Sign-ins */}
        <div className="flex flex-col rounded-2xl border table-border bg-[#121212] p-4 shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Recent Sign-ins</span>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-zinc-400 transition-all hover:text-white"
              onClick={() => recentQ.refetch()}
            >
              <RefreshCcw className="h-3 w-3" /> Refresh
            </button>
          </div>
          <div className="flex-1">
            {recentQ.isLoading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
            ) : recentQ.isError ? (
              <p className="text-sm text-red-300">{getApiErrorMessage(recentQ.error, "Failed to load")}</p>
            ) : (recentQ.data?.length ?? 0) === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">No sign-ins yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {recentQ.data?.slice(0, 5).map((v) => (
                  <li key={`${v.accountId}-${v.checkedInAt}`} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-colors hover:bg-white/[0.04]">
                    <p className="truncate text-[12px] font-bold text-white">{v.memberName ?? "Unknown"}</p>
                    <p className="flex-shrink-0 text-[9px] text-zinc-500">{formatDateTime(v.checkedInAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Check-in Log Table */}
      <div className="overflow-hidden rounded-[18px] border table-border bg-[#121212] shadow-[0_20px_40px_-28px_rgba(0,0,0,0.92)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-400">Check-in Log</span>
            <p className="mt-0.5 text-[10px] text-zinc-500">Activity feed from the existing gym check-ins source</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-[7px] text-[12px] font-bold text-zinc-400 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
            onClick={() => checkinsTableQ.refetch()}
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="dashboard-mobile-toolbar flex items-center justify-between gap-2 flex-wrap border-t border-white/[0.08] px-5 py-3">
          <div className="dashboard-mobile-search relative flex-1 max-w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <Input
              value={checkinNamePrefix}
              onChange={(e) => {
                setCheckinNamePrefix(e.target.value);
                setCheckinPage(0);
              }}
              className="h-9 rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-3 text-[12px] text-white placeholder:text-zinc-500 focus-visible:ring-orange-500/30"
              placeholder="Search member..."
            />
          </div>
          <div className="dashboard-mobile-actions flex items-center gap-2 flex-shrink-0">
            <div ref={checkinFilterRef} className="relative">
              <button
                type="button"
                onClick={() => setCheckinFilterOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
                  checkinFilterOpen || checkinActiveFilterCount > 0
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-orange-500/30 hover:text-orange-400"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter & Sort
                {checkinActiveFilterCount > 0 && (
                  <span className="ml-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-orange-500/20 px-1 text-[9px] font-black text-orange-400">
                    {checkinActiveFilterCount}
                  </span>
                )}
              </button>
              {checkinFilterOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 border border-white/10 bg-[hsl(0,0%,8%)] rounded-2xl p-4 min-w-[280px] z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)] space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Filter & Sort</div>

                  <Select value={checkinStatus} onValueChange={(v) => { setCheckinStatus(v as "ALL" | GymCheckInStatus); setCheckinPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border border-white/10 bg-[#111] text-white">
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="CHECKED_IN">Checked In</SelectItem>
                      <SelectItem value="CHECKED_OUT">Checked Out</SelectItem>
                      <SelectItem value="ACCESS_PENDING">Access Pending</SelectItem>
                      <SelectItem value="DENIED">Denied</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={checkinTier} onValueChange={(v) => { setCheckinTier(v as "ALL" | AccessTier); setCheckinPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="All Tiers" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border border-white/10 bg-[#111] text-white">
                      <SelectItem value="ALL">All Tiers</SelectItem>
                      <SelectItem value="BASIC">Basic</SelectItem>
                      <SelectItem value="PRO">Pro</SelectItem>
                      <SelectItem value="ELITE">Elite</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={checkinDenyReason} onValueChange={(v) => { setCheckinDenyReason(v as "ALL" | GymCheckInDenyReason); setCheckinPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="All Deny Reasons" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border border-white/10 bg-[#111] text-white">
                      <SelectItem value="ALL">All Deny Reasons</SelectItem>
                      <SelectItem value="INACTIVE_TOKEN">Inactive Token</SelectItem>
                      <SelectItem value="GYM_NOT_APPROVED">Gym Not Approved</SelectItem>
                      <SelectItem value="GYM_CHECK_IN_DISABLED">Gym Check-in Disabled</SelectItem>
                      <SelectItem value="GYM_GEOFENCE_NOT_CONFIGURED">Gym Geofence Not Configured</SelectItem>
                      <SelectItem value="NO_ACTIVE_SUBSCRIPTION">No Active Subscription</SelectItem>
                      <SelectItem value="TIER_TOO_LOW">Tier Too Low</SelectItem>
                      <SelectItem value="OUTSIDE_RADIUS">Outside Radius</SelectItem>
                      <SelectItem value="ALREADY_VISITED_ANOTHER_GYM_TODAY">Already Visited Another Gym Today</SelectItem>
                      <SelectItem value="ALREADY_CHECKED_IN">Already Checked-In</SelectItem>
                      <SelectItem value="DOOR_DEVICE_UNAVAILABLE">Door Device Unavailable</SelectItem>
                      <SelectItem value="DOOR_COMMAND_FAILED">Door Command Failed</SelectItem>
                      <SelectItem value="DOOR_COMMAND_EXPIRED">Door Command Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={`${checkinSortBy}:${checkinSortDirection}`} onValueChange={(v) => { const [s, d] = v.split(":"); setCheckinSortBy(s as "checkInAt" | "checkOutAt" | "status"); setCheckinSortDirection(d as "ASC" | "DESC"); setCheckinPage(0); }}>
                    <SelectTrigger className="h-9 w-full rounded-full border border-white/10 bg-white/[0.03] px-3 text-[12px] font-bold text-white">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent data-checkin-filter-select="true" className="border border-white/10 bg-[#111] text-white">
                      <SelectItem value="checkInAt:DESC">Checked In (newest)</SelectItem>
                      <SelectItem value="checkInAt:ASC">Checked In (oldest)</SelectItem>
                      <SelectItem value="checkOutAt:DESC">Checked Out (newest)</SelectItem>
                      <SelectItem value="checkOutAt:ASC">Checked Out (oldest)</SelectItem>
                      <SelectItem value="status:ASC">Status (A-Z)</SelectItem>
                      <SelectItem value="status:DESC">Status (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>

                  {checkinActiveFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCheckinStatus("ALL");
                        setCheckinTier("ALL");
                        setCheckinDenyReason("ALL");
                        setCheckinSortBy("checkInAt");
                        setCheckinSortDirection("DESC");
                        setCheckinPage(0);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-orange-500/30 px-3.5 py-[7px] text-[12px] font-bold text-orange-400 transition-all hover:bg-orange-500/10"
                    >
                      <X className="h-3 w-3" /> Clear all filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {checkinsTableQ.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
            <span className="text-[13px] text-zinc-500">Loading check-ins</span>
          </div>
        ) : checkinsTableQ.isError ? (
          <p className="px-5 py-8 text-sm text-red-300">{getApiErrorMessage(checkinsTableQ.error, "Failed to load check-in log")}</p>
        ) : (
          <>
            <div className="dashboard-mobile-table-scroll">
              <Table className="min-w-[860px] w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-white/[0.02] border-b border-white/[0.08] hover:bg-transparent">
                  {["Member", "Checked In", "Checked Out", "Tier", "Status", "Deny Reason"].map((h) => (
                    <TableHead key={h} className="h-auto px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(checkinsTableQ.data?.items ?? []).length === 0 ? (
                  <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                    <TableCell className="py-16 text-center" colSpan={6}>
                      <Search className="mx-auto mb-2 h-8 w-8 text-zinc-600" strokeWidth={1.5} />
                      <div className="text-[14px] font-bold text-zinc-400">No rows found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (checkinsTableQ.data?.items ?? []).map((row) => {
                    const badge = statusBadge(row.status);
                    return (
                      <TableRow key={row.checkInId} className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.025]">
                        <TableCell className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-9 w-9 rounded-full border border-orange-500/25">
                              <AvatarImage src={row.memberProfileImageUrl ?? undefined} alt={row.memberName ?? "Member"} className="object-cover" />
                              <AvatarFallback className="rounded-full bg-orange-500/10 text-[11px] font-black text-orange-400">
                                {avatarFallback(row.memberName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[13px] font-bold text-white">{row.memberName ?? "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 font-mono text-[11px] text-zinc-400">{formatDateTime(row.checkInAt)}</TableCell>
                        <TableCell className="px-5 py-3.5 font-mono text-[11px] text-zinc-400">{formatDateTime(row.checkOutAt)}</TableCell>
                        <TableCell className="px-5 py-3.5">
                          {row.membershipTierAtCheckIn ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              row.membershipTierAtCheckIn === "ELITE"
                                ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                : row.membershipTierAtCheckIn === "PRO"
                                  ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            }`}>
                              {row.membershipTierAtCheckIn}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.cls}`}>
                            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${badge.dot}`} />
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-[11px] text-zinc-500">{row.denyReason ? denyReasonLabel(row.denyReason) : "-"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              </Table>
            </div>
            <Pagination
              page={checkinsTableQ.data?.page ?? 0}
              totalPages={checkinsTableQ.data?.totalPages ?? 1}
              onPageChange={setCheckinPage}
            />
          </>
        )}
      </div>

    </div>
  );
};

export default GymMembersPage;

