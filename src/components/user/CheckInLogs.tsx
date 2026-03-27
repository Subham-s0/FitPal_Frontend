import React, { startTransition, useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  History,
  MapPin,
  Search,
  ShieldCheck,
  TimerReset,
  XCircle,
} from "lucide-react";

import { getApiErrorMessage } from "@/api/client";
import {
  getMyCheckInHistoryApi,
  getMyCheckInHistorySummaryApi,
} from "@/api/checkin.api";
import type {
  CheckInStatus,
  UserCheckInHistoryItemResponse,
} from "@/models/checkin.model";

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

  const deferredSearchTerm = useDeferredValue(searchTerm.trim());
  const statuses = getStatuses(filterStatus);

  const historyQuery = useQuery({
    queryKey: ["check-in-history", filterStatus, deferredSearchTerm, page],
    queryFn: () =>
      getMyCheckInHistoryApi({
        statuses,
        gymName: deferredSearchTerm || undefined,
        sortBy: "checkInAt",
        sortDirection: "DESC",
        page,
        size: PAGE_SIZE,
      }),
    placeholderData: (previousData) => previousData,
  });

  const summaryQuery = useQuery({
    queryKey: ["check-in-history-summary", filterStatus, deferredSearchTerm],
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
    activeVisits: 0,
    pendingVisits: 0,
    deniedVisits: 0,
    uniqueGyms: 0,
  };
  const requestError =
    historyQuery.error ?? summaryQuery.error
      ? getApiErrorMessage(historyQuery.error ?? summaryQuery.error, "Failed to load check-in history.")
      : null;

  const setFilter = (value: FilterStatus) => {
    startTransition(() => {
      setFilterStatus(value);
      setPage(0);
    });
  };

  const setSearch = (value: string) => {
    startTransition(() => {
      setSearchTerm(value);
      setPage(0);
    });
  };

  return (
    <div className="w-full h-full text-white font-sans">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
              Recent <span className="text-gradient-fire">Check-Ins</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mt-2">
              Access Log
            </p>
          </div>
          <button
            onClick={onBack}
            className="self-start px-6 py-3 rounded-xl border border-orange-600/25 bg-orange-600/5 text-orange-600 text-[11px] font-bold uppercase tracking-wider hover:bg-orange-600/10 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Scanner
          </button>
        </div>

        {requestError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-200">
            {requestError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: "All Attempts", value: summary.totalAttempts, color: "#FF9900", icon: History },
            { label: "Completed", value: summary.completedVisits, color: "#60a5fa", icon: CheckCircle2 },
            { label: "Active", value: summary.activeVisits, color: "#4ade80", icon: TimerReset },
            { label: "Pending", value: summary.pendingVisits, color: "#FACC15", icon: Clock },
            { label: "Denied", value: summary.deniedVisits, color: "#f87171", icon: XCircle },
            { label: "Unique Gyms", value: summary.uniqueGyms, color: "#a78bfa", icon: MapPin },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="p-5 rounded-2xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color }} />
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

        <div className="flex flex-col gap-4 rounded-[20px] border border-white/5 bg-[#111] p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-white/40" />
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "All", value: "all" as const },
                  { label: "Completed", value: "CHECKED_OUT" as const },
                  { label: "Active", value: "CHECKED_IN" as const },
                  { label: "Pending", value: "ACCESS_PENDING" as const },
                  { label: "Denied", value: "DENIED" as const },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                      filterStatus === value
                        ? "bg-orange-600/20 border border-orange-600/40 text-orange-600"
                        : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Search className="w-4 h-4 text-white/35" />
              <input
                value={searchTerm}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search gym name"
                className="w-full min-w-[220px] bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/6 bg-white/[0.025]">
                  {["Gym", "Date", "Check-In", "Check-Out", "Duration", "Tier", "Status"].map((header) => (
                    <th
                      key={header}
                      className="px-5 py-4 text-left text-[9px] font-black uppercase tracking-[0.18em] text-white/25 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <History className="w-8 h-8 text-white/20 mx-auto mb-3 animate-pulse" />
                      <p className="text-sm font-semibold text-white/40">Loading records...</p>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <History className="w-8 h-8 text-white/20 mx-auto mb-3" />
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
                        className="border-b border-white/4 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-orange-600/70" />
                            </div>
                            <div>
                              <p className="text-sm font-bold uppercase tracking-tight italic">
                                {entry.gymName ?? "Unknown Gym"}
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-wider text-white/30 mt-0.5">
                                {entry.gymId ? `Gym #${entry.gymId}` : "Unknown location"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-white/70">
                            <Calendar className="w-3.5 h-3.5 text-white/40" />
                            <span className="text-xs font-semibold whitespace-nowrap">
                              {formatDate(entry.checkInAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-xs font-bold text-white/80">
                              {formatTime(entry.checkInAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {entry.checkOutAt ? (
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-xs font-bold text-white/80">
                                {formatTime(entry.checkOutAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-white/30">--</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {typeof entry.durationSeconds === "number" ? (
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-white/40" />
                              <span className="text-xs font-mono font-bold text-white/70">
                                {formatDuration(entry.durationSeconds)}
                              </span>
                            </div>
                          ) : entry.status === "DENIED" ? (
                            <span className="text-xs text-white/30">N/A</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                              <span className="text-xs text-yellow-500/70">
                                {entry.status === "ACCESS_PENDING" ? "Pending" : "Active"}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border"
                            style={{
                              color: tierConfig.color,
                              borderColor: tierConfig.border,
                              backgroundColor: tierConfig.bg,
                            }}
                          >
                            {tierConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {entry.status === "CHECKED_OUT" ? (
                              <CheckCircle2 className="w-4 h-4" style={{ color: statusConfig.color }} />
                            ) : entry.status === "DENIED" ? (
                              <XCircle className="w-4 h-4" style={{ color: statusConfig.color }} />
                            ) : entry.status === "ACCESS_PENDING" ? (
                              <Clock className="w-4 h-4" style={{ color: statusConfig.color }} />
                            ) : (
                              <ShieldCheck className="w-4 h-4" style={{ color: statusConfig.color }} />
                            )}
                            <div>
                              <span className="text-[10px] font-bold" style={{ color: statusConfig.color }}>
                                {statusConfig.label}
                              </span>
                              {denyReason ? (
                                <p className="text-[9px] text-white/30 mt-0.5">{denyReason}</p>
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
          </div>

          <div className="flex flex-col gap-3 border-t border-white/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-white/35">
              {historyQuery.data
                ? `Showing ${history.length} of ${historyQuery.data.totalItems} records`
                : "Waiting for records"}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                disabled={!historyQuery.data?.hasPrevious}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                Page {(historyQuery.data?.page ?? 0) + 1} / {Math.max(historyQuery.data?.totalPages ?? 1, 1)}
              </span>
              <button
                onClick={() => setPage((currentPage) => currentPage + 1)}
                disabled={!historyQuery.data?.hasNext}
                className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-white/70 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInLogs;
