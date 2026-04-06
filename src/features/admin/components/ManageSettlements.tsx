import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpDown,
  Banknote,
  ClipboardList,
  Clock3,
  Filter,
  Layers,
  LayoutList,
  Loader2,
  RefreshCcw,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  createAdminPayoutSettlementApi,
  getAdminPendingSettlementsApi,
  getAdminPayoutBatchesApi,
} from "@/features/admin/admin-settlement.api";
import type {
  CreatePayoutSettlementRequest,
  GymSettlementPayoutStatus,
  PayoutSettlementStatus,
} from "@/features/admin/admin-settlement.model";
import {
  buildSettlementMetrics,
  fetchSettlementsForAggregate,
} from "@/features/admin/settlement-aggregate";
import {
  buildTwelveMonthCheckInBars,
  buildWeekCheckInBars,
  defaultMonthEndYm,
  defaultWeekEndYmd,
} from "@/features/admin/settlement-chart-data";
import { AdminGymCombobox } from "@/features/admin/components/AdminGymCombobox";
import { getAdminGymReviewApi, getAdminGymsApi } from "@/features/admin/admin-gym.api";
import { getApiErrorMessage } from "@/shared/api/client";
import { CheckIcon } from "@/features/profile/components/ProfileSetupShell";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Textarea } from "@/shared/ui/textarea";
import { CustomDatePicker } from "@/shared/ui/CustomDatePicker";

const CHECKIN_PAGE_SIZE = 20;
const BATCH_PAGE_SIZE = 20;

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

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

/** Match ManageGyms toolbar: filter idle/active, refresh white hover, outline orange hover. */
const MG_TOOLBAR_BASE =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all";
const MG_FILTER_IDLE = "table-bg table-border table-text hover:border-orange-500/30 hover:text-orange-400";
const MG_FILTER_ACTIVE = "bg-orange-500/10 border-orange-500/30 text-orange-400";
const MG_REFRESH =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all table-bg table-border table-text hover:text-white hover:border-white/20 disabled:opacity-50";
const MG_DIALOG_OUTLINE = `${MG_TOOLBAR_BASE} ${MG_FILTER_IDLE}`;
const MG_DIALOG_CLEAR = `${MG_TOOLBAR_BASE} table-border table-bg table-text hover:border-orange-500/30 hover:text-orange-400`;

type AdminSettlementTab = "checkins" | "batches";
type PayoutFilter = "ALL" | GymSettlementPayoutStatus;
type BatchStatusFilter = "ALL" | PayoutSettlementStatus;
type BatchSortKey = null | "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

type CheckinSortBy = "visitDate" | "createdAt" | "checkedInAt" | "gym.gymName" | "account.email";

type CheckinFiltersState = {
  gymId: string;
  accountId: string;
  status: PayoutFilter;
  dateFrom: string;
  dateTo: string;
  sortBy: CheckinSortBy;
  sortDir: "ASC" | "DESC";
};

const DEFAULT_CHECKIN_FILTERS: CheckinFiltersState = {
  gymId: "ALL",
  accountId: "",
  status: "ALL",
  dateFrom: "",
  dateTo: "",
  sortBy: "visitDate",
  sortDir: "DESC",
};

const DEFAULT_BATCH_FILTERS = {
  gymId: "ALL",
  status: "ALL" as BatchStatusFilter,
};

const BATCH_SORTS: { key: BatchSortKey; label: string; Icon: typeof ArrowUpDown }[] = [
  { key: null, label: "Sort", Icon: ArrowUpDown },
  { key: "date-desc", label: "Date (Newest)", Icon: ArrowUpDown },
  { key: "date-asc", label: "Date (Oldest)", Icon: ArrowUpDown },
  { key: "amount-desc", label: "Amount (High)", Icon: ArrowUpDown },
  { key: "amount-asc", label: "Amount (Low)", Icon: ArrowUpDown },
];

function formatMoney(amount: number, currency?: string | null) {
  const normalizedCurrency = currency?.trim() || "NPR";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `${normalizedCurrency} ${(amount ?? 0).toFixed(2)}`;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function parseNumericId(value: string): number | undefined {
  if (!value || value === "ALL") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

/** Popover/Select/DropdownMenu render in a portal; Dialog otherwise treats them as "outside" and blocks or closes. */
function isInsideRadixPortalSurface(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!(
    target.closest("[data-radix-popper-content-wrapper]") ||
    target.closest("[data-radix-select-content]") ||
    target.closest("[data-radix-dropdown-menu-content]")
  );
}

function checkinStatusClassName(status: GymSettlementPayoutStatus) {
  switch (status) {
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "IN_PAYOUT":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  }
}

function batchStatusClassName(status: PayoutSettlementStatus) {
  switch (status) {
    case "PAID":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
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

function sortByLabel(field: CheckinSortBy): string {
  switch (field) {
    case "visitDate":
      return "Visit date";
    case "createdAt":
      return "Created";
    case "checkedInAt":
      return "Check-in time";
    case "gym.gymName":
      return "Gym name";
    case "account.email":
      return "Member email";
    default:
      return field;
  }
}

function SettlementAdminStepStrip({ stepIndex, steps }: { stepIndex: 0 | 1; steps: readonly [string, string] }) {
  return (
    <div className="mb-5 w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-md items-start justify-between px-2 pb-6 pt-1">
        {steps.map((label, index) => {
          const done = index < stepIndex;
          const active = index === stepIndex;
          const connectorOffset = active ? "calc(50% + 21px)" : "calc(50% + 17px)";
          const connectorTop = active ? "21px" : "17px";
          const connectorWidth = active ? "calc(100% - 42px)" : "calc(100% - 34px)";

          return (
            <div key={label} className="relative flex min-w-[100px] flex-1 flex-col items-center">
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full font-bold transition-all duration-300",
                  done
                    ? "h-[34px] w-[34px] border-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-orange-600 text-xs text-white"
                    : active
                      ? "h-[42px] w-[42px] bg-orange-600 text-[15px] text-black shadow-[0_0_20px_rgba(234,88,12,0.3)]"
                      : "h-[34px] w-[34px] border border-white/15 bg-[#1a1a1a] text-xs text-zinc-600",
                )}
              >
                {done ? <CheckIcon /> : index + 1}
              </div>
              <span
                className={cn(
                  "absolute top-full z-10 mt-1.5 whitespace-nowrap text-center text-[9px] font-bold uppercase tracking-[0.06em]",
                  active ? "text-orange-400" : "text-zinc-600",
                )}
              >
                {label}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute z-0 h-0.5 min-w-[40px] transition-colors duration-300",
                    done ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-white/10",
                  )}
                  style={{
                    left: connectorOffset,
                    top: connectorTop,
                    width: connectorWidth,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const pages = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(Math.max(1, totalPages) - 1, page + 2);

  if (start > 0) pages.push(0);
  if (start > 1) pages.push("...");

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 2) pages.push("...");
  if (end < totalPages - 1) pages.push(totalPages - 1);

  return (
    <div className="flex items-center justify-between border-t table-border px-4 py-3">
      <p className="text-[12px] table-text-muted">
        Page {page + 1} of {Math.max(totalPages, 1)} • {totalItems} total
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

export default function ManageSettlements() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminSettlementTab>("checkins");
  const [checkinFilterDialogOpen, setCheckinFilterDialogOpen] = useState(false);
  const [appliedCheckinFilters, setAppliedCheckinFilters] = useState<CheckinFiltersState>(DEFAULT_CHECKIN_FILTERS);
  const [draftCheckinFilters, setDraftCheckinFilters] = useState<CheckinFiltersState>(DEFAULT_CHECKIN_FILTERS);
  const [checkinPage, setCheckinPage] = useState(0);
  const [selectedSettlementIds, setSelectedSettlementIds] = useState<Set<number>>(new Set());

  const [batchGymId, setBatchGymId] = useState(DEFAULT_BATCH_FILTERS.gymId);
  const [batchStatus, setBatchStatus] = useState<BatchStatusFilter>(DEFAULT_BATCH_FILTERS.status);
  const [draftBatchGymId, setDraftBatchGymId] = useState(DEFAULT_BATCH_FILTERS.gymId);
  const [draftBatchStatus, setDraftBatchStatus] = useState<BatchStatusFilter>(DEFAULT_BATCH_FILTERS.status);
  const [batchFilterDialogOpen, setBatchFilterDialogOpen] = useState(false);
  const [batchPage, setBatchPage] = useState(0);
  const [batchSortIdx, setBatchSortIdx] = useState(0);

  const [payoutWizardOpen, setPayoutWizardOpen] = useState(false);
  const [payoutWizardStep, setPayoutWizardStep] = useState<0 | 1>(0);
  const [createGymId, setCreateGymId] = useState<number | null>(null);
  const [createPayoutAccountId, setCreatePayoutAccountId] = useState("");
  const [createCurrency, setCreateCurrency] = useState("NPR");
  const [createNote, setCreateNote] = useState("");
  const [createDateFrom, setCreateDateFrom] = useState("");
  const [createDateTo, setCreateDateTo] = useState("");

  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState<string | null>(null);

  const [checkinChartGranularity, setCheckinChartGranularity] = useState<"week" | "year">("week");

  const gymFilteredId = parseNumericId(appliedCheckinFilters.gymId);
  const showRowCheckboxes = gymFilteredId != null;

  const syncDraftFromApplied = useCallback(() => {
    setDraftCheckinFilters(appliedCheckinFilters);
  }, [appliedCheckinFilters]);

  useEffect(() => {
    if (checkinFilterDialogOpen) {
      syncDraftFromApplied();
    }
  }, [checkinFilterDialogOpen, syncDraftFromApplied]);

  const syncBatchDraftFromApplied = useCallback(() => {
    setDraftBatchGymId(batchGymId);
    setDraftBatchStatus(batchStatus);
  }, [batchGymId, batchStatus]);

  useEffect(() => {
    if (batchFilterDialogOpen) {
      syncBatchDraftFromApplied();
    }
  }, [batchFilterDialogOpen, syncBatchDraftFromApplied]);

  useEffect(() => {
    if (!showRowCheckboxes) {
      setSelectedSettlementIds(new Set());
    }
  }, [showRowCheckboxes]);

  const gymsQ = useQuery({
    queryKey: ["admin-settlements", "gyms"],
    queryFn: async () => {
      const items: { gymId: number; gymName: string | null }[] = [];
      let page = 0;
      const size = 100;

      while (page < 30) {
        const response = await getAdminGymsApi({
          approvalStatus: "APPROVED",
          page,
          size,
          sortBy: "gymName",
          sortDirection: "ASC",
        });
        for (const gym of response.items) {
          items.push({ gymId: gym.gymId, gymName: gym.gymName });
        }
        if (!response.hasNext) {
          break;
        }
        page += 1;
      }

      return items;
    },
    staleTime: 60_000,
  });

  const aggregateQ = useQuery({
    queryKey: [
      "admin-settlements",
      "aggregate",
      appliedCheckinFilters.gymId,
      appliedCheckinFilters.accountId,
      appliedCheckinFilters.status,
      appliedCheckinFilters.dateFrom,
      appliedCheckinFilters.dateTo,
      appliedCheckinFilters.sortBy,
      appliedCheckinFilters.sortDir,
    ],
    queryFn: async () => {
      const dateFromStr = appliedCheckinFilters.dateFrom.trim();
      const dateToStr = appliedCheckinFilters.dateTo.trim();

      const raw = await fetchSettlementsForAggregate({
        gymId: parseNumericId(appliedCheckinFilters.gymId),
        accountId: parseNumericId(appliedCheckinFilters.accountId),
        payoutStatus: appliedCheckinFilters.status === "ALL" ? undefined : appliedCheckinFilters.status,
        visitDateFrom: dateFromStr || undefined,
        visitDateTo: dateToStr || undefined,
        sortBy: appliedCheckinFilters.sortBy,
        sortDirection: appliedCheckinFilters.sortDir,
      });
      return {
        ...raw,
        metrics: buildSettlementMetrics(raw.items, raw.totalItems, raw.capped),
      };
    },
    staleTime: 30_000,
  });

  const pendingQ = useQuery({
    queryKey: [
      "admin-settlements",
      "pending",
      appliedCheckinFilters.gymId,
      appliedCheckinFilters.accountId,
      appliedCheckinFilters.status,
      appliedCheckinFilters.dateFrom,
      appliedCheckinFilters.dateTo,
      appliedCheckinFilters.sortBy,
      appliedCheckinFilters.sortDir,
      checkinPage,
    ],
    queryFn: () => {
      const dateFromStr = appliedCheckinFilters.dateFrom.trim();
      const dateToStr = appliedCheckinFilters.dateTo.trim();

      return getAdminPendingSettlementsApi({
        gymId: parseNumericId(appliedCheckinFilters.gymId),
        accountId: parseNumericId(appliedCheckinFilters.accountId),
        payoutStatus: appliedCheckinFilters.status === "ALL" ? undefined : appliedCheckinFilters.status,
        visitDateFrom: dateFromStr || undefined,
        visitDateTo: dateToStr || undefined,
        sortBy: appliedCheckinFilters.sortBy,
        sortDirection: appliedCheckinFilters.sortDir,
        page: checkinPage,
        size: CHECKIN_PAGE_SIZE,
      });
    },
    placeholderData: (previous) => previous,
  });

  const batchesQ = useQuery({
    queryKey: ["admin-settlements", "batches", batchGymId, batchStatus, batchSortIdx, batchPage],
    queryFn: () => {
      const sortKey = BATCH_SORTS[batchSortIdx]?.key;
      const sortBy =
        sortKey === "amount-asc" || sortKey === "amount-desc" ? "grossAmount" : "createdAt";
      const sortDirection =
        sortKey === "date-asc" || sortKey === "amount-asc" ? "ASC" : "DESC";

      return getAdminPayoutBatchesApi({
        gymId: parseNumericId(batchGymId),
        status: batchStatus === "ALL" ? undefined : batchStatus,
        sortBy,
        sortDirection,
        page: batchPage,
        size: BATCH_PAGE_SIZE,
      });
    },
    placeholderData: (previous) => previous,
  });

  const payoutAccountsQ = useQuery({
    queryKey: ["admin-settlements", "gym-review", createGymId],
    queryFn: async () => {
      if (!createGymId) {
        throw new Error("Gym is required");
      }
      return getAdminGymReviewApi(createGymId);
    },
    enabled: payoutWizardOpen && payoutWizardStep === 0 && createGymId != null,
    staleTime: 30_000,
  });

  // Preview query for date-range payout mode (when no rows are selected)
  const wizardDateRangePreviewQ = useQuery({
    queryKey: [
      "admin-settlements",
      "wizard-preview",
      createGymId,
      createDateFrom,
      createDateTo,
    ],
    queryFn: async () => {
      if (!createGymId) throw new Error("Gym required");
      const dateFromStr = createDateFrom.trim();
      const dateToStr = createDateTo.trim();

      // Fetch pending settlements for the selected gym and date range
      return getAdminPendingSettlementsApi({
        gymId: createGymId,
        payoutStatus: "PENDING",
        visitDateFrom: dateFromStr || undefined,
        visitDateTo: dateToStr || undefined,
        sortBy: "visitDate",
        sortDirection: "DESC",
        page: 0,
        size: 500, // Fetch up to 500 for preview count/totals
      });
    },
    enabled:
      payoutWizardOpen &&
      payoutWizardStep === 0 &&
      createGymId != null &&
      selectedSettlementIds.size === 0 &&
      (Boolean(createDateFrom.trim()) || Boolean(createDateTo.trim())),
    staleTime: 15_000,
  });

  // Computed preview summary for date-range mode
  const wizardPreviewSummary = useMemo(() => {
    if (selectedSettlementIds.size > 0) return null; // Using row selection mode
    const items = wizardDateRangePreviewQ.data?.items ?? [];
    if (items.length === 0) return null;
    const gross = items.reduce((sum, r) => sum + (r.grossAmount ?? 0), 0);
    const commission = items.reduce((sum, r) => sum + (r.commissionAmount ?? 0), 0);
    const net = items.reduce((sum, r) => sum + (r.netAmount ?? 0), 0);
    const currency = items[0]?.currency || "NPR";
    const totalAvailable = wizardDateRangePreviewQ.data?.totalItems ?? items.length;
    return { count: items.length, totalAvailable, gross, commission, net, currency };
  }, [selectedSettlementIds.size, wizardDateRangePreviewQ.data]);

  const resetPaymentProofFields = () => {
    setPaymentProofPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPaymentProofFile(null);
    setPaymentReference("");
  };

  const closePayoutWizard = () => {
    resetPaymentProofFields();
    setPayoutWizardOpen(false);
    setPayoutWizardStep(0);
    setCreateGymId(null);
    setCreatePayoutAccountId("");
    setCreateNote("");
    setCreateDateFrom("");
    setCreateDateTo("");
  };

  const createPayoutWithProofM = useMutation({
    mutationFn: ({
      gymId,
      payload,
      transactionReference,
      proofImage,
    }: {
      gymId: number;
      payload: CreatePayoutSettlementRequest;
      transactionReference?: string;
      proofImage?: File | null;
    }) => createAdminPayoutSettlementApi(gymId, payload, transactionReference, proofImage ?? null),
    onSuccess: () => {
      toast.success("Payout batch created. The gym can review and approve.");
      closePayoutWizard();
      setSelectedSettlementIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-settlements", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settlements", "aggregate"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settlements", "batches"] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create payout batch"));
    },
  });

  const pendingRows = useMemo(() => pendingQ.data?.items ?? [], [pendingQ.data?.items]);

  const selectableRows = useMemo(() => {
    if (!showRowCheckboxes) return [];
    return pendingRows.filter((row) => row.payoutStatus === "PENDING" && row.gymId != null);
  }, [pendingRows, showRowCheckboxes]);

  useEffect(() => {
    setSelectedSettlementIds((previous) => {
      const availableIds = new Set(selectableRows.map((row) => row.checkInSettlementId));
      const next = new Set<number>();
      previous.forEach((id) => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [selectableRows]);

  const selectedRows = useMemo(() => {
    if (selectedSettlementIds.size === 0) return [];
    return pendingRows.filter((row) => selectedSettlementIds.has(row.checkInSettlementId));
  }, [pendingRows, selectedSettlementIds]);

  const selectedSummary = useMemo(() => {
    return selectedRows.reduce(
      (acc, row) => {
        acc.gross += row.grossAmount;
        acc.commission += row.commissionAmount;
        acc.net += row.netAmount;
        if (!acc.currency && row.currency) {
          acc.currency = row.currency;
        }
        return acc;
      },
      { gross: 0, commission: 0, net: 0, currency: "NPR" }
    );
  }, [selectedRows]);

  const selectedGymIds = useMemo(() => {
    const ids = new Set<number>();
    selectedRows.forEach((row) => {
      if (typeof row.gymId === "number") {
        ids.add(row.gymId);
      }
    });
    return ids;
  }, [selectedRows]);

  const allSelectableChecked =
    selectableRows.length > 0 && selectableRows.every((row) => selectedSettlementIds.has(row.checkInSettlementId));

  const verifiedPayoutAccounts = useMemo(() => {
    return (payoutAccountsQ.data?.payoutAccounts ?? []).filter((account) => account.verified);
  }, [payoutAccountsQ.data?.payoutAccounts]);

  useEffect(() => {
    if (!payoutWizardOpen || payoutWizardStep !== 0) return;
    if (!createPayoutAccountId && verifiedPayoutAccounts.length > 0) {
      setCreatePayoutAccountId(String(verifiedPayoutAccounts[0].payoutAccountId));
    }
  }, [payoutWizardOpen, payoutWizardStep, createPayoutAccountId, verifiedPayoutAccounts]);

  const openCreateWizard = () => {
    if (selectedSettlementIds.size > 0) {
      if (selectedRows.length !== selectedSettlementIds.size) {
        toast.error("Selected settlements are no longer available on this page.");
        return;
      }
      if (selectedGymIds.size !== 1) {
        toast.error("Select settlements from only one gym for a payout batch.");
        return;
      }
      const gymId = selectedRows[0]?.gymId;
      if (gymId == null) {
        toast.error("Selected settlements must have a gym.");
        return;
      }
      setCreateGymId(gymId);
      setPayoutWizardStep(0);
      resetPaymentProofFields();
      setPayoutWizardOpen(true);
      return;
    }

    const gymId = gymFilteredId;
    if (!gymId) {
      toast.error("Filter by one gym to use row selection, or pick a gym from filters first for date-range payout.");
      return;
    }

    setCreateGymId(gymId);
    setPayoutWizardStep(0);
    resetPaymentProofFields();
    setPayoutWizardOpen(true);
  };

  const buildCreatePayload = (): CreatePayoutSettlementRequest | null => {
    if (!createGymId) return null;
    const payoutAccountId = parseNumericId(createPayoutAccountId);
    if (!payoutAccountId) return null;
    const usingSettlementIds = selectedSettlementIds.size > 0;
    // For date-range mode: require at least one date
    if (!usingSettlementIds && !createDateFrom && !createDateTo) return null;
    
    const dateFromStr = createDateFrom.trim() || undefined;
    const dateToStr = createDateTo.trim() || undefined;
    
    return {
      payoutAccountId,
      currency: (createCurrency.trim() || "NPR").toUpperCase(),
      note: createNote.trim() ? createNote.trim() : null,
      settlementIds: usingSettlementIds ? Array.from(selectedSettlementIds) : undefined,
      visitDateFrom: usingSettlementIds ? undefined : dateFromStr,
      visitDateTo: usingSettlementIds ? undefined : dateToStr,
    };
  };

  const goToPaymentStep = () => {
    if (!createGymId) {
      toast.error("Gym is required.");
      return;
    }
    const payoutAccountId = parseNumericId(createPayoutAccountId);
    if (!payoutAccountId) {
      toast.error("Choose a verified payout account.");
      return;
    }
    const usingSettlementIds = selectedSettlementIds.size > 0;
    // For date-range mode: require at least one date
    if (!usingSettlementIds && !createDateFrom && !createDateTo) {
      toast.error("Provide at least a start or end date when no rows are selected.");
      return;
    }
    // In date-range mode, verify there are pending rows to settle
    if (!usingSettlementIds && !wizardPreviewSummary) {
      toast.error("No pending settlements found for the selected date range.");
      return;
    }
    setPayoutWizardStep(1);
  };

  const submitPayoutWithProof = () => {
    if (!createGymId) {
      toast.error("Gym is required.");
      return;
    }
    const payload = buildCreatePayload();
    if (!payload) {
      toast.error("Check batch details.");
      return;
    }
    const transactionReference = paymentReference.trim();
    createPayoutWithProofM.mutate({
      gymId: createGymId,
      payload,
      transactionReference: transactionReference || undefined,
      proofImage: paymentProofFile,
    });
  };

  useEffect(() => {
    if (!paymentProofFile) {
      setPaymentProofPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(paymentProofFile);
    setPaymentProofPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [paymentProofFile]);

  const gymNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const g of gymsQ.data ?? []) {
      map.set(g.gymId, g.gymName?.trim() || `Gym #${g.gymId}`);
    }
    return map;
  }, [gymsQ.data]);

  const payoutSubmitPending = createPayoutWithProofM.isPending;

  const applyCheckinFilters = () => {
    setAppliedCheckinFilters(draftCheckinFilters);
    setCheckinPage(0);
    setCheckinFilterDialogOpen(false);
  };

  const resetCheckinFilters = () => {
    setDraftCheckinFilters(DEFAULT_CHECKIN_FILTERS);
    setAppliedCheckinFilters(DEFAULT_CHECKIN_FILTERS);
    setCheckinPage(0);
    setCheckinFilterDialogOpen(false);
  };

  const removeAppliedFilter = (key: keyof CheckinFiltersState | "sort") => {
    setAppliedCheckinFilters((prev) => {
      const next = { ...prev };
      if (key === "gymId") next.gymId = "ALL";
      else if (key === "accountId") next.accountId = "";
      else if (key === "status") next.status = "ALL";
      else if (key === "dateFrom") next.dateFrom = "";
      else if (key === "dateTo") next.dateTo = "";
      else if (key === "sort") {
        next.sortBy = DEFAULT_CHECKIN_FILTERS.sortBy;
        next.sortDir = DEFAULT_CHECKIN_FILTERS.sortDir;
      } else if (key === "sortBy") next.sortBy = DEFAULT_CHECKIN_FILTERS.sortBy;
      else if (key === "sortDir") next.sortDir = DEFAULT_CHECKIN_FILTERS.sortDir;
      return next;
    });
    setCheckinPage(0);
  };

  const selectAllPendingInLoadedAggregate = () => {
    const items = aggregateQ.data?.items ?? [];
    const ids = new Set<number>();
    for (const row of items) {
      if (row.payoutStatus === "PENDING" && row.gymId != null) {
        ids.add(row.checkInSettlementId);
      }
    }
    if (ids.size === 0) {
      toast.message("No pending rows in the current chart data for these filters.");
      return;
    }
    setSelectedSettlementIds(ids);
    if (aggregateQ.data?.capped) {
      toast.message(`Selected ${ids.size} rows (fetch is capped; some older rows may be missing).`);
    } else {
      toast.success(`Selected ${ids.size} pending rows.`);
    }
  };

  const filterPillItems = useMemo(() => {
    const pills: { key: keyof CheckinFiltersState | "sort"; label: string }[] = [];
    if (appliedCheckinFilters.gymId !== "ALL") {
      const name = gymNameById.get(Number(appliedCheckinFilters.gymId)) ?? `Gym #${appliedCheckinFilters.gymId}`;
      pills.push({ key: "gymId", label: `Gym: ${name}` });
    }
    if (appliedCheckinFilters.accountId.trim()) {
      pills.push({ key: "accountId", label: `Member: #${appliedCheckinFilters.accountId}` });
    }
    if (appliedCheckinFilters.status !== "ALL") {
      pills.push({ key: "status", label: `Status: ${appliedCheckinFilters.status}` });
    }
    if (appliedCheckinFilters.dateFrom) {
      pills.push({ key: "dateFrom", label: `From: ${appliedCheckinFilters.dateFrom}` });
    }
    if (appliedCheckinFilters.dateTo) {
      pills.push({ key: "dateTo", label: `To: ${appliedCheckinFilters.dateTo}` });
    }
    if (appliedCheckinFilters.sortBy !== DEFAULT_CHECKIN_FILTERS.sortBy || appliedCheckinFilters.sortDir !== DEFAULT_CHECKIN_FILTERS.sortDir) {
      pills.push({
        key: "sort",
        label: `Sort: ${sortByLabel(appliedCheckinFilters.sortBy)} ${appliedCheckinFilters.sortDir}`,
      });
    }
    return pills;
  }, [appliedCheckinFilters, gymNameById]);

  const batchFilterPillItems = useMemo(() => {
    const pills: { key: "gymId" | "status"; label: string }[] = [];
    if (batchGymId !== "ALL") {
      const name = gymNameById.get(Number(batchGymId)) ?? `Gym #${batchGymId}`;
      pills.push({ key: "gymId", label: `Gym: ${name}` });
    }
    if (batchStatus !== "ALL") {
      pills.push({ key: "status", label: `Status: ${batchStatus}` });
    }
    return pills;
  }, [batchGymId, batchStatus, gymNameById]);

  const batchSortMode = BATCH_SORTS[batchSortIdx];
  const BatchSortIcon = batchSortMode.Icon;

  const applyBatchFilters = () => {
    setBatchGymId(draftBatchGymId);
    setBatchStatus(draftBatchStatus);
    setBatchPage(0);
    setBatchFilterDialogOpen(false);
  };

  const clearBatchFilters = () => {
    setBatchGymId(DEFAULT_BATCH_FILTERS.gymId);
    setBatchStatus(DEFAULT_BATCH_FILTERS.status);
    setDraftBatchGymId(DEFAULT_BATCH_FILTERS.gymId);
    setDraftBatchStatus(DEFAULT_BATCH_FILTERS.status);
    setBatchPage(0);
    setBatchFilterDialogOpen(false);
  };

  const removeAppliedBatchFilter = (key: "gymId" | "status") => {
    if (key === "gymId") setBatchGymId("ALL");
    else setBatchStatus("ALL");
    setBatchPage(0);
  };

  const metrics = aggregateQ.data?.metrics;

  const unpaidOrInPayoutNetTotal = useMemo(() => {
    const items = aggregateQ.data?.items ?? [];
    return items.reduce((sum, row) => {
      if (row.payoutStatus === "PENDING" || row.payoutStatus === "IN_PAYOUT") {
        return sum + (row.netAmount ?? 0);
      }
      return sum;
    }, 0);
  }, [aggregateQ.data?.items]);

  const paidAmountTotal = useMemo(() => {
    const items = aggregateQ.data?.items ?? [];
    return items.reduce((sum, row) => {
      if (row.payoutStatus === "PAID") {
        return sum + (row.netAmount ?? 0);
      }
      return sum;
    }, 0);
  }, [aggregateQ.data?.items]);

  const unpaidOrInPayoutCount = (metrics?.pendingCount ?? 0) + (metrics?.inPayoutCount ?? 0);

  const chartBarData = useMemo(() => {
    const items = aggregateQ.data?.items ?? [];
    if (checkinChartGranularity === "week") {
      return buildWeekCheckInBars(items, defaultWeekEndYmd()).map((entry) => ({
        ...entry,
        plotCount: entry.count === 0 ? 0.2 : entry.count,
      }));
    }
    return buildTwelveMonthCheckInBars(items, defaultMonthEndYm()).map((entry) => ({
      ...entry,
      plotCount: entry.count === 0 ? 0.2 : entry.count,
    }));
  }, [aggregateQ.data?.items, checkinChartGranularity]);

  /** Scale Y-axis to plotted values (incl. 0.2 floor for empty buckets); no fixed high minimum. */
  const chartYMax = useMemo(() => {
    if (!chartBarData.length) return 1;
    const plotMax = Math.max(...chartBarData.map((d) => d.plotCount), 0);
    if (plotMax <= 0) return 1;
    return Math.max(1, Math.ceil(plotMax * 1.15 * 100) / 100);
  }, [chartBarData]);

  const statusPieChartData = useMemo(() => {
    if (!metrics) return [];
    const sum = metrics.pendingCount + metrics.inPayoutCount + metrics.paidCount;
    if (sum === 0) {
      return [{ name: "No rows", value: 1, fill: "#3f3f46" }];
    }
    return metrics.statusSlices.filter((s) => s.value > 0);
  }, [metrics]);

  const gymOptions = useMemo(() => gymsQ.data ?? [], [gymsQ.data]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 font-['Outfit',system-ui,sans-serif]">
      <div>
        <h1 className="text-[32px] font-black tracking-tight text-white">
          Settlement <span style={fireStyle}>Center</span>
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminSettlementTab)}>
        <TabsList className="mb-4 flex h-auto w-full max-w-full gap-0 overflow-x-auto border-b border-white/10 bg-transparent p-0 px-2 sm:mb-5 sm:w-fit sm:rounded-full sm:border sm:bg-black/40 sm:p-1 sm:backdrop-blur-sm">
          <TabsTrigger
            value="checkins"
            className={cn(
              "group relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider",
              "text-slate-400 hover:text-white sm:flex-initial sm:rounded-full sm:px-5 sm:py-2.5 sm:text-[10px]",
              "sm:hover:bg-white/5",
              "data-[state=active]:text-orange-500 data-[state=active]:sm:bg-orange-600 data-[state=active]:sm:text-white data-[state=active]:sm:shadow-lg data-[state=active]:sm:shadow-orange-500/30",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
          >
            <span
              className="absolute inset-x-0 bottom-0 hidden h-[2px] bg-orange-500 group-data-[state=active]:block sm:!hidden"
              aria-hidden
            />
            <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Check-ins</span>
            <span className="hidden sm:inline">Check-in Settlements</span>
          </TabsTrigger>
          <TabsTrigger
            value="batches"
            className={cn(
              "group relative flex flex-1 items-center justify-center gap-1.5 py-3.5 text-[9px] font-bold uppercase tracking-wider",
              "text-slate-400 hover:text-white sm:flex-initial sm:rounded-full sm:px-5 sm:py-2.5 sm:text-[10px]",
              "sm:hover:bg-white/5",
              "data-[state=active]:text-orange-500 data-[state=active]:sm:bg-orange-600 data-[state=active]:sm:text-white data-[state=active]:sm:shadow-lg data-[state=active]:sm:shadow-orange-500/30",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
          >
            <span
              className="absolute inset-x-0 bottom-0 hidden h-[2px] bg-orange-500 group-data-[state=active]:block sm:!hidden"
              aria-hidden
            />
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Batches</span>
            <span className="hidden sm:inline">Payout Batches</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkins" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn(
                MG_TOOLBAR_BASE,
                checkinFilterDialogOpen ? MG_FILTER_ACTIVE : MG_FILTER_IDLE,
              )}
              onClick={() => {
                syncDraftFromApplied();
                setCheckinFilterDialogOpen(true);
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <Dialog
              open={checkinFilterDialogOpen}
              onOpenChange={(open) => {
                setCheckinFilterDialogOpen(open);
                if (open) syncDraftFromApplied();
              }}
            >
              <DialogContent
                className="max-h-[90vh] overflow-y-auto border table-border table-bg text-white sm:max-w-md"
                onInteractOutside={(e) => {
                  if (isInsideRadixPortalSurface(e.target)) e.preventDefault();
                }}
                onFocusOutside={(e) => {
                  if (isInsideRadixPortalSurface(e.target)) e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle className="text-white">Settlement filters</DialogTitle>
                  <DialogDescription className="table-text-muted">
                    Apply to update charts and the table. Pagination is separate.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pt-2">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Gym</p>
                    <AdminGymCombobox
                      gyms={gymOptions}
                      value={draftCheckinFilters.gymId}
                      onValueChange={(value) => setDraftCheckinFilters((d) => ({ ...d, gymId: value }))}
                      placeholder="Search approved gyms…"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Member ID (User)</p>
                    <Input
                      value={draftCheckinFilters.accountId}
                      onChange={(e) =>
                        setDraftCheckinFilters((d) => ({ ...d, accountId: e.target.value.replace(/[^0-9]/g, "") }))
                      }
                      placeholder="Filter by user account ID"
                      className="h-9 rounded-full border table-border table-bg px-3 text-[13px] font-medium text-white placeholder:table-text-muted outline-none transition-all focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)]"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Payout status</p>
                    <Select
                      value={draftCheckinFilters.status}
                      onValueChange={(value) => setDraftCheckinFilters((d) => ({ ...d, status: value as PayoutFilter }))}
                    >
                      <SelectTrigger className="h-9 border table-border table-bg text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border table-border table-bg-alt text-white">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                        <SelectItem value="IN_PAYOUT">IN_PAYOUT</SelectItem>
                        <SelectItem value="PAID">PAID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Visit from</p>
                      <CustomDatePicker
                        nestedInDialog
                        value={draftCheckinFilters.dateFrom}
                        onChange={(v) => setDraftCheckinFilters((d) => ({ ...d, dateFrom: v }))}
                        placeholder="Start date"
                        className="!border table-border table-bg shadow-none hover:border-orange-500/30"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Visit to</p>
                      <CustomDatePicker
                        nestedInDialog
                        value={draftCheckinFilters.dateTo}
                        onChange={(v) => setDraftCheckinFilters((d) => ({ ...d, dateTo: v }))}
                        placeholder="End date"
                        className="!border table-border table-bg shadow-none hover:border-orange-500/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Sort by</p>
                      <Select
                        value={draftCheckinFilters.sortBy}
                        onValueChange={(value) =>
                          setDraftCheckinFilters((d) => ({ ...d, sortBy: value as CheckinSortBy }))
                        }
                      >
                        <SelectTrigger className="h-9 border table-border table-bg text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border table-border table-bg-alt text-white">
                          <SelectItem value="visitDate">Visit date</SelectItem>
                          <SelectItem value="checkedInAt">Check-in time</SelectItem>
                          <SelectItem value="createdAt">Created</SelectItem>
                          <SelectItem value="gym.gymName">Gym name</SelectItem>
                          <SelectItem value="account.email">Member email</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Direction</p>
                      <Select
                        value={draftCheckinFilters.sortDir}
                        onValueChange={(value) =>
                          setDraftCheckinFilters((d) => ({ ...d, sortDir: value as "ASC" | "DESC" }))
                        }
                      >
                        <SelectTrigger className="h-9 border table-border table-bg text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border table-border table-bg-alt text-white">
                          <SelectItem value="DESC">Newest first</SelectItem>
                          <SelectItem value="ASC">Oldest first</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400"
                      onClick={applyCheckinFilters}
                    >
                      Apply filters
                    </button>
                    <button
                      type="button"
                      className={MG_DIALOG_OUTLINE}
                      onClick={() => {
                        setDraftCheckinFilters(DEFAULT_CHECKIN_FILTERS);
                      }}
                    >
                      Reset draft
                    </button>
                    <button type="button" className={MG_DIALOG_CLEAR} onClick={resetCheckinFilters}>
                      Clear all
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {filterPillItems.length === 0 ? (
                <span className="text-[11px] text-zinc-600">
                  <Filter className="mr-1 inline h-3 w-3" />
                  No active filters
                </span>
              ) : (
                filterPillItems.map((pill) => (
                  <Badge
                    key={`${pill.key}-${pill.label}`}
                    variant="outline"
                    className="gap-1 border-orange-500/30 bg-orange-500/10 pl-2 pr-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-100"
                  >
                    {pill.label}
                    <button
                      type="button"
                      className="rounded p-0.5 text-orange-200 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
                      aria-label={`Remove ${pill.label}`}
                      onClick={() => removeAppliedFilter(pill.key)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={MG_REFRESH}
                onClick={() => {
                  setCheckinPage(0);
                  pendingQ.refetch();
                  aggregateQ.refetch();
                }}
              >
                {aggregateQ.isFetching || pendingQ.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
              {showRowCheckboxes ? (
                <>
                  <button
                    type="button"
                    className={cn(MG_TOOLBAR_BASE, MG_FILTER_IDLE)}
                    disabled={aggregateQ.isFetching}
                    onClick={selectAllPendingInLoadedAggregate}
                  >
                    Select all pending in chart
                  </button>
                  <button
                    type="button"
                    className={cn(
                      MG_TOOLBAR_BASE,
                      "bg-orange-500 px-5 font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-orange-400",
                    )}
                    onClick={openCreateWizard}
                  >
                    Create payout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Filter by a single gym to enable selection and payouts"
                  className={cn(
                    MG_TOOLBAR_BASE,
                    "cursor-not-allowed border table-border table-bg px-5 font-black uppercase tracking-[0.16em] opacity-50",
                  )}
                >
                  Create payout
                </button>
              )}
            </div>
          </div>

          {!showRowCheckboxes ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-[12px] text-zinc-500">
              <span className="font-semibold text-zinc-300">Filter by one gym</span> to show checkboxes, select rows, and
              create payouts. Charts and totals still follow your other filters.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col rounded-xl border table-border table-bg p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Paid amount</span>
                <Filter className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </div>
              <p className="text-[20px] font-black leading-tight text-white">
                {aggregateQ.isLoading ? "—" : metrics ? formatMoney(paidAmountTotal, metrics.currency) : "—"}
              </p>
              {metrics?.capped ? (
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-500/90">Capped</p>
              ) : null}
            </div>

            <div className="flex flex-col rounded-xl border table-border table-bg p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pending payout</span>
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              </div>
              <p className="text-[20px] font-black leading-tight text-white">
                {aggregateQ.isLoading ? "—" : metrics ? formatMoney(unpaidOrInPayoutNetTotal, metrics.currency) : "—"}
              </p>
              {metrics ? (
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                  {unpaidOrInPayoutCount} rows {metrics.capped ? "(capped sample)" : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400">Gross Revenue</span>
                <Wallet className="h-3.5 w-3.5 shrink-0 text-orange-400" />
              </div>
              <p className="text-[20px] font-black leading-tight text-white">
                {aggregateQ.isLoading ? "—" : metrics ? formatMoney(metrics.grossSum, metrics.currency) : "—"}
              </p>
            </div>

            <div className="flex flex-col rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400/90">Net Revenue</span>
                <Banknote className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
              </div>
              <p className="text-[20px] font-black leading-tight text-white">
                {aggregateQ.isLoading ? "—" : metrics ? formatMoney(metrics.netSum, metrics.currency) : "—"}
              </p>
            </div>

            <div className="flex flex-col rounded-xl border border-slate-500/20 bg-slate-500/[0.06] p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-1.5 opacity-90">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Payout status</span>
                <LayoutList className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              </div>
              <div className="mt-1 flex flex-col gap-1.5">
                <p className="flex items-baseline justify-between text-[13px] font-black leading-none text-slate-300">
                  <span>Pending</span>
                  <span className="tabular-nums text-white">{aggregateQ.isLoading ? "—" : (metrics?.pendingCount ?? "—")}</span>
                </p>
                <p className="flex items-baseline justify-between text-[13px] font-black leading-none text-orange-400">
                  <span>In payout</span>
                  <span className="tabular-nums">{aggregateQ.isLoading ? "—" : (metrics?.inPayoutCount ?? "—")}</span>
                </p>
                <p className="flex items-baseline justify-between text-[13px] font-black leading-none text-emerald-400">
                  <span>Paid</span>
                  <span className="tabular-nums">{aggregateQ.isLoading ? "—" : (metrics?.paidCount ?? "—")}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-5">
            <div className="rounded-xl border table-border table-bg p-3 lg:col-span-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Check-ins</span>
                <Select
                  value={checkinChartGranularity}
                  onValueChange={(v) => setCheckinChartGranularity(v as "week" | "year")}
                >
                  <SelectTrigger className="h-7 w-[128px] rounded-full border table-border table-bg px-2 text-[10px] font-bold text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border table-border table-bg-alt text-white">
                    <SelectItem value="week" className="text-[11px]">
                      Last 7 days
                    </SelectItem>
                    <SelectItem value="year" className="text-[11px]">
                      Last 12 months
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {aggregateQ.isLoading ? (
                <div className="flex h-[112px] items-center justify-center gap-2 text-sm table-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : aggregateQ.isError ? (
                <p className="py-4 text-sm text-red-300">{getApiErrorMessage(aggregateQ.error, "Chart failed to load")}</p>
              ) : (
                <div className="h-[112px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartBarData} margin={{ top: 2, right: 4, left: -8, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,16%)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#737373", fontSize: 8 }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        height={32}
                      />
                      <YAxis
                        domain={[0, chartYMax]}
                        tick={{ fill: "#737373", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      <Tooltip
                        {...CHART_TOOLTIP}
                        formatter={(_value: number, _name: string, payload: { payload?: { count?: number } }) => [
                          payload?.payload?.count ?? 0,
                          "Check-ins",
                        ]}
                      />
                      <Bar
                        dataKey="plotCount"
                        radius={[4, 4, 0, 0]}
                        minPointSize={2}
                        isAnimationActive={false}
                      >
                        {chartBarData.map((entry, i) => (
                          <Cell key={`c-${entry.key}-${i}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="rounded-xl border table-border table-bg p-3 lg:col-span-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status mix</span>
              </div>
              {aggregateQ.isLoading ? (
                <div className="flex h-[112px] items-center justify-center gap-2 text-sm table-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : aggregateQ.isError ? (
                <p className="py-4 text-sm text-red-300">{getApiErrorMessage(aggregateQ.error, "Chart failed to load")}</p>
              ) : !metrics ? (
                <p className="py-6 text-sm table-text-muted">No data.</p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-[112px] w-[112px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={32}
                          outerRadius={48}
                          paddingAngle={2}
                          isAnimationActive={false}
                        >
                          {statusPieChartData.map((entry, i) => (
                            <Cell key={`s-${entry.name}-${i}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip {...CHART_TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {metrics.statusSlices.map((slice) => (
                      <div key={slice.name} className="flex items-center gap-2 text-[11px] font-bold text-white">
                        <div className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: slice.fill }} />
                        <span className="min-w-0 truncate">{slice.name}</span>
                        <span className="ml-auto tabular-nums text-slate-400">{slice.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[18px] border table-border table-bg">
            <div className="border-b table-border px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] table-text-muted">
                  {showRowCheckboxes && selectedSettlementIds.size > 0 ? (
                    <>
                      <span className="font-semibold text-white">{selectedSettlementIds.size}</span> selected • Gross Revenue{" "}
                      {formatMoney(selectedSummary.gross, selectedSummary.currency)} • Net Revenue{" "}
                      {formatMoney(selectedSummary.net, selectedSummary.currency)}
                    </>
                  ) : (
                    "Table paging is separate from chart totals."
                  )}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] table-text-muted">
                  Sort {sortByLabel(appliedCheckinFilters.sortBy)} · {appliedCheckinFilters.sortDir}
                </p>
              </div>
            </div>
            {pendingQ.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-12 text-sm table-text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading settlements...
              </div>
            ) : pendingQ.isError ? (
              <p className="px-4 py-6 text-sm text-red-300">{getApiErrorMessage(pendingQ.error, "Failed to load settlements")}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="table-header-bg border-b table-border">
                        <th className="px-3 py-3 pl-4 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted w-10">
                          {showRowCheckboxes ? (
                            <Checkbox
                              checked={allSelectableChecked}
                              onCheckedChange={(checked) => {
                                if (checked === true) {
                                  setSelectedSettlementIds(new Set(selectableRows.map((row) => row.checkInSettlementId)));
                                } else {
                                  setSelectedSettlementIds(new Set());
                                }
                              }}
                              className="border-white/20 data-[state=checked]:border-orange-400 data-[state=checked]:bg-orange-500"
                            />
                          ) : (
                            <span className="text-zinc-700">—</span>
                          )}
                        </th>
                        <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Settlement
                        </th>
                        <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Gym
                        </th>
                        <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Member
                        </th>
                        <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Visit Date
                        </th>
                        <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Gross Revenue
                        </th>
                        <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Commission
                        </th>
                        <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Net Revenue
                        </th>
                        <th className="px-3 py-3 pr-4 text-right text-[10px] font-black uppercase tracking-[0.14em] table-text-muted">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] font-semibold text-zinc-200">
                      {pendingRows.length === 0 ? (
                        <tr>
                          <td className="py-12 text-center table-text-muted" colSpan={9}>
                            No settlement rows found for current filters.
                          </td>
                        </tr>
                      ) : (
                        pendingRows.map((row) => {
                          const selectable = showRowCheckboxes && row.payoutStatus === "PENDING" && row.gymId != null;
                          const checked = selectedSettlementIds.has(row.checkInSettlementId);
                          return (
                            <tr
                              key={row.checkInSettlementId}
                              className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]"
                            >
                              <td className="px-3 py-3.5 pl-4">
                                {showRowCheckboxes ? (
                                  <Checkbox
                                    disabled={!selectable}
                                    checked={checked}
                                    onCheckedChange={(next) => {
                                      setSelectedSettlementIds((previous) => {
                                        const updated = new Set(previous);
                                        if (next === true) {
                                          updated.add(row.checkInSettlementId);
                                        } else {
                                          updated.delete(row.checkInSettlementId);
                                        }
                                        return updated;
                                      });
                                    }}
                                    className="border-white/20 data-[state=checked]:border-orange-400 data-[state=checked]:bg-orange-500"
                                  />
                                ) : (
                                  <span className="text-zinc-700">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3.5 font-mono text-[11px] table-text-muted">#{row.checkInSettlementId}</td>
                              <td className="px-3 py-3.5 text-[12px] text-white">
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-white">{row.gymName || `Gym #${row.gymId ?? "—"}`}</p>
                                  <p className="mt-0.5 truncate font-mono text-[10px] text-slate-500">
                                    {row.gymId != null ? `#${row.gymId}` : "—"}
                                  </p>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-[12px] text-slate-300">
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-white">{row.memberName || "—"}</p>
                                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{row.memberEmail || "—"}</p>
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-[12px]">{formatDate(row.visitDate)}</td>
                              <td className="px-3 py-3.5 text-right text-[13px] font-bold text-white">
                                {formatMoney(row.grossAmount, row.currency)}
                              </td>
                              <td className="px-3 py-3.5 text-right text-[12px]">{formatMoney(row.commissionAmount, row.currency)}</td>
                              <td className="px-3 py-3.5 text-right text-[12px] font-semibold text-white">
                                {formatMoney(row.netAmount, row.currency)}
                              </td>
                              <td className="px-3 py-3.5 pr-4 text-right">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${checkinStatusClassName(row.payoutStatus)}`}
                                >
                                  {row.payoutStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  page={pendingQ.data?.page ?? 0}
                  totalPages={pendingQ.data?.totalPages ?? 1}
                  totalItems={pendingQ.data?.totalItems ?? 0}
                  onPageChange={setCheckinPage}
                  hasNext={pendingQ.data?.hasNext ?? false}
                  hasPrevious={pendingQ.data?.hasPrevious ?? false}
                />
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="batches" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn(MG_TOOLBAR_BASE, batchFilterDialogOpen ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}
              onClick={() => {
                syncBatchDraftFromApplied();
                setBatchFilterDialogOpen(true);
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => setBatchSortIdx((i) => (i + 1) % BATCH_SORTS.length)}
              className={cn(MG_TOOLBAR_BASE, batchSortIdx !== 0 ? MG_FILTER_ACTIVE : MG_FILTER_IDLE)}
            >
              <BatchSortIcon className="h-4 w-4" />
              {batchSortMode.label}
            </button>
            <Dialog
              open={batchFilterDialogOpen}
              onOpenChange={(open) => {
                setBatchFilterDialogOpen(open);
                if (open) syncBatchDraftFromApplied();
              }}
            >
              <DialogContent
                className="max-h-[90vh] overflow-y-auto border table-border table-bg text-white sm:max-w-md"
                onInteractOutside={(e) => {
                  if (isInsideRadixPortalSurface(e.target)) e.preventDefault();
                }}
                onFocusOutside={(e) => {
                  if (isInsideRadixPortalSurface(e.target)) e.preventDefault();
                }}
              >
                <DialogHeader>
                  <DialogTitle className="text-white">Payout batch filters</DialogTitle>
                  <DialogDescription className="table-text-muted">
                    Apply to update the table below. Pagination is separate.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 pt-2">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Gym</p>
                    <AdminGymCombobox
                      gyms={gymOptions}
                      value={draftBatchGymId}
                      onValueChange={(value) => setDraftBatchGymId(value)}
                      placeholder="Search approved gyms…"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Batch status</p>
                    <Select
                      value={draftBatchStatus}
                      onValueChange={(value) => setDraftBatchStatus(value as BatchStatusFilter)}
                    >
                      <SelectTrigger className="h-9 border table-border table-bg text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border table-border table-bg-alt text-white">
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="GYM_REVIEW_PENDING">GYM_REVIEW_PENDING</SelectItem>
                        <SelectItem value="PAID">PAID</SelectItem>
                        <SelectItem value="REJECTED">REJECTED</SelectItem>
                        <SelectItem value="FAILED">FAILED</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400"
                      onClick={applyBatchFilters}
                    >
                      Apply filters
                    </button>
                    <button
                      type="button"
                      className={MG_DIALOG_OUTLINE}
                      onClick={() => {
                        setDraftBatchGymId(DEFAULT_BATCH_FILTERS.gymId);
                        setDraftBatchStatus(DEFAULT_BATCH_FILTERS.status);
                      }}
                    >
                      Reset draft
                    </button>
                    <button type="button" className={MG_DIALOG_CLEAR} onClick={clearBatchFilters}>
                      Clear all
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {batchFilterPillItems.length === 0 ? (
                <span className="text-[11px] text-zinc-600">
                  <Filter className="mr-1 inline h-3 w-3" />
                  No active filters
                </span>
              ) : (
                batchFilterPillItems.map((pill) => (
                  <Badge
                    key={`batch-${pill.key}-${pill.label}`}
                    variant="outline"
                    className="gap-1 border-orange-500/30 bg-orange-500/10 pl-2 pr-1 text-[10px] font-bold uppercase tracking-[0.08em] text-orange-100"
                  >
                    {pill.label}
                    <button
                      type="button"
                      className="rounded p-0.5 text-orange-200 transition-colors hover:bg-orange-500/10 hover:text-orange-400"
                      aria-label={`Remove ${pill.label}`}
                      onClick={() => removeAppliedBatchFilter(pill.key)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={MG_REFRESH}
                onClick={() => {
                  setBatchPage(0);
                  batchesQ.refetch();
                }}
              >
                {batchesQ.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </button>
            </div>
          </div>

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
                  <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
                    <thead>
                      <tr className="table-header-bg border-b table-border">
                        <th
                          scope="col"
                          className="w-[7%] whitespace-nowrap px-3 py-3 pl-4 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Batch
                        </th>
                        <th
                          scope="col"
                          className="w-[18%] px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Gym
                        </th>
                        <th
                          scope="col"
                          className="w-[15%] whitespace-nowrap px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Created
                        </th>
                        <th
                          scope="col"
                          className="w-[8%] whitespace-nowrap px-3 py-3 text-right align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Settlements
                        </th>
                        <th
                          scope="col"
                          className="w-[12%] whitespace-nowrap px-3 py-3 text-right align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Total Amount
                        </th>
                        <th
                          scope="col"
                          className="w-[16%] px-3 py-3 text-left align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Reference
                        </th>
                        <th
                          scope="col"
                          className="w-[10%] whitespace-nowrap px-3 py-3 text-center align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Proof
                        </th>
                        <th
                          scope="col"
                          className="w-[14%] whitespace-nowrap px-3 py-3 pr-4 text-right align-middle text-[10px] font-black uppercase tracking-[0.14em] table-text-muted"
                        >
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-[12px] font-semibold text-zinc-200">
                      {(batchesQ.data?.items ?? []).length === 0 ? (
                        <tr>
                          <td className="py-12 text-center align-middle table-text-muted" colSpan={8}>
                            No payout batches found for current filters.
                          </td>
                        </tr>
                      ) : (
                        (batchesQ.data?.items ?? []).map((batch) => (
                          <tr
                            key={batch.payoutSettlementId}
                            className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]"
                          >
                            <td className="whitespace-nowrap px-3 py-3 pl-4 align-middle font-mono text-[11px] table-text-muted">
                              #{batch.payoutSettlementId}
                            </td>
                            <td className="max-w-0 px-3 py-3 align-middle text-[12px] text-white">
                              <span className="block truncate" title={gymNameById.get(batch.gymId) ?? `Gym #${batch.gymId}`}>
                                {gymNameById.get(batch.gymId) ?? `Gym #${batch.gymId}`}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 align-middle text-[12px] table-text-muted">
                              {formatDateTime(batch.createdAt)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right align-middle tabular-nums">
                              {batch.settlementCount}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right align-middle text-[13px] font-bold tabular-nums text-white">
                              {formatMoney(batch.grossAmount, batch.currency)}
                            </td>
                            <td className="max-w-0 px-3 py-3 align-middle font-mono text-[11px] text-slate-300">
                              <span className="block truncate" title={batch.transactionReference || undefined}>
                                {batch.transactionReference || "—"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center align-middle">
                              {batch.proofUrl ? (
                                <a
                                  href={batch.proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block text-orange-300 underline decoration-orange-500/40 underline-offset-2 hover:text-orange-200"
                                >
                                  View receipt
                                </a>
                              ) : (
                                <span className="text-[11px] font-medium text-amber-500/90">Missing</span>
                              )}
                            </td>
                            <td className="px-3 py-3 pr-4 text-right align-middle">
                              <span
                                className={`inline-flex max-w-full justify-end whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${batchStatusClassName(batch.status)}`}
                              >
                                {batch.status}
                              </span>
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

      <Dialog
        open={payoutWizardOpen}
        onOpenChange={(open) => {
          if (!open) closePayoutWizard();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto border table-border table-bg text-white sm:max-w-[720px]"
          onInteractOutside={(e) => {
            if (isInsideRadixPortalSurface(e.target)) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            if (isInsideRadixPortalSurface(e.target)) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{payoutWizardStep === 0 ? "Create payout batch" : "Submit batch"}</DialogTitle>
            <DialogDescription className="table-text-muted">
              {payoutWizardStep === 0 ? "Configure account, dates or selection, then continue." : "Add payment details if available, then create."}
            </DialogDescription>
          </DialogHeader>

          <SettlementAdminStepStrip stepIndex={payoutWizardStep} steps={["Batch setup", "Payment details"]} />

          {payoutWizardStep === 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Gym ID</p>
                  <Input
                    value={createGymId ? String(createGymId) : ""}
                    readOnly
                    className="h-9 border-white/10 bg-white/[0.03] text-white"
                  />
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Verified Payout Account
                  </p>
                  <Select value={createPayoutAccountId} onValueChange={setCreatePayoutAccountId}>
                    <SelectTrigger className="h-9 border table-border table-bg text-white">
                      <SelectValue placeholder={payoutAccountsQ.isLoading ? "Loading accounts..." : "Choose account"} />
                    </SelectTrigger>
                    <SelectContent className="border table-border table-bg-alt text-white">
                      {verifiedPayoutAccounts.map((account) => (
                        <SelectItem key={account.payoutAccountId} value={String(account.payoutAccountId)}>
                          {account.provider} • {account.walletIdentifier || "wallet"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Currency</p>
                  <Input
                    value={createCurrency}
                    onChange={(event) => setCreateCurrency(event.target.value.toUpperCase())}
                    placeholder="NPR"
                    className="h-9 border-white/10 bg-white/[0.03] text-white"
                  />
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Mode</p>
                  <Input
                    value={selectedSettlementIds.size > 0 ? `${selectedSettlementIds.size} selected rows` : "Date range"}
                    readOnly
                    className="h-9 border-white/10 bg-white/[0.03] text-white"
                  />
                </div>
              </div>

              {selectedSettlementIds.size === 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Visit from</p>
                      <CustomDatePicker
                        nestedInDialog
                        value={createDateFrom}
                        onChange={(v) => setCreateDateFrom(v)}
                        placeholder="Optional start"
                        className="border-white/10 bg-white/[0.03]"
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Visit to</p>
                      <CustomDatePicker
                        nestedInDialog
                        value={createDateTo}
                        onChange={(v) => setCreateDateTo(v)}
                        placeholder="Optional end"
                        className="border-white/10 bg-white/[0.03]"
                      />
                    </div>
                  </div>

                  {/* Preview summary for date-range mode */}
                  {(createDateFrom || createDateTo) && (
                    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-orange-200">
                        Preview: Pending settlements in range
                      </p>
                      {wizardDateRangePreviewQ.isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading preview...
                        </div>
                      ) : wizardDateRangePreviewQ.isError ? (
                        <p className="text-sm text-red-300">Failed to load preview</p>
                      ) : wizardPreviewSummary ? (
                        <div className="space-y-1 text-sm text-zinc-200">
                          <p>
                            <span className="font-bold text-white">{wizardPreviewSummary.count}</span> pending rows
                            {wizardPreviewSummary.totalAvailable > wizardPreviewSummary.count && (
                              <span className="text-zinc-400"> (of {wizardPreviewSummary.totalAvailable} total)</span>
                            )}
                          </p>
                          <p>
                            Gross Revenue: <span className="font-semibold text-white">{formatMoney(wizardPreviewSummary.gross, wizardPreviewSummary.currency)}</span>
                            {" • "}Commission: {formatMoney(wizardPreviewSummary.commission, wizardPreviewSummary.currency)}
                            {" • "}Net Revenue: <span className="font-semibold text-emerald-300">{formatMoney(wizardPreviewSummary.net, wizardPreviewSummary.currency)}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400">No pending settlements found for this date range</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-orange-200">
                    Selected Settlements Summary
                  </p>
                  <div className="space-y-1 text-sm text-zinc-200">
                    <p>
                      <span className="font-bold text-white">{selectedSettlementIds.size}</span> rows selected
                    </p>
                    <p>
                      Gross Revenue: <span className="font-semibold text-white">{formatMoney(selectedSummary.gross, selectedSummary.currency)}</span>
                      {" • "}Commission: {formatMoney(selectedSummary.commission, selectedSummary.currency)}
                      {" • "}Net Revenue: <span className="font-semibold text-emerald-300">{formatMoney(selectedSummary.net, selectedSummary.currency)}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Note</p>
                <Textarea
                  value={createNote}
                  onChange={(event) => setCreateNote(event.target.value)}
                  placeholder="Optional note for finance and gym review"
                  className="min-h-[90px] rounded-xl border table-border table-bg text-white placeholder:table-text-muted transition-all focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] focus-visible:outline-none"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <button type="button" className={MG_DIALOG_OUTLINE} onClick={() => closePayoutWizard()}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400 disabled:opacity-50"
                  onClick={goToPaymentStep}
                  disabled={
                    payoutAccountsQ.isLoading ||
                    (selectedSettlementIds.size === 0 && wizardDateRangePreviewQ.isLoading)
                  }
                >
                  {selectedSettlementIds.size === 0 && wizardDateRangePreviewQ.isLoading
                    ? "Loading preview..."
                    : "Next"}
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Transaction reference <span className="font-normal normal-case text-zinc-600">(optional)</span>
                  </p>
                  <Input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    placeholder="Bank / eSewa / Khalti transaction id"
                    className="h-9 rounded-full border table-border table-bg px-3 text-[13px] text-white placeholder:table-text-muted transition-all focus-visible:border-orange-500/40 focus-visible:shadow-[0_0_0_3px_rgba(255,106,0,0.15)]"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                    Receipt image <span className="font-normal normal-case text-zinc-600">(optional)</span>
                  </p>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="h-9 cursor-pointer rounded-full border table-border table-bg text-sm text-zinc-300 transition-all file:mr-3 file:rounded-md file:border-0 file:bg-orange-500/20 file:px-3 file:py-1 file:text-[11px] file:font-bold file:text-orange-100 hover:border-orange-500/30"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setPaymentProofFile(file);
                    }}
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">PNG, JPG, or WebP. Omitted if you skip the file.</p>
                </div>
                {paymentProofPreviewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    <img src={paymentProofPreviewUrl} alt="Receipt preview" className="max-h-48 w-full object-contain" />
                  </div>
                ) : null}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className={cn(MG_DIALOG_OUTLINE, payoutSubmitPending && "opacity-50")}
                  onClick={() => setPayoutWizardStep(0)}
                  disabled={payoutSubmitPending}
                >
                  Back
                </button>
                <button
                  type="button"
                  className={cn(MG_DIALOG_OUTLINE, payoutSubmitPending && "opacity-50")}
                  onClick={() => closePayoutWizard()}
                  disabled={payoutSubmitPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-orange-500 px-5 py-[7px] text-[12px] font-bold text-white transition-all hover:bg-orange-400 disabled:opacity-50"
                  onClick={submitPayoutWithProof}
                  disabled={payoutSubmitPending}
                >
                  {payoutSubmitPending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </span>
                  ) : (
                    "Create batch"
                  )}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
