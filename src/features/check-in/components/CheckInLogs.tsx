import React, { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  History,
  MapPin,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { getApiErrorMessage } from "@/shared/api/client";
import {
  getMyCheckInHistoryApi,
  getMyCheckInHistorySummaryApi,
} from "@/features/check-in/api";
import { checkInQueryKeys } from "@/features/check-in/queryKeys";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import type {
  CheckInStatus,
  UserCheckInHistoryItemResponse,
} from "@/features/check-in/model";

interface CheckInLogsProps {
  onBack?: () => void;
}

type FilterStatus = "all" | CheckInStatus;

const PAGE_SIZE = 10;

const TIER = {
  BASIC: { color: "#4ade80", border: "rgba(74,222,128,0.3)", bg: "rgba(74,222,128,0.1)", label: "Basic" },
  PRO: { color: "#FF9900", border: "rgba(255,153,0,0.3)", bg: "rgba(255,153,0,0.1)", label: "Pro" },
  ELITE: { color: "#60a5fa", border: "rgba(96,165,250,0.3)", bg: "rgba(96,165,250,0.1)", label: "Elite" },
} as const;

const STATUS_CONFIG: Record<
  CheckInStatus,
  { color: string; label: string; bg: string; border: string }
> = {
  ACCESS_PENDING: {
    color: "#FACC15",
    label: "Access Pending",
    bg: "rgba(250,204,21,0.10)",
    border: "rgba(250,204,21,0.28)",
  },
  CHECKED_IN: {
    color: "#4ade80",
    label: "Checked In",
    bg: "rgba(74,222,128,0.10)",
    border: "rgba(74,222,128,0.28)",
  },
  CHECKED_OUT: {
    color: "#60a5fa",
    label: "Checked Out",
    bg: "rgba(96,165,250,0.10)",
    border: "rgba(96,165,250,0.28)",
  },
  DENIED: {
    color: "#f87171",
    label: "Access Denied",
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.28)",
  },
};

const FILTER_OPTIONS: Array<{ label: string; value: FilterStatus }> = [
  { label: "All", value: "all" },
  { label: "Completed", value: "CHECKED_OUT" },
  { label: "Active", value: "CHECKED_IN" },
  { label: "Pending", value: "ACCESS_PENDING" },
  { label: "Denied", value: "DENIED" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(durationSeconds: number) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatEnumLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getStatuses(filterStatus: FilterStatus) {
  return filterStatus === "all" ? undefined : [filterStatus];
}

function getStatusSubtext(entry: UserCheckInHistoryItemResponse) {
  if (entry.status === "DENIED") {
    return formatEnumLabel(entry.denyReason ?? entry.status);
  }

  return entry.denyReason ? formatEnumLabel(entry.denyReason) : null;
}

const CheckInLogs: React.FC<CheckInLogsProps> = ({ onBack }) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const deferredSearchTerm = useDeferredValue(searchTerm.trim());
  const statuses = getStatuses(filterStatus);

  const historyQuery = useQuery({
    queryKey: checkInQueryKeys.history(filterStatus, deferredSearchTerm, sortDirection, page),
    queryFn: () =>
      getMyCheckInHistoryApi({
        statuses,
        gymName: deferredSearchTerm || undefined,
        sortBy: "checkInAt",
        sortDirection,
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: (previousData) => previousData,
  });

  const summaryQuery = useQuery({
    queryKey: checkInQueryKeys.historySummary(filterStatus, deferredSearchTerm),
    queryFn: () =>
      getMyCheckInHistorySummaryApi({
        statuses,
        gymName: deferredSearchTerm || undefined,
      }),
    placeholderData: (previousData) => previousData,
  });

  const history = historyQuery.data?.items ?? [];
  const summary = summaryQuery.data ?? {
    totalAttempts: 0,
    completedVisits: 0,
    deniedVisits: 0,
    uniqueGyms: 0,
  };
  const requestError =
    historyQuery.error ?? summaryQuery.error
      ? getApiErrorMessage(historyQuery.error ?? summaryQuery.error, "Failed to load check-in history.")
      : null;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const setFilter = (value: FilterStatus) => {
    startTransition(() => {
      setFilterStatus(value);
      setPage(0);
    });
    setIsFilterMenuOpen(false);
  };

  const setSearch = (value: string) => {
    startTransition(() => {
      setSearchTerm(value);
      setPage(0);
    });
  };

  const toggleDateSort = () => {
    startTransition(() => {
      setSortDirection((current) => (current === "DESC" ? "ASC" : "DESC"));
      setPage(0);
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      setSearchTerm("");
      setFilterStatus("all");
      setSortDirection("DESC");
      setPage(0);
    });
    setIsFilterMenuOpen(false);
  };

  const hasActiveControls = searchTerm.trim() !== "" || filterStatus !== "all" || sortDirection !== "DESC";

  return (
    <UserSectionShell
      title={
        <>
          Recent <span className="text-gradient-fire">Check-Ins</span>
        </>
      }
      description="Track gym access history."
      actions={
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 self-start rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.1)] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-orange-500 backdrop-blur-xl transition-all duration-300 hover:border-orange-500 hover:bg-orange-600 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Scanner
        </button>
      }
    >
      <div className="h-full w-full space-y-8 font-sans text-white">
        <div className="hidden flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="leading-none text-4xl font-black uppercase tracking-tighter">
              Recent <span className="text-gradient-fire">Check-Ins</span>
            </h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">
              Access Log
            </p>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 self-start rounded-full border border-[hsla(30,100%,50%,0.2)] bg-[hsla(30,100%,50%,0.1)] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-orange-500 backdrop-blur-xl transition-all duration-300 hover:border-orange-500 hover:bg-orange-600 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Scanner
          </button>
        </div>

        {requestError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-200">
            {requestError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "All Attempts", value: summary.totalAttempts, color: "#FF9900", icon: History },
            { label: "Completed", value: summary.completedVisits, color: "#60a5fa", icon: CheckCircle2 },
            { label: "Denied", value: summary.deniedVisits, color: "#f87171", icon: XCircle },
            { label: "Unique Gyms", value: summary.uniqueGyms, color: "#a78bfa", icon: MapPin },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/6 bg-white/[0.02] p-5 transition-all hover:bg-white/[0.04]"
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color }} />
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                  {label}
                </p>
              </div>
              <p className="text-[30px] font-black leading-none" style={{ color }}>
                {summaryQuery.isLoading ? "--" : value}
              </p>
            </div>
          ))}
        </div>

        <div className="table-bg table-border overflow-hidden rounded-[18px] border">
          <div className="table-border border-b px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <label className="relative flex-1 max-w-[300px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 table-text-muted" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search gym name..."
                    className="table-bg table-border w-full rounded-full border py-2 pl-9 pr-4 text-[13px] font-medium text-white outline-none transition-all placeholder:table-text-muted focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)]"
                  />
                </label>

                <button
                  onClick={clearFilters}
                  className={`table-bg table-border flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all hover:border-orange-500/30 hover:text-orange-400 ${
                    hasActiveControls
                      ? "border-orange-500/30 text-orange-400"
                      : "table-text opacity-50"
                  }`}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start lg:flex-shrink-0 lg:self-auto">
                <button
                  onClick={toggleDateSort}
                  className="table-bg table-border table-text flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all hover:border-white/20 hover:text-white"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortDirection === "DESC" ? "Newest First" : "Oldest First"}
                </button>

                <div ref={filterMenuRef} className="relative">
                  <button
                    onClick={() => setIsFilterMenuOpen((current) => !current)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
                      isFilterMenuOpen || filterStatus !== "all"
                        ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                        : "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400"
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    Filter
                  </button>

                  {isFilterMenuOpen ? (
                    <div className="table-bg table-border absolute right-0 top-[calc(100%+8px)] z-20 min-w-[200px] rounded-2xl border p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                      <div className="px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">
                        Filter by status
                      </div>
                      {FILTER_OPTIONS.map(({ label, value }) => {
                        const active = filterStatus === value;

                        return (
                          <button
                            key={value}
                            onClick={() => setFilter(value)}
                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${
                              active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="table-text text-[12px] font-semibold">{label}</span>
                            {active ? (
                              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-black table-text-muted">
                                Active
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="table-header-bg table-border border-b">
                {["Gym", "Date", "Check-In", "Check-Out", "Duration", "Tier", "Status"].map((header) => (
                  <th
                    key={header}
                    className="table-text-muted px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] first:pl-5"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <History className="mx-auto mb-3 h-8 w-8 animate-pulse text-white/20" />
                    <p className="text-sm font-semibold text-white/40">Loading records...</p>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <History className="mx-auto mb-3 h-8 w-8 text-white/20" />
                    <p className="text-sm font-semibold text-white/40">No records found</p>
                  </td>
                </tr>
              ) : (
                history.map((entry) => {
                  const statusConfig = STATUS_CONFIG[entry.status];
                  const tierKey = entry.membershipTierAtCheckIn ?? "BASIC";
                  const tierConfig = TIER[tierKey];
                  const denyReason = getStatusSubtext(entry);

                  return (
                    <tr
                      key={entry.checkInId}
                      className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]"
                    >
                      <td className="px-3.5 py-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          {entry.gymLogoUrl ? (
                            <img
                              src={entry.gymLogoUrl}
                              alt={entry.gymName ?? "Gym logo"}
                              className="h-10 w-10 flex-shrink-0 rounded-[10px] border border-white/8 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/8 bg-white/5">
                              <Building2 className="h-4 w-4 text-orange-600/70" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-bold">
                              {entry.gymName ?? "Unknown Gym"}
                            </p>
                            <p className="table-text-muted mt-0.5 truncate text-[11px]">
                              {entry.gymId ? `#${entry.gymId}` : "Unknown location"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-2 text-white/70">
                          <Calendar className="h-3.5 w-3.5 text-white/40" />
                          <span className="whitespace-nowrap text-[12px] font-semibold">
                            {formatDate(entry.checkInAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          <span className="text-[12px] font-bold text-white/80">
                            {formatTime(entry.checkInAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5">
                        {entry.checkOutAt ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            <span className="text-[12px] font-bold text-white/80">
                              {formatTime(entry.checkOutAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-white/30">--</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5">
                        {typeof entry.durationSeconds === "number" ? (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-white/40" />
                            <span className="font-mono text-[12px] font-bold text-white/70">
                              {formatDuration(entry.durationSeconds)}
                            </span>
                          </div>
                        ) : entry.status === "DENIED" ? (
                          <span className="text-[12px] text-white/30">N/A</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-[12px] text-yellow-500/70">
                              {entry.status === "ACCESS_PENDING" ? "Pending" : "Active"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                          style={{
                            color: tierConfig.color,
                            borderColor: tierConfig.border,
                            backgroundColor: tierConfig.bg,
                          }}
                        >
                          {tierConfig.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5">
                        <div className="flex items-center gap-2">
                          {entry.status === "CHECKED_OUT" ? (
                            <CheckCircle2 className="h-4 w-4" style={{ color: statusConfig.color }} />
                          ) : entry.status === "DENIED" ? (
                            <XCircle className="h-4 w-4" style={{ color: statusConfig.color }} />
                          ) : entry.status === "ACCESS_PENDING" ? (
                            <Clock className="h-4 w-4" style={{ color: statusConfig.color }} />
                          ) : (
                            <ShieldCheck className="h-4 w-4" style={{ color: statusConfig.color }} />
                          )}
                          <div>
                            <span className="text-[10px] font-bold" style={{ color: statusConfig.color }}>
                              {statusConfig.label}
                            </span>
                            {denyReason ? (
                              <p className="mt-0.5 text-[9px] text-white/30">{denyReason}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          <div className="table-border flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="table-text-muted text-[12px]">
              {historyQuery.data
                ? `Showing ${history.length} of ${historyQuery.data.totalItems} records`
                : "Waiting for records"}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={!historyQuery.data?.hasPrevious}
                className="table-bg table-border table-text rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all hover:table-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="table-text-muted px-3 text-[10px] font-black uppercase tracking-[0.18em]">
                Page {(historyQuery.data?.page ?? 0) + 1} / {Math.max(historyQuery.data?.totalPages ?? 1, 1)}
              </span>
              <button
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={!historyQuery.data?.hasNext}
                className="table-bg table-border table-text rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all hover:table-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </UserSectionShell>
  );
};

export default CheckInLogs;
