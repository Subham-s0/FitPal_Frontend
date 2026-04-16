import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Loader2,
  MoreVertical,
  RefreshCcw,
  SlidersHorizontal,
  UserCircle2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import {
  getGymCheckinSettlementsApi,
  getGymDueTimelineApi,
  getGymPayoutBatchesApi,
  getGymSettlementAnalyticsApi,
  reviewGymPayoutSettlementApi,
} from "@/features/admin/admin-settlement.api";
import type {
  GymSettlementPayoutStatus,
  PendingGymSettlementResponse,
  PayoutSettlementResponse,
  PayoutSettlementStatus,
} from "@/features/admin/admin-settlement.model";
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
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";
import { cn } from "@/shared/lib/utils";
import {
  parseYmdLocal,
} from "@/features/admin/settlement-chart-data";

/* ── Constants ────────────────────────────────────────────────────── */
const CHECKIN_PAGE_SIZE = 20;
const BATCH_PAGE_SIZE = 20;

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const MG_TOOLBAR_BASE =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all";
const MG_FILTER_IDLE =
  "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400";
const MG_FILTER_ACTIVE = "bg-orange-500/10 border-orange-500/30 text-orange-400";
const MG_REFRESH =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all table-bg table-border table-text hover:text-white hover:border-white/20 disabled:opacity-50";
const MG_DIALOG_OUTLINE = `${MG_TOOLBAR_BASE} ${MG_FILTER_IDLE}`;
const MG_DIALOG_CLEAR = `${MG_TOOLBAR_BASE} table-border table-bg table-text hover:border-orange-500/30 hover:text-orange-400`;

const CHART_TOOLTIP = {
  contentStyle: { backgroundColor: "#0a0a0a", border: "1px solid #404040", borderRadius: 8, color: "#fafafa", fontSize: 11 },
  itemStyle: { color: "#fafafa" },
  labelStyle: { color: "#a3a3a3", fontSize: 10 },
  wrapperStyle: { outline: "none" },
} as const;

const WEEK_FILLS = ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#fdba74", "#f97316"];
const MONTH_FILLS = ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5", "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412"];

type GymSettlementTab = "checkins" | "batches";
type CheckinFilter = "ALL" | GymSettlementPayoutStatus;
type BatchStatusFilter = "ALL" | PayoutSettlementStatus;
type BatchSortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

type CheckinFiltersState = {
  status: CheckinFilter;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortDir: "ASC" | "DESC";
};

const DEFAULT_CHECKIN_FILTERS: CheckinFiltersState = {
  status: "ALL",
  dateFrom: "",
  dateTo: "",
  sortBy: "visitDate",
  sortDir: "DESC",
};

const DEFAULT_BATCH_FILTERS = { status: "ALL" as BatchStatusFilter };

const BATCH_SORTS: { key: BatchSortKey; label: string }[] = [
  { key: "date-desc", label: "Created (Newest)" },
  { key: "date-asc", label: "Created (Oldest)" },
  { key: "amount-desc", label: "Amount (High)" },
  { key: "amount-asc", label: "Amount (Low)" },
];

/* ── Helpers ──────────────────────────────────────────────────────── */
const formatMoney = (amount: number, currency?: string | null) => {
  const c = currency?.trim() || "NPR";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, maximumFractionDigits: 2 }).format(amount ?? 0);
  } catch {
    return `${c} ${(amount ?? 0).toFixed(2)}`;
  }
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};

const formatInputDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

const resolveMemberImageUrl = (member: PendingGymSettlementResponse | null | undefined) => {
  const resolved = member?.memberProfileImageUrl;
  return typeof resolved === "string" && resolved.trim().length > 0 ? resolved : null;
};

const resolveMemberInitials = (memberName?: string | null, memberEmail?: string | null) => {
  const source = (memberName ?? memberEmail ?? "").trim();
  if (!source) return "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "U";
};

function batchStatusClassName(status: PayoutSettlementStatus) {
  switch (status) {
    case "PAID": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "APPROVED": return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    case "REJECTED":
    case "FAILED": return "border-red-500/30 bg-red-500/10 text-red-200";
    case "CANCELLED": return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "GYM_REVIEW_PENDING": return "border-orange-500/60 bg-orange-500/20 text-orange-100";
    default: return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  }
}

function checkinStatusClassName(status: GymSettlementPayoutStatus) {
  switch (status) {
    case "PAID": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "IN_PAYOUT": return "border-orange-500/60 bg-orange-500/20 text-orange-100";
    default: return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  }
}

function gymBatchLabel(status: PayoutSettlementStatus): string {
  if (status === "PAID") return "RECEIVED";
  return status.replace(/_/g, " ");
}

function gymCheckinLabel(status: GymSettlementPayoutStatus): string {
  if (status === "PAID") return "RECEIVED";
  return status.replace(/_/g, " ");
}

function isInsideRadixPortalSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-radix-popper-content-wrapper]") ||
    target.closest("[data-radix-select-content]") ||
    target.closest("[data-radix-dropdown-menu-content]")
  );
}

/* ── PaginationControls ──────────────────────────────────────────── */
function PaginationControls({
  page, totalPages, totalItems, onPageChange, hasNext, hasPrevious,
}: {
  page: number; totalPages: number; totalItems: number;
  onPageChange: (p: number) => void; hasNext: boolean; hasPrevious: boolean;
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
    <div className="dashboard-mobile-pagination flex items-center justify-between border-t table-border px-4 py-3">
      <p className="text-[12px] table-text-muted">Page {page + 1} of {Math.max(totalPages, 1)} &bull; {totalItems} total</p>
      <div className="dashboard-mobile-pagination-actions flex items-center gap-1.5">
        <Button type="button" variant="outline"
          className="h-8 rounded-full border table-border table-bg px-3.5 text-[11px] table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-50"
          disabled={!hasPrevious} onClick={() => onPageChange(Math.max(page - 1, 0))}>
          Prev
        </Button>
        {pages.map((p, i) =>
          typeof p === "number" ? (
            <Button key={i} type="button" variant={p === page ? "default" : "outline"}
              className={cn("h-8 min-w-[32px] rounded-full px-2 text-[11px] tabular-nums transition-colors",
                p === page ? "border border-orange-500/50 bg-orange-500 text-white" : "border table-border table-bg table-text transition-all hover:border-orange-500/30 hover:text-orange-400")}
              onClick={() => onPageChange(p)}>{(p as number) + 1}</Button>
          ) : (<span key={`e${i}`} className="px-2 text-xs text-zinc-600">{p}</span>),
        )}
        <Button type="button" variant="outline"
          className="h-8 rounded-full border table-border table-bg px-3.5 text-[11px] table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-50"
          disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
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

/* ── Main Component ──────────────────────────────────────────────── */
const GymRevenuePage: FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<GymSettlementTab>("checkins");

  /* Checkin tab state */
  const [checkinPage, setCheckinPage] = useState(0);
  const [checkinFilterDialogOpen, setCheckinFilterDialogOpen] = useState(false);
  const [appliedCheckinFilters, setAppliedCheckinFilters] = useState<CheckinFiltersState>(DEFAULT_CHECKIN_FILTERS);
  const [draftCheckinFilters, setDraftCheckinFilters] = useState<CheckinFiltersState>(DEFAULT_CHECKIN_FILTERS);
  const [checkinChartGranularity, setCheckinChartGranularity] = useState<"week" | "year">("week");

  /* Batch tab state */
  const [batchPage, setBatchPage] = useState(0);
  const [batchStatus, setBatchStatus] = useState<BatchStatusFilter>(DEFAULT_BATCH_FILTERS.status);
  const [draftBatchStatus, setDraftBatchStatus] = useState<BatchStatusFilter>(DEFAULT_BATCH_FILTERS.status);
  const [batchFilterDialogOpen, setBatchFilterDialogOpen] = useState(false);
  const [batchSortIdx, setBatchSortIdx] = useState(0);

  /* Detail / Review dialogs */
  const [batchDetail, setBatchDetail] = useState<PayoutSettlementResponse | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ batch: PayoutSettlementResponse; approved: boolean } | null>(null);

  const reviewMutation = useMutation({
    mutationFn: () => reviewGymPayoutSettlementApi(reviewTarget!.batch.payoutSettlementId, reviewTarget!.approved),
    onSuccess: () => {
      toast.success(reviewTarget!.approved ? "Payout confirmed as received" : "Payout rejected");
      setReviewTarget(null);
      setBatchDetail(null);
      queryClient.invalidateQueries({ queryKey: ["gym-settlement"] });
      queryClient.invalidateQueries({ queryKey: ["gym-payout-batches", "pending-count"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Review failed")),
  });

  /* ── Sync draft/applied helpers ──────────────────────────────── */
  const syncCheckinDraft = useCallback(() => setDraftCheckinFilters(appliedCheckinFilters), [appliedCheckinFilters]);
  useEffect(() => { if (checkinFilterDialogOpen) syncCheckinDraft(); }, [checkinFilterDialogOpen, syncCheckinDraft]);
  const syncBatchDraft = useCallback(() => setDraftBatchStatus(batchStatus), [batchStatus]);
  useEffect(() => { if (batchFilterDialogOpen) syncBatchDraft(); }, [batchFilterDialogOpen, syncBatchDraft]);

  const applyCheckinFilters = () => { setAppliedCheckinFilters(draftCheckinFilters); setCheckinPage(0); setCheckinFilterDialogOpen(false); };
  const resetCheckinFilters = () => { setAppliedCheckinFilters(DEFAULT_CHECKIN_FILTERS); setDraftCheckinFilters(DEFAULT_CHECKIN_FILTERS); setCheckinPage(0); setCheckinFilterDialogOpen(false); };
  const removeCheckinFilter = (key: string) => {
    setAppliedCheckinFilters((prev) => ({ ...prev, [key]: (DEFAULT_CHECKIN_FILTERS as Record<string, unknown>)[key] as string }));
    setCheckinPage(0);
  };

  const applyBatchFilters = () => { setBatchStatus(draftBatchStatus); setBatchPage(0); setBatchFilterDialogOpen(false); };
  const clearBatchFilters = () => { setBatchStatus(DEFAULT_BATCH_FILTERS.status); setDraftBatchStatus(DEFAULT_BATCH_FILTERS.status); setBatchPage(0); setBatchFilterDialogOpen(false); };

  const applyVisitDatePreset = (days: number) => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));

    setAppliedCheckinFilters((prev) => ({
      ...prev,
      dateFrom: formatInputDate(from),
      dateTo: formatInputDate(to),
    }));
    setCheckinPage(0);
  };

  const clearVisitDatePreset = () => {
    setAppliedCheckinFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" }));
    setCheckinPage(0);
  };

  /* ── Filter pills ────────────────────────────────────────────── */
  const checkinPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (appliedCheckinFilters.status !== "ALL") pills.push({ key: "status", label: appliedCheckinFilters.status });
    if (appliedCheckinFilters.dateFrom) pills.push({ key: "dateFrom", label: `From ${appliedCheckinFilters.dateFrom}` });
    if (appliedCheckinFilters.dateTo) pills.push({ key: "dateTo", label: `To ${appliedCheckinFilters.dateTo}` });
    return pills;
  }, [appliedCheckinFilters]);

  const batchPills = useMemo(() => {
    const pills: { key: string; label: string }[] = [];
    if (batchStatus !== "ALL") pills.push({ key: "status", label: batchStatus.replace(/_/g, " ") });
    return pills;
  }, [batchStatus]);

  /* ── Queries ─────────────────────────────────────────────────── */
  const analyticsQ = useQuery({
    queryKey: ["gym-settlement", "analytics"],
    queryFn: getGymSettlementAnalyticsApi,
    staleTime: 30_000,
  });

  const dueTimelineQ = useQuery({
    queryKey: [
      "gym-settlement",
      "due-timeline",
      appliedCheckinFilters.status,
      appliedCheckinFilters.dateFrom,
      appliedCheckinFilters.dateTo,
    ],
    queryFn: () => getGymDueTimelineApi({
      payoutStatus: appliedCheckinFilters.status === "ALL" ? undefined : appliedCheckinFilters.status,
      visitDateFrom: appliedCheckinFilters.dateFrom || undefined,
      visitDateTo: appliedCheckinFilters.dateTo || undefined,
    }),
    staleTime: 30_000,
  });

  const checkinsQ = useQuery({
    queryKey: ["gym-settlement", "checkins", appliedCheckinFilters, checkinPage],
    queryFn: () => getGymCheckinSettlementsApi({
      payoutStatus: appliedCheckinFilters.status === "ALL" ? undefined : appliedCheckinFilters.status,
      visitDateFrom: appliedCheckinFilters.dateFrom || undefined,
      visitDateTo: appliedCheckinFilters.dateTo || undefined,
      sortBy: appliedCheckinFilters.sortBy,
      sortDirection: appliedCheckinFilters.sortDir,
      page: checkinPage,
      size: CHECKIN_PAGE_SIZE,
    }),
    placeholderData: (prev) => prev,
  });

  const batchSortMode = BATCH_SORTS[batchSortIdx] ?? BATCH_SORTS[0];
  const batchesQ = useQuery({
    queryKey: ["gym-settlement", "batches", batchStatus, batchSortIdx, batchPage],
    queryFn: () => {
      const sortKey = batchSortMode.key;
      const sortBy = sortKey === "amount-asc" || sortKey === "amount-desc" ? "grossAmount" : "createdAt";
      const sortDirection = sortKey === "date-asc" || sortKey === "amount-asc" ? "ASC" : "DESC";
      return getGymPayoutBatchesApi({
        status: batchStatus === "ALL" ? undefined : batchStatus,
        sortBy, sortDirection,
        page: batchPage,
        size: BATCH_PAGE_SIZE,
      });
    },
    placeholderData: (prev) => prev,
  });

  /* ── Chart data from analytics ──────────────────────────────── */
  const a = analyticsQ.data;

  const chartBarData = useMemo(() => {
    if (!a) return [];
    if (checkinChartGranularity === "week") {
      return (a.weeklyCheckins ?? []).map((b, i) => {
        const d = new Date(b.date + "T00:00:00");
        const label = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
        return { key: b.date, label, count: b.count, plotCount: b.count === 0 ? 0.2 : b.count, fill: WEEK_FILLS[i % WEEK_FILLS.length] };
      });
    }
    return (a.monthlyCheckins ?? []).map((b, i) => {
      const [y, m] = b.yearMonth.split("-").map(Number);
      const d = new Date(y, (m ?? 1) - 1, 1);
      const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      return { key: b.yearMonth, label, count: b.count, plotCount: b.count === 0 ? 0.2 : b.count, fill: MONTH_FILLS[i % MONTH_FILLS.length] };
    });
  }, [a, checkinChartGranularity]);

  const chartYMax = useMemo(() => {
    if (!chartBarData.length) return 1;
    const plotMax = Math.max(...chartBarData.map((d) => d.plotCount), 0);
    return plotMax <= 0 ? 1 : Math.max(1, Math.ceil(plotMax * 1.15 * 100) / 100);
  }, [chartBarData]);

  const statusPieData = useMemo(() => {
    if (!a) return [];
    const slices = [
      { name: "Pending", value: a.checkinPendingCount, fill: "#94a3b8" },
      { name: "In payout", value: a.checkinInPayoutCount, fill: "#ea580c" },
      { name: "Received", value: a.checkinPaidCount, fill: "#10b981" },
    ];
    const sum = slices.reduce((s, x) => s + x.value, 0);
    if (sum === 0) return [{ name: "No data", value: 1, fill: "#3f3f46" }];
    return slices.filter((s) => s.value > 0);
  }, [a]);

  const allStatusSlices = useMemo(() => [
    { name: "Pending", value: a?.checkinPendingCount ?? 0, fill: "#94a3b8" },
    { name: "In payout", value: a?.checkinInPayoutCount ?? 0, fill: "#ea580c" },
    { name: "Received", value: a?.checkinPaidCount ?? 0, fill: "#10b981" },
  ], [a]);

  const dueTimelineData = useMemo(() => dueTimelineQ.data?.points ?? [], [dueTimelineQ.data?.points]);
  const dueTimelineCurrency = dueTimelineQ.data?.currency ?? a?.currency ?? "NPR";
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

  return (
    <div className="dashboard-mobile-page mx-auto max-w-[1400px] space-y-6 font-['Outfit',system-ui,sans-serif]">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GymSettlementTab)}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:mb-5 sm:items-center">
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Revenue &amp; <span style={fireStyle}>Payouts</span>
          </h1>
          <TabsList className="dashboard-mobile-tablist flex h-auto w-full max-w-full gap-0 overflow-x-auto border-b border-white/10 bg-transparent p-0 px-2 sm:w-fit sm:rounded-full sm:border sm:bg-black/40 sm:p-1 sm:backdrop-blur-sm">
          <TabsTrigger value="checkins"
            className={cn("group relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider",
              "text-slate-400 hover:text-white sm:flex-initial sm:rounded-full sm:px-5 sm:py-2.5 sm:text-[10px]",
              "data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:data-[state=active]:bg-orange-500 sm:data-[state=active]:text-white")}>
            <Wallet className="h-3.5 w-3.5" /> Receivables
          </TabsTrigger>
          <TabsTrigger value="batches"
            className={cn("group relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider",
              "text-slate-400 hover:text-white sm:flex-initial sm:rounded-full sm:px-5 sm:py-2.5 sm:text-[10px]",
              "data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:data-[state=active]:bg-orange-500 sm:data-[state=active]:text-white")}>
            <Banknote className="h-3.5 w-3.5" /> Payout Batches
          </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════ RECEIVABLES TAB ═══════ */}
        <TabsContent value="checkins" className="space-y-4">
          {/* Toolbar */}
          <div className="dashboard-mobile-toolbar flex flex-wrap items-center gap-2">
            <button type="button"
              className={cn(MG_TOOLBAR_BASE, checkinPills.length > 0 ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}
              onClick={() => { syncCheckinDraft(); setCheckinFilterDialogOpen(true); }}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <button type="button" className={cn(MG_TOOLBAR_BASE, MG_FILTER_IDLE)} onClick={() => applyVisitDatePreset(7)}>
              7D
            </button>
            <button type="button" className={cn(MG_TOOLBAR_BASE, MG_FILTER_IDLE)} onClick={() => applyVisitDatePreset(30)}>
              30D
            </button>
            <Dialog open={checkinFilterDialogOpen} onOpenChange={(open) => { setCheckinFilterDialogOpen(open); if (open) syncCheckinDraft(); }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto border table-border table-bg text-white sm:max-w-md"
                onInteractOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}
                onFocusOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}>
                <DialogHeader>
                  <DialogTitle className="text-white">Receivable filters</DialogTitle>
                  <DialogDescription className="table-text-muted">Apply to update the table below.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pt-2">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Payout status</p>
                    <Select value={draftCheckinFilters.status} onValueChange={(v) => setDraftCheckinFilters((d) => ({ ...d, status: v as CheckinFilter }))}>
                      <SelectTrigger className="h-9 border table-border table-bg text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="border table-border table-bg-alt text-white">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                        <SelectItem value="IN_PAYOUT">IN_PAYOUT</SelectItem>
                        <SelectItem value="PAID">RECEIVED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Visit from</p>
                      <CustomDatePicker nestedInDialog value={draftCheckinFilters.dateFrom}
                        onChange={(v) => setDraftCheckinFilters((d) => ({ ...d, dateFrom: v }))}
                        placeholder="Start date" className="!border table-border table-bg shadow-none hover:border-orange-500/30" />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Visit to</p>
                      <CustomDatePicker nestedInDialog value={draftCheckinFilters.dateTo}
                        onChange={(v) => setDraftCheckinFilters((d) => ({ ...d, dateTo: v }))}
                        placeholder="End date" className="!border table-border table-bg shadow-none hover:border-orange-500/30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Sort by</p>
                      <Select value={draftCheckinFilters.sortBy} onValueChange={(v) => setDraftCheckinFilters((d) => ({ ...d, sortBy: v }))}>
                        <SelectTrigger className="h-9 border table-border table-bg text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="border table-border table-bg-alt text-white">
                          <SelectItem value="visitDate">Visit Date</SelectItem>
                          <SelectItem value="checkedInAt">Member Check-in Time</SelectItem>
                          <SelectItem value="createdAt">Settlement Created</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-[10px] text-zinc-500">
                        Member Check-in Time uses the actual check-in timestamp. Settlement Created uses when this settlement row was created.
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Direction</p>
                      <Select value={draftCheckinFilters.sortDir} onValueChange={(v) => setDraftCheckinFilters((d) => ({ ...d, sortDir: v as "ASC" | "DESC" }))}>
                        <SelectTrigger className="h-9 border table-border table-bg text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="border table-border table-bg-alt text-white">
                          <SelectItem value="DESC">Newest first</SelectItem>
                          <SelectItem value="ASC">Oldest first</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button" className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400"
                      onClick={applyCheckinFilters}>Apply filters</button>
                    <button type="button" className={MG_DIALOG_OUTLINE} onClick={() => setDraftCheckinFilters(DEFAULT_CHECKIN_FILTERS)}>Reset draft</button>
                    <button type="button" className={MG_DIALOG_CLEAR} onClick={resetCheckinFilters}>Clear all</button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {checkinPills.length === 0 ? (
                <span className="text-[11px] text-zinc-600"><Filter className="mr-1 inline h-3 w-3" />No active filters</span>
              ) : (
                checkinPills.map((pill) => (
                  <Badge key={`${pill.key}-${pill.label}`} variant="outline"
                    className="gap-1 border-orange-500/30 bg-orange-500/10 pl-2 pr-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-100">
                    {pill.label}
                    <button type="button" className="rounded p-0.5 text-orange-200 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
                      onClick={() => removeCheckinFilter(pill.key)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))
              )}
            </div>

            <button type="button" className={cn(MG_TOOLBAR_BASE, MG_FILTER_IDLE)} onClick={clearVisitDatePreset}>
              Clear Dates
            </button>

            <button type="button" className={MG_REFRESH} onClick={() => { setCheckinPage(0); checkinsQ.refetch(); analyticsQ.refetch(); dueTimelineQ.refetch(); }}>
              {checkinsQ.isFetching || analyticsQ.isFetching || dueTimelineQ.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          {/* ── Cards with Pie Chart ──────────────────────────────────────── */}
          <div className="dashboard-mobile-scroll-rail grid grid-flow-col auto-cols-[minmax(160px,1fr)] gap-3 overflow-x-auto pb-1">
            <div className="flex flex-col rounded-xl border table-border table-bg p-3">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Settlement Revenue</span>
                <Wallet className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-[18px] font-black leading-tight text-white">
                  {analyticsQ.isLoading ? "—" : a ? formatMoney(a.grossSum, a.currency) : "—"}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {a ? `${a.totalCheckinSettlements} settlements` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400">Pending Amount</span>
                <Banknote className="h-3.5 w-3.5 shrink-0 text-orange-400" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-[18px] font-black leading-tight text-white">
                  {analyticsQ.isLoading
                    ? "—"
                    : a
                    ? formatMoney(a.pendingAmount, a.currency)
                    : "—"}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {a ? `${a.checkinPendingCount} pending settlements` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-orange-500/50 bg-orange-500/[0.14] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-300">In Payout</span>
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-orange-300" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-[18px] font-black leading-tight text-white">
                  {analyticsQ.isLoading ? "—" : a ? formatMoney(a.inPayoutAmount, a.currency) : "—"}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {a ? `${a.checkinInPayoutCount} in-payout settlements` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400/90">Received</span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              </div>
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-[18px] font-black leading-tight text-white">
                  {analyticsQ.isLoading ? "—" : a ? formatMoney(a.receivedAmount, a.currency) : "—"}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {a ? `${a.receivedCount} batch${a.receivedCount !== 1 ? "es" : ""}` : ""}
                </p>
              </div>
            </div>

            {/* Pie chart card replacing Collection Rate card */}
            <div className="flex flex-col rounded-xl border border-slate-500/20 bg-slate-500/[0.06] p-3">
              <div className="mb-1 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status mix</span>
              </div>
              {analyticsQ.isLoading ? (
                <div className="flex flex-1 items-center justify-center text-sm table-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : !a ? (
                <p className="flex-1 text-center text-[10px] table-text-muted">No data</p>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-[72px] w-[72px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={30} innerRadius={16} strokeWidth={0} isAnimationActive={false}>
                          {statusPieData.map((entry, i) => (<Cell key={`p-${i}`} fill={entry.fill} />))}
                        </Pie>
                        <Tooltip {...CHART_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {allStatusSlices.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.fill }} />
                        <span className="text-zinc-400">{s.name}</span>
                        <span className="ml-auto tabular-nums text-white">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Charts Row: Due Timeline & Check-ins 50/50 ─────────────────── */}
          <div className="grid gap-3 lg:grid-cols-2">
            {/* Due Timeline */}
            <div className="rounded-xl border table-border table-bg p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Due timeline</span>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-wider text-orange-400">Total due</p>
                  <p className="font-mono text-[12px] font-bold text-white">{formatMoney(dueTimelineTotalDue, dueTimelineCurrency)}</p>
                </div>
              </div>
              {dueTimelineQ.isLoading ? (
                <div className="flex h-[156px] items-center justify-center gap-2 text-sm table-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading due timeline...
                </div>
              ) : dueTimelineQ.isError ? (
                <p className="py-4 text-sm text-red-300">{getApiErrorMessage(dueTimelineQ.error, "Due timeline failed")}</p>
              ) : dueTimelineData.length === 0 ? (
                <div className="flex h-[156px] items-center justify-center text-sm table-text-muted">
                  No pending settlements.
                </div>
              ) : (
                <div className="h-[156px] w-full">
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
                      <Bar dataKey="checkinAmount" name="Check-in settlements" fill="#f97316" isAnimationActive={false} />
                      <Line
                        type="monotone"
                        dataKey="dueAmount"
                        name="Total due"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Check-ins Chart */}
            <div className="rounded-xl border table-border table-bg p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Check-ins</span>
                <div className="flex gap-[3px] rounded-full border border-white/10 bg-white/[0.02] p-[3px]">
                  {(["week", "year"] as const).map((gran) => (
                    <button
                      key={gran}
                      type="button"
                      onClick={() => setCheckinChartGranularity(gran)}
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] font-bold",
                        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        "transform-gpu will-change-transform",
                        checkinChartGranularity === gran
                          ? "bg-orange-500 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
                      )}
                    >
                      {gran === "week" ? "Last 7 days" : "Last 12 months"}
                    </button>
                  ))}
                </div>
              </div>
              {analyticsQ.isLoading ? (
                <div className="flex h-[156px] items-center justify-center gap-2 text-sm table-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : analyticsQ.isError ? (
                <p className="py-4 text-sm text-red-300">{getApiErrorMessage(analyticsQ.error, "Chart failed")}</p>
              ) : (
                <div className="h-[156px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartBarData} margin={{ top: 2, right: 4, left: -8, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 8 }} axisLine={false} tickLine={false} interval={0} height={32} />
                      <YAxis domain={[0, chartYMax]} tick={{ fill: "#737373", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                      <Tooltip {...CHART_TOOLTIP} formatter={(_v: number, _n: string, payload: { payload?: { count?: number } }) => [payload?.payload?.count ?? 0, "Check-ins"]} />
                      <Bar dataKey="plotCount" radius={[4, 4, 0, 0]} minPointSize={2} isAnimationActive={false}>
                        {chartBarData.map((entry, i) => (<Cell key={`c-${entry.key}-${i}`} fill={entry.fill} />))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* ── Receivables Table ──────────────────────────────── */}
          <div className="overflow-hidden rounded-[18px] border table-border table-bg">
            {checkinsQ.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-12 text-sm table-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading receivables...</div>
            ) : checkinsQ.isError ? (
              <p className="px-4 py-6 text-sm text-red-300">{getApiErrorMessage(checkinsQ.error, "Failed to load receivables")}</p>
            ) : (
              <>
                <div className="dashboard-mobile-table-scroll overflow-x-auto">
                  <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                    <thead>
                      <tr className="table-header-bg border-b table-border">
                        <th className="w-[6%] px-3 py-3 pl-4 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">#</th>
                        <th className="w-[22%] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Member</th>
                        <th className="w-[12%] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Visit date</th>
                        <th className="w-[13%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Gross</th>
                        <th className="w-[13%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Service Fee</th>
                        <th className="w-[13%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Net</th>
                        <th className="w-[13%] px-3 py-3 pr-4 text-center text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] font-semibold text-zinc-200">
                      {(checkinsQ.data?.items ?? []).length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center table-text-muted">No receivables found for current filters.</td></tr>
                      ) : (
                        (checkinsQ.data?.items ?? []).map((row) => (
                          <tr key={row.checkInSettlementId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                            <td className="px-3 py-3 pl-4 font-mono text-[11px] table-text-muted">#{row.checkInSettlementId}</td>
                            <td className="max-w-0 px-3 py-3 text-white">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7 border border-white/10">
                                  <AvatarImage
                                    src={resolveMemberImageUrl(row)}
                                    alt={row.memberName ?? row.memberEmail ?? "Member"}
                                  />
                                  <AvatarFallback className="bg-zinc-800 text-[10px] font-bold text-zinc-200">
                                    {row.memberName || row.memberEmail ? (
                                      resolveMemberInitials(row.memberName, row.memberEmail)
                                    ) : (
                                      <UserCircle2 className="h-4 w-4 text-zinc-400" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="block truncate" title={row.memberName ?? row.memberEmail ?? undefined}>
                                  {row.memberName || row.memberEmail || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-[11px] table-text-muted">{formatDate(row.visitDate)}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-white">{formatMoney(row.grossAmount, row.currency)}</td>
                            <td className="px-3 py-3 text-right tabular-nums table-text-muted">{formatMoney(row.commissionAmount, row.currency)}</td>
                            <td className="px-3 py-3 text-right text-[13px] font-bold tabular-nums text-emerald-300">{formatMoney(row.netAmount, row.currency)}</td>
                            <td className="px-3 py-3 pr-4 text-center">
                              <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${checkinStatusClassName(row.payoutStatus)}`}>
                                {gymCheckinLabel(row.payoutStatus)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationControls page={checkinsQ.data?.page ?? 0} totalPages={checkinsQ.data?.totalPages ?? 1}
                  totalItems={checkinsQ.data?.totalItems ?? 0} onPageChange={setCheckinPage}
                  hasNext={checkinsQ.data?.hasNext ?? false} hasPrevious={checkinsQ.data?.hasPrevious ?? false} />
              </>
            )}
          </div>
        </TabsContent>

        {/* ═══════ BATCHES TAB ═══════ */}
        <TabsContent value="batches" className="space-y-4">
          <div className="dashboard-mobile-toolbar flex flex-wrap items-center gap-2">
            <button type="button"
              className={cn(MG_TOOLBAR_BASE, batchPills.length > 0 ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}
              onClick={() => { syncBatchDraft(); setBatchFilterDialogOpen(true); }}>
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <Dialog open={batchFilterDialogOpen} onOpenChange={(open) => { setBatchFilterDialogOpen(open); if (open) syncBatchDraft(); }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto border table-border table-bg text-white sm:max-w-sm"
                onInteractOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}
                onFocusOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}>
                <DialogHeader>
                  <DialogTitle className="text-white">Batch filters</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 pt-2">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Status</p>
                    <Select value={draftBatchStatus} onValueChange={(v) => setDraftBatchStatus(v as BatchStatusFilter)}>
                      <SelectTrigger className="h-9 border table-border table-bg text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="border table-border table-bg-alt text-white">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="APPROVED">APPROVED</SelectItem>
                        <SelectItem value="GYM_REVIEW_PENDING">GYM REVIEW PENDING</SelectItem>
                        <SelectItem value="PAID">RECEIVED</SelectItem>
                        <SelectItem value="REJECTED">REJECTED</SelectItem>
                        <SelectItem value="FAILED">FAILED</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button" className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400"
                      onClick={applyBatchFilters}>Apply</button>
                    <button type="button" className={MG_DIALOG_CLEAR} onClick={clearBatchFilters}>Clear all</button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {batchPills.length === 0 ? (
                <span className="text-[11px] text-zinc-600"><Filter className="mr-1 inline h-3 w-3" />No active filters</span>
              ) : (
                batchPills.map((pill) => (
                  <Badge key={pill.key} variant="outline"
                    className="gap-1 border-orange-500/30 bg-orange-500/10 pl-2 pr-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-100">
                    {pill.label}
                    <button type="button" className="rounded p-0.5 text-orange-200 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
                      onClick={() => { setBatchStatus("ALL"); setBatchPage(0); }}><X className="h-3 w-3" /></button>
                  </Badge>
                ))
              )}
            </div>

            <Select
              value={batchSortMode.key}
              onValueChange={(v) => {
                const idx = BATCH_SORTS.findIndex((s) => s.key === v);
                if (idx >= 0) {
                  setBatchSortIdx(idx);
                  setBatchPage(0);
                }
              }}
            >
              <SelectTrigger className="h-9 w-[168px] rounded-full border table-border table-bg px-3 text-[11px] font-bold text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border table-border table-bg-alt text-white">
                {BATCH_SORTS.map((sort) => (
                  <SelectItem key={sort.key} value={sort.key}>
                    {sort.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button type="button" className={MG_REFRESH} onClick={() => { setBatchPage(0); batchesQ.refetch(); }}>
              {batchesQ.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          {/* ── Batches Table ──────────────────────────────────── */}
          <div className="overflow-hidden rounded-[18px] border table-border table-bg">
            {batchesQ.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-12 text-sm table-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading payout batches...</div>
            ) : batchesQ.isError ? (
              <p className="px-4 py-6 text-sm text-red-300">{getApiErrorMessage(batchesQ.error, "Failed to load batches")}</p>
            ) : (
              <>
                <div className="dashboard-mobile-table-scroll overflow-x-auto">
                  <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
                    <thead>
                      <tr className="table-header-bg border-b table-border">
                        <th className="w-[5%] px-3 py-3 pl-4 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Batch</th>
                        <th className="w-[10%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Net Amount</th>
                        <th className="w-[8%] px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Settlements</th>
                        <th className="w-[12%] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Created</th>
                        <th className="w-[12%] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Paid by</th>
                        <th className="w-[12%] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Paid at</th>
                        <th className="w-[7%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Proof</th>
                        <th className="w-[14%] px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Status</th>
                        <th className="w-[12%] px-3 py-3 pr-4 text-center text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] font-semibold text-zinc-200">
                      {(batchesQ.data?.items ?? []).length === 0 ? (
                        <tr><td colSpan={9} className="py-12 text-center table-text-muted">No payout batches found for current filters.</td></tr>
                      ) : (
                        (batchesQ.data?.items ?? []).map((batch) => (
                          <tr key={batch.payoutSettlementId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                            <td className="px-3 py-3 pl-4 font-mono text-[11px] table-text-muted">#{batch.payoutSettlementId}</td>
                            <td className="px-3 py-3 text-right text-[13px] font-bold tabular-nums text-emerald-300">{formatMoney(batch.netAmount, batch.currency)}</td>
                            <td className="px-3 py-3 text-right tabular-nums">{batch.settlementCount}</td>
                            <td className="px-3 py-3 text-[11px] table-text-muted">{formatDateTime(batch.createdAt)}</td>
                            <td className="max-w-0 px-3 py-3 text-[11px] text-zinc-400"><span className="block truncate">{batch.paidByName || "—"}</span></td>
                            <td className="px-3 py-3 text-[11px] table-text-muted">{formatDateTime(batch.paidAt)}</td>
                            <td className="px-3 py-3 text-center">
                              {batch.proofUrl ? (
                                <button onClick={() => setProofUrl(batch.proofUrl)}
                                  className="text-orange-300 underline decoration-orange-500/40 underline-offset-2 hover:text-orange-200">View</button>
                              ) : (<span className="text-[10px] text-zinc-600">—</span>)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${batchStatusClassName(batch.status)}`}>
                                {gymBatchLabel(batch.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 pr-4 text-center">
                              <div className="flex items-center justify-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="rounded p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                                      aria-label={`Actions for batch #${batch.payoutSettlementId}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-44 border table-border table-bg-alt text-white">
                                    <DropdownMenuItem
                                      className="cursor-pointer focus:bg-white/10 focus:text-white"
                                      onClick={() => setBatchDetail(batch)}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      View
                                    </DropdownMenuItem>
                                    {batch.status === "GYM_REVIEW_PENDING" && (
                                      <>
                                        <DropdownMenuSeparator className="bg-white/10" />
                                        <DropdownMenuItem
                                          className="cursor-pointer text-emerald-300 focus:bg-emerald-500/10 focus:text-emerald-200"
                                          onClick={() => setReviewTarget({ batch, approved: true })}
                                        >
                                          <CheckCircle2 className="mr-2 h-4 w-4" />
                                          Approve
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                                          onClick={() => setReviewTarget({ batch, approved: false })}
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Reject
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <PaginationControls page={batchesQ.data?.page ?? 0} totalPages={batchesQ.data?.totalPages ?? 1}
                  totalItems={batchesQ.data?.totalItems ?? 0} onPageChange={setBatchPage}
                  hasNext={batchesQ.data?.hasNext ?? false} hasPrevious={batchesQ.data?.hasPrevious ?? false} />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Batch Detail Dialog ─────────────────────────────────── */}
      <Dialog open={!!batchDetail} onOpenChange={(o) => { if (!o) setBatchDetail(null); }}>
        <DialogContent className="max-w-lg border-zinc-700/50 bg-zinc-900 text-white sm:rounded-2xl"
          onPointerDownOutside={(e) => { if (isInsideRadixPortalSurface(e.target)) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Payout #{batchDetail?.payoutSettlementId}</DialogTitle>
          </DialogHeader>
          {batchDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailRow label="Status" value={gymBatchLabel(batchDetail.status)} />
                <DetailRow label="Net amount" value={formatMoney(batchDetail.netAmount, batchDetail.currency)} />
                <DetailRow label="Gross amount" value={formatMoney(batchDetail.grossAmount, batchDetail.currency)} />
                <DetailRow label="Service Fee" value={formatMoney(batchDetail.commissionAmount, batchDetail.currency)} />
                <DetailRow label="Settlements" value={String(batchDetail.settlementCount)} />
                <DetailRow label="Created" value={formatDateTime(batchDetail.createdAt)} />
                <DetailRow label="Created by" value={batchDetail.createdByName ?? "—"} />
                <DetailRow label="Paid at" value={formatDateTime(batchDetail.paidAt)} />
                <DetailRow label="Paid by" value={batchDetail.paidByName ?? "—"} />
                <DetailRow label="Reviewed" value={formatDateTime(batchDetail.gymReviewedAt)} />
                <DetailRow label="Reference" value={batchDetail.transactionReference ?? "—"} />
                <DetailRow label="Wallet" value={batchDetail.walletIdentifierSnapshot || "—"} />
                {batchDetail.note && <div className="col-span-2"><DetailRow label="Note" value={batchDetail.note} /></div>}
              </div>
              {batchDetail.proofUrl && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Proof</p>
                  <a href={batchDetail.proofUrl} target="_blank" rel="noopener noreferrer">
                    <img src={batchDetail.proofUrl} alt={`Payment proof for batch ${batchDetail.payoutSettlementId}`} className="max-h-48 rounded-lg border border-zinc-700/50 object-contain" />
                  </a>
                </div>
              )}
              {batchDetail.status === "GYM_REVIEW_PENDING" && (
                <div className="flex justify-end gap-2 border-t border-zinc-800 pt-3">
                  <Button size="sm" variant="outline" onClick={() => setReviewTarget({ batch: batchDetail, approved: false })}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">Reject</Button>
                  <Button size="sm" onClick={() => setReviewTarget({ batch: batchDetail, approved: true })}
                    className="bg-emerald-600 text-white hover:bg-emerald-500">Confirm received</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Proof Preview Dialog ────────────────────────────────── */}
      <Dialog open={!!proofUrl} onOpenChange={(o) => { if (!o) setProofUrl(null); }}>
        <DialogContent className="max-w-sm border-zinc-700/50 bg-zinc-900 p-4 text-white sm:rounded-2xl">
          <DialogHeader><DialogTitle className="text-sm font-bold">Payment proof</DialogTitle></DialogHeader>
          {proofUrl && <img src={proofUrl} alt="Payment proof preview" className="w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>

      {/* ── Approve / Reject AlertDialog ────────────────────────── */}
      <AlertDialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) setReviewTarget(null); }}>
        <AlertDialogContent className="border-zinc-700/50 bg-zinc-900 text-white sm:rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewTarget?.approved ? "Confirm receipt" : "Reject payout"} — Batch #{reviewTarget?.batch.payoutSettlementId}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {reviewTarget?.approved
                ? `You are confirming that you received ${formatMoney(reviewTarget.batch.netAmount, reviewTarget.batch.currency)}. This action cannot be undone.`
                : `You are rejecting this payout of ${formatMoney(reviewTarget?.batch.netAmount ?? 0, reviewTarget?.batch.currency)}. The admin will be notified.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 text-zinc-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={reviewMutation.isPending}
              onClick={(e) => { e.preventDefault(); reviewMutation.mutate(); }}
              className={reviewTarget?.approved ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-red-600 text-white hover:bg-red-500"}>
              {reviewMutation.isPending
                ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Processing...</>
                : reviewTarget?.approved ? "Yes, confirm received" : "Reject payout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GymRevenuePage;
