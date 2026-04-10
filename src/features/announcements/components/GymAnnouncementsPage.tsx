import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Clock3,
  Eye,
  Loader2,
  Megaphone,
  MoreVertical,
  PencilLine,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createGymAnnouncementApi,
  getGymAnnouncementApi,
  getGymAnnouncementsApi,
  getGymAnnouncementStatsApi,
  submitGymAnnouncementApi,
  updateGymAnnouncementApi,
} from "@/features/announcements/api";
import { AnnouncementDetailDialog } from "@/features/announcements/components/AnnouncementDetailDialog";
import {
  AnnouncementEditorDialog,
  type GymAnnouncementEditorValue,
} from "@/features/announcements/components/AnnouncementEditorDialog";
import { AnnouncementStatusBadge } from "@/features/announcements/components/AnnouncementStatusBadge";
import type {
  AnnouncementDetailResponse,
  AnnouncementPublishStatus,
  AnnouncementReviewStatus,
  AnnouncementSummaryResponse,
  GymAnnouncementUpsertRequest,
} from "@/features/announcements/model";
import { getApiErrorMessage, queryClient } from "@/shared/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/lib/utils";

const fireStyle = {
  background: "var(--gradient-fire)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

/** Pill button constants – identical to GymQRPage */
const TB_BASE =
  "flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] transform-gpu will-change-transform";
const TB_IDLE =
  "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]";
const TB_ACTIVE = "border-orange-500/50 bg-orange-500/[0.12] text-orange-300";

const DEFAULT_EDITOR: GymAnnouncementEditorValue = {
  title: "",
  content: "",
  scheduledAt: "",
  expiresAt: "",
};

const DEFAULT_SIZE = 8;

type GymAnnouncementSortMode = "NEWEST" | "OLDEST" | "UPDATED" | "TITLE_A_Z" | "TITLE_Z_A";

const SORT_OPTIONS: { value: GymAnnouncementSortMode; label: string }[] = [
  { value: "NEWEST", label: "Newest first" },
  { value: "OLDEST", label: "Oldest first" },
  { value: "UPDATED", label: "Recently updated" },
  { value: "TITLE_A_Z", label: "Title A–Z" },
  { value: "TITLE_Z_A", label: "Title Z–A" },
];

const toSortParams = (sort: GymAnnouncementSortMode) => {
  switch (sort) {
    case "OLDEST":
      return { sortBy: "createdAt" as const, sortDirection: "ASC" as const };
    case "UPDATED":
      return { sortBy: "updatedAt" as const, sortDirection: "DESC" as const };
    case "TITLE_A_Z":
      return { sortBy: "title" as const, sortDirection: "ASC" as const };
    case "TITLE_Z_A":
      return { sortBy: "title" as const, sortDirection: "DESC" as const };
    case "NEWEST":
    default:
      return { sortBy: "createdAt" as const, sortDirection: "DESC" as const };
  }
};

const toDateTimeLocalValue = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => (value.trim() ? new Date(value).toISOString() : null);

const formatDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const canEdit = (announcement: AnnouncementSummaryResponse) =>
  announcement.publishStatus !== "PUBLISHED" &&
  announcement.publishStatus !== "EXPIRED" &&
  announcement.reviewStatus !== "PENDING" &&
  announcement.reviewStatus !== "APPROVED";

const canSubmit = (announcement: AnnouncementSummaryResponse) =>
  announcement.publishStatus !== "PUBLISHED" &&
  announcement.publishStatus !== "EXPIRED" &&
  announcement.reviewStatus !== "PENDING" &&
  announcement.reviewStatus !== "APPROVED";

const toEditorValue = (detail?: AnnouncementDetailResponse | null): GymAnnouncementEditorValue =>
  detail
    ? {
        title: detail.title,
        content: detail.content,
        scheduledAt: toDateTimeLocalValue(detail.scheduledAt),
        expiresAt: toDateTimeLocalValue(detail.expiresAt),
      }
    : DEFAULT_EDITOR;

const COL_W = ["42%", "13%", "13%", "13%", "13%", "6%"];

export default function GymAnnouncementsPage() {
  const [query, setQuery] = useState("");
  const [reviewStatus, setReviewStatus] = useState<AnnouncementReviewStatus | undefined>(undefined);
  const [publishStatus, setPublishStatus] = useState<AnnouncementPublishStatus | undefined>(undefined);
  const [sort, setSort] = useState<GymAnnouncementSortMode>("NEWEST");
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorValue, setEditorValue] = useState<GymAnnouncementEditorValue>(DEFAULT_EDITOR);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailView, setDetailView] = useState<AnnouncementDetailResponse | null>(null);

  /** Close floating panels on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-ann-select='true']")) return;
      if (filterRef.current && !filterRef.current.contains(target)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const listQuery = useQuery({
    queryKey: ["gym-announcements", query, reviewStatus, publishStatus, sort, page],
    queryFn: () =>
      getGymAnnouncementsApi({
        query: query.trim() || undefined,
        reviewStatus,
        publishStatus,
        ...toSortParams(sort),
        page,
        size: DEFAULT_SIZE,
      }),
    staleTime: 15_000,
  });

  const statsQuery = useQuery({
    queryKey: ["gym-announcements", "stats"],
    queryFn: getGymAnnouncementStatsApi,
    staleTime: 20_000,
  });

  const currentSortLabel = useMemo(
    () => SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Sort",
    [sort]
  );

  const activeFilterCount = Number(reviewStatus != null) + Number(publishStatus != null);
  const hasAnyFilter = query.trim().length > 0 || activeFilterCount > 0 || sort !== "NEWEST";
  const stats = statsQuery.data;
  const items = listQuery.data?.items ?? [];
  const totalPages = Math.max(listQuery.data?.totalPages ?? 1, 1);
  const currentPage = listQuery.data?.page ?? 0;

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["gym-announcements"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: GymAnnouncementUpsertRequest) =>
      editingId ? updateGymAnnouncementApi(editingId, payload) : createGymAnnouncementApi(payload),
    onSuccess: async () => {
      await invalidateAll();
      setEditorOpen(false);
      setEditingId(null);
      setEditorValue(DEFAULT_EDITOR);
      toast.success("Announcement draft saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to save announcement")),
  });

  const submitMutation = useMutation({
    mutationFn: submitGymAnnouncementApi,
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Announcement submitted for admin review");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to submit announcement")),
  });

  const loadDetail = async (announcementId: number) =>
    queryClient.fetchQuery({
      queryKey: ["gym-announcement-detail", announcementId],
      queryFn: () => getGymAnnouncementApi(announcementId),
    });

  const openCreate = () => {
    setEditingId(null);
    setEditorValue(DEFAULT_EDITOR);
    setEditorOpen(true);
  };

  const openEdit = async (announcementId: number) => {
    try {
      const detail = await loadDetail(announcementId);
      setEditingId(announcementId);
      setEditorValue(toEditorValue(detail));
      setEditorOpen(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load announcement"));
    }
  };

  const openDetail = async (announcementId: number) => {
    try {
      setDetailView(await loadDetail(announcementId));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load announcement"));
    }
  };

  const submitEditor = () => {
    saveMutation.mutate({
      title: editorValue.title.trim(),
      content: editorValue.content.trim(),
      scheduledAt: toIsoOrNull(editorValue.scheduledAt),
      expiresAt: toIsoOrNull(editorValue.expiresAt),
    });
  };

  const clearFilters = () => {
    setQuery("");
    setReviewStatus(undefined);
    setPublishStatus(undefined);
    setSort("NEWEST");
    setPage(0);
    setFilterOpen(false);
    setSortOpen(false);
  };

  return (
    <div className="space-y-5 font-['Outfit',system-ui,sans-serif]">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Gym <span style={fireStyle}>Announcements</span>
          </h1>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void Promise.all([listQuery.refetch(), statsQuery.refetch()])}
            disabled={listQuery.isFetching || statsQuery.isFetching}
            className={`${TB_BASE} ${TB_IDLE} disabled:opacity-50`}
          >
            {listQuery.isFetching || statsQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="btn-fire flex items-center gap-1.5 rounded-full border-0 px-4 py-[7px] text-[12px]"
          >
            <Megaphone className="h-4 w-4" />
            New draft
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[102px] animate-pulse rounded-2xl border table-border table-bg" />
          ))
        ) : (
          <>
            <div className="flex min-h-[102px] flex-col rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-3.5">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 flex-shrink-0 text-orange-400" />
                <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Total</p>
              </div>
              <div className="mt-2.5 flex min-h-[28px] items-center">
                <p className="text-2xl font-black leading-none text-white">{stats?.totalAnnouncements ?? 0}</p>
              </div>
            </div>
            <div className="flex min-h-[102px] flex-col rounded-2xl border border-white/15 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2">
                <TimerReset className="h-4 w-4 flex-shrink-0 table-text-muted" />
                <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Drafts</p>
              </div>
              <div className="mt-2.5 flex min-h-[28px] items-center">
                <p className="text-2xl font-black leading-none table-text">{stats?.draftCount ?? 0}</p>
              </div>
              <p className="mt-1 text-[10px] table-text-muted">Editable before submission</p>
            </div>
            <div className="flex min-h-[102px] flex-col rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Awaiting approval</p>
              </div>
              <div className="mt-2.5 flex min-h-[28px] items-center">
                <p className="text-2xl font-black leading-none text-white">{stats?.pendingApprovalCount ?? 0}</p>
              </div>
              <p className="mt-1 text-[10px] table-text-muted">{stats?.approvedCount ?? 0} already approved</p>
            </div>
            <div className="flex min-h-[102px] flex-col rounded-2xl border border-white/15 bg-white/[0.03] p-3.5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 flex-shrink-0 table-text-muted" />
                <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">Live &amp; scheduled</p>
              </div>
              <div className="mt-2.5 flex min-h-[28px] items-center">
                <p className="text-2xl font-black leading-none table-text">
                  {(stats?.publishedCount ?? 0) + (stats?.scheduledCount ?? 0)}
                </p>
              </div>
              <p className="mt-1 text-[10px] table-text-muted">{stats?.rejectedCount ?? 0} rejected for revision</p>
            </div>
          </>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b table-border pb-4">
        {/* Search */}
        <div className="relative max-w-[300px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 table-text-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search your announcement drafts"
            className="h-9 w-full rounded-full border table-border table-bg pl-9 pr-4 text-[12px] font-medium text-white placeholder:table-text-muted outline-none transition-all focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.12)]"
          />
        </div>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {/* ── Filter panel ── */}
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => { setFilterOpen((v) => !v); setSortOpen(false); }}
              className={`${TB_BASE} ${filterOpen || activeFilterCount > 0 ? TB_ACTIVE : TB_IDLE}`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-orange-500/20 px-1 text-[9px] font-black text-orange-400">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[240px] rounded-2xl border table-border table-bg p-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)] space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest table-text-muted">Filters</p>

                <Select
                  value={reviewStatus ?? "ALL"}
                  onValueChange={(v) => {
                    setReviewStatus(v === "ALL" ? undefined : (v as AnnouncementReviewStatus));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                    <SelectValue placeholder="All reviews" />
                  </SelectTrigger>
                  <SelectContent data-ann-select="true" className="border table-border table-bg-alt text-white">
                    <SelectItem value="ALL">All reviews</SelectItem>
                    <SelectItem value="NOT_SUBMITTED">Not submitted</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={publishStatus ?? "ALL"}
                  onValueChange={(v) => {
                    setPublishStatus(v === "ALL" ? undefined : (v as AnnouncementPublishStatus));
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                    <SelectValue placeholder="All publish states" />
                  </SelectTrigger>
                  <SelectContent data-ann-select="true" className="border table-border table-bg-alt text-white">
                    <SelectItem value="ALL">All publish states</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>

                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setReviewStatus(undefined);
                      setPublishStatus(undefined);
                      setPage(0);
                      setFilterOpen(false);
                    }}
                    className={`${TB_BASE} w-full justify-center border-orange-500/30 text-orange-400 hover:bg-orange-500/10`}
                  >
                    <X className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Sort panel ── */}
          <div ref={sortRef} className="relative">
            <button
              type="button"
              onClick={() => { setSortOpen((v) => !v); setFilterOpen(false); }}
              className={`${TB_BASE} ${sortOpen || sort !== "NEWEST" ? TB_ACTIVE : TB_IDLE}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {currentSortLabel}
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] rounded-2xl border table-border table-bg p-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)] space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest table-text-muted">Sort by</p>
                <Select
                  value={sort}
                  onValueChange={(v) => {
                    setSort(v as GymAnnouncementSortMode);
                    setPage(0);
                    setSortOpen(false);
                  }}
                >
                  <SelectTrigger className="h-9 w-full rounded-full border table-border table-bg px-3 text-[12px] font-bold text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent data-ann-select="true" className="border table-border table-bg-alt text-white">
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Clear all */}
          <button
            type="button"
            onClick={clearFilters}
            className={cn(
              `${TB_BASE}`,
              hasAnyFilter
                ? "border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                : `${TB_IDLE} opacity-50`
            )}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-[18px] border table-border table-bg">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="table-header-bg border-b table-border">
              {["Announcement", "Publish", "Review", "Scheduled", "Published", ""].map((h, i) => (
                <th
                  key={`${h}-${i}`}
                  style={{ width: COL_W[i] }}
                  className="px-3.5 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] table-text-muted first:pl-5"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-orange-500" />
                  <div className="text-[13px] table-text-muted">Loading announcements...</div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Megaphone className="mx-auto mb-2 h-8 w-8 table-text-muted" strokeWidth={1.5} />
                  <div className="text-[16px] font-bold table-text">
                    {query ? "No results found" : "No announcements yet"}
                  </div>
                  <div className="mt-1 text-[13px] table-text-muted">
                    {query
                      ? `Nothing matches "${query}"`
                      : "Create a draft to start sending follower broadcasts after admin approval"}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((ann) => (
                <tr
                  key={ann.announcementId}
                  className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]"
                >
                  <td className="px-3.5 py-3.5 pl-5" style={{ width: COL_W[0] }}>
                    <button
                      type="button"
                      onClick={() => void openDetail(ann.announcementId)}
                      className="text-left transition-colors hover:text-orange-300"
                    >
                      <div className="truncate text-[14px] font-bold text-white">{ann.title}</div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] table-text-muted">{ann.excerpt}</div>
                    </button>
                  </td>
                  <td className="px-3.5 py-3.5" style={{ width: COL_W[1] }}>
                    <AnnouncementStatusBadge value={ann.publishStatus} />
                  </td>
                  <td className="px-3.5 py-3.5" style={{ width: COL_W[2] }}>
                    <AnnouncementStatusBadge value={ann.reviewStatus} tone="review" />
                  </td>
                  <td className="px-3.5 py-3.5 text-[12px] table-text" style={{ width: COL_W[3] }}>
                    {formatDate(ann.scheduledAt) ?? <span className="table-text-muted">—</span>}
                  </td>
                  <td className="px-3.5 py-3.5 text-[12px] table-text" style={{ width: COL_W[4] }}>
                    {formatDate(ann.publishedAt) ?? <span className="table-text-muted">—</span>}
                  </td>
                  <td className="px-2 py-3.5 text-right" style={{ width: COL_W[5] }}>
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
                        <DropdownMenuItem
                          className="cursor-pointer focus:bg-white/10 focus:text-white"
                          onClick={() => void openDetail(ann.announcementId)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canEdit(ann) && (
                          <DropdownMenuItem
                            className="cursor-pointer focus:bg-white/10 focus:text-white"
                            onClick={() => void openEdit(ann.announcementId)}
                          >
                            <PencilLine className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        )}
                        {canSubmit(ann) && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              className="cursor-pointer focus:bg-white/10 focus:text-white"
                              onClick={() => submitMutation.mutate(ann.announcementId)}
                              disabled={submitMutation.isPending}
                            >
                              <Send className="mr-2 h-4 w-4" /> Submit for review
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex flex-col gap-3 border-t table-border-cell pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] table-text-muted">
          {query ? `Search: "${query}"` : "Filter by review or publish status above"}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!listQuery.data?.hasPrevious || listQuery.isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full border table-border table-bg px-3.5 py-1.5 text-[11px] font-bold table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="rounded-full border table-border table-bg-alt px-4 py-1.5 text-[11px] font-semibold text-white">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={!listQuery.data?.hasNext || listQuery.isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border table-border table-bg px-3.5 py-1.5 text-[11px] font-bold table-text transition-all hover:border-orange-500/30 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <AnnouncementEditorDialog
        mode="gym"
        open={editorOpen}
        editing={editingId != null}
        value={editorValue}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) {
            setEditingId(null);
            setEditorValue(DEFAULT_EDITOR);
          }
        }}
        onChange={setEditorValue}
        onSubmit={submitEditor}
        isSubmitting={saveMutation.isPending}
      />

      <AnnouncementDetailDialog
        open={detailView != null}
        announcement={detailView}
        onOpenChange={(open) => !open && setDetailView(null)}
      />
    </div>
  );
}
