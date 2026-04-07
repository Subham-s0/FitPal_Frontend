import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Dumbbell,
  Eye,
  Loader2,
  MoreVertical,
  RefreshCcw,
  Search,
  Shield,
  SlidersHorizontal,
  UserCheck,
  UserX,
  User,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  getAdminUserCountsApi,
  getAdminUserDetailApi,
  getAdminUsersApi,
  putAdminUserSuspendApi,
  putAdminUserUnsuspendApi,
} from "@/features/admin/admin-user.api";
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
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import type {
  AdminAccountRole,
  AdminUserDetailResponse,
  AdminUserSortField,
  AdminUserSummaryResponse,
} from "@/features/admin/admin-user.model";

const PAGE_SIZES = ["5", "10", "15"] as const;

const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const initials = (n?: string | null) =>
  (n ?? "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

/** Match Manage Gyms table: initials from gym name, else "GY" */
const gymInitials = (name: string) => {
  const raw = (name ?? "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return raw || "GY";
};

function AccountRowAvatar({ row }: { row: AdminUserSummaryResponse }) {
  const imageUrl =
    row.role === "GYM" ? row.gymLogoUrl : row.role === "USER" ? row.profileImageUrl : null;
  const label =
    row.role === "GYM" ? gymInitials(row.displayName) : row.role === "SUPERADMIN" ? initials(row.displayName) || "A" : initials(row.displayName);

  const fallbackCls =
    row.role === "GYM"
      ? "border-orange-500/25 bg-orange-500/10 text-orange-400"
      : row.role === "SUPERADMIN"
        ? "border-violet-500/25 bg-violet-500/10 text-violet-300"
        : "border-orange-500/25 bg-orange-500/10 text-orange-400";

  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-10 w-10 rounded-[10px] border border-orange-500/25 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fb) fb.classList.remove("hidden");
          }}
        />
      ) : null}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-[10px] border text-[12px] font-black ${fallbackCls} ${imageUrl ? "hidden" : ""}`}
      >
        {label}
      </div>
    </div>
  );
}

type RoleTab = "ALL" | AdminAccountRole;

type SortChoice = {
  label: string;
  Icon: React.ElementType;
  sortBy: AdminUserSortField;
  sortDirection: "ASC" | "DESC";
};

const SORTS: SortChoice[] = [
  { label: "Sort", Icon: ArrowUpDown, sortBy: "createdAt", sortDirection: "DESC" },
  { label: "Oldest", Icon: ArrowUp, sortBy: "createdAt", sortDirection: "ASC" },
  { label: "Newest", Icon: ArrowDown, sortBy: "createdAt", sortDirection: "DESC" },
  { label: "Email A→Z", Icon: ArrowUp, sortBy: "email", sortDirection: "ASC" },
  { label: "Email Z→A", Icon: ArrowDown, sortBy: "email", sortDirection: "DESC" },
];

function RolePill({ role }: { role: AdminAccountRole }) {
  const m: Record<AdminAccountRole, { label: string; dot: string; cls: string }> = {
    USER: { label: "Member", dot: "bg-green-500", cls: "bg-green-500/10 text-green-500 border-green-500/30" },
    GYM: { label: "Gym owner", dot: "bg-orange-500", cls: "bg-orange-500/10 text-orange-500 border-orange-500/30" },
    SUPERADMIN: { label: "Admin", dot: "bg-violet-500", cls: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
  };
  const cfg = m[role];
  return (
    <Badge className={cn("gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider", cfg.cls)}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function StatusPill({ active, emailVerified }: { active: boolean; emailVerified: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <Badge
        className={cn(
          "w-fit gap-1.5 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
          active ? "border-green-500/30 bg-green-500/10 text-green-500" : "border-red-500/30 bg-red-500/10 text-red-500"
        )}
      >
        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${active ? "bg-green-500" : "bg-red-500"}`} />
        {active ? "Active" : "Suspended"}
      </Badge>
      <span className="text-[10px] table-text-muted">
        Email:{" "}
        {emailVerified ? <span className="font-semibold text-green-400/90">Verified</span> : <span className="text-yellow-400">Unverified</span>}
      </span>
    </div>
  );
}

function MemberDetailBody({
  detail,
  onSuspendClick,
  onUnsuspend,
  suspendPending,
  unsuspendPending,
}: {
  detail: AdminUserDetailResponse;
  onSuspendClick: () => void;
  onUnsuspend: () => void;
  suspendPending: boolean;
  unsuspendPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start">
        <div className="relative h-20 w-20 flex-shrink-0">
          {detail.profileImageUrl ? (
            <img
              src={detail.profileImageUrl}
              alt=""
              className="h-20 w-20 rounded-2xl border border-orange-500/25 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const el = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (el) el.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-2xl border border-orange-500/25 bg-orange-500/10 text-xl font-black text-orange-400 ${
              detail.profileImageUrl ? "hidden" : ""
            }`}
          >
            {initials([detail.firstName, detail.lastName].filter(Boolean).join(" ") || detail.userName || detail.email)}
          </div>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="text-lg font-black text-white">
            {[detail.firstName, detail.lastName].filter(Boolean).join(" ") || detail.userName || "Member"}
          </h3>
          <p className="truncate text-sm text-blue-400/95">{detail.email}</p>
          {detail.userName && <p className="text-xs table-text-muted">@{detail.userName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Status</p>
          <p className="font-semibold text-white">{detail.active ? "Active" : "Suspended"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Email verified</p>
          <p className="font-semibold">{detail.emailVerified ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Joined</p>
          <p className="font-semibold">{fmtDateTime(detail.createdAt)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Account</p>
          <p className="font-mono text-xs">#{detail.accountId}</p>
        </div>
        {detail.phoneNo && (
          <div className="col-span-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-[hsl(0,0%,40%)]">Phone</p>
            <p className="font-semibold">{detail.phoneNo}</p>
          </div>
        )}
      </div>

      <DialogFooter className="flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
        {detail.active ? (
          <Button
            type="button"
            variant="destructive"
            className="w-full border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25 sm:w-auto"
            disabled={suspendPending}
            onClick={onSuspendClick}
          >
            {suspendPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserX className="mr-2 h-4 w-4" />}
            Suspend member
          </Button>
        ) : (
          <Button
            type="button"
            className="w-full bg-green-600 text-white hover:bg-green-500 sm:w-auto"
            disabled={unsuspendPending}
            onClick={onUnsuspend}
          >
            {unsuspendPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
            Unsuspend member
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

export default function ManageUsers() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [roleTab, setRoleTab] = useState<RoleTab>("ALL");
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortIdx, setSortIdx] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const [dialogAccountId, setDialogAccountId] = useState<number | null>(null);
  const [summaryForDialog, setSummaryForDialog] = useState<AdminUserSummaryResponse | null>(null);
  const [suspendTargetId, setSuspendTargetId] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [roleTab, debounced, pageSize, activeFilter]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const sort = SORTS[sortIdx] ?? SORTS[0];

  const usersQ = useQuery({
    queryKey: ["admin-users", roleTab, debounced, page, pageSize, activeFilter, sort.sortBy, sort.sortDirection],
    queryFn: () =>
      getAdminUsersApi({
        role: roleTab === "ALL" ? undefined : roleTab,
        active: activeFilter === null ? undefined : activeFilter,
        query: debounced || undefined,
        page,
        size: pageSize,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      }),
    placeholderData: (prev) => prev,
  });

  const countsQ = useQuery({
    queryKey: ["admin-user-counts"],
    queryFn: getAdminUserCountsApi,
    staleTime: 30_000,
  });

  const detailQ = useQuery({
    queryKey: ["admin-user-detail", dialogAccountId],
    queryFn: () => getAdminUserDetailApi(dialogAccountId as number),
    enabled: dialogAccountId !== null,
  });

  const suspendMut = useMutation({
    mutationFn: putAdminUserSuspendApi,
    onSuccess: (data) => {
      qc.setQueryData(["admin-user-detail", data.accountId], data);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-user-counts"] });
      setSuspendTargetId(null);
      toast.success("Member suspended");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not suspend")),
  });

  const unsuspendMut = useMutation({
    mutationFn: putAdminUserUnsuspendApi,
    onSuccess: (data) => {
      qc.setQueryData(["admin-user-detail", data.accountId], data);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-user-counts"] });
      toast.success("Member reactivated");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "Could not unsuspend")),
  });

  const openDialog = (row: AdminUserSummaryResponse) => {
    setSummaryForDialog(row);
    setDialogAccountId(row.accountId);
  };

  const closeDialog = () => {
    setDialogAccountId(null);
    setSummaryForDialog(null);
  };

  const items = usersQ.data?.items ?? [];
  const total = usersQ.data?.totalItems ?? 0;
  const totalPages = Math.max(usersQ.data?.totalPages ?? 0, 1);
  const SortIcon = sort.Icon;
  const ct = countsQ.data;

  const refresh = async () => {
    await Promise.all([usersQ.refetch(), countsQ.refetch()]);
    if (dialogAccountId) await detailQ.refetch();
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebounced("");
    setSortIdx(0);
    setRoleTab("ALL");
    setActiveFilter(null);
    setFilterOpen(false);
    setPage(0);
  };

  const switchRoleTab = (r: RoleTab) => {
    setRoleTab(r);
    setFilterOpen(false);
  };

  const TABS: { key: RoleTab; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: ct?.total ?? 0 },
    { key: "USER", label: "Members", count: ct?.userRole ?? 0 },
    { key: "GYM", label: "Gym owners", count: ct?.gymRole ?? 0 },
    { key: "SUPERADMIN", label: "Admins", count: ct?.superAdminRole ?? 0 },
  ];

  const COL_W = ["24%", "12%", "14%", "14%", "12%", "10%", "8%", "6%"];
  const colStyle = (i: number) => ({ width: COL_W[i] });

  const hasActiveFilters =
    searchInput.length > 0 || sortIdx !== 0 || roleTab !== "ALL" || activeFilter !== null || filterOpen;

  const detail = detailQ.data;
  const dialogRole = detail?.role ?? summaryForDialog?.role;

  return (
    <div className="space-y-5 font-['Outfit',system-ui,sans-serif]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Manage <span style={fireStyle}>Users</span>
          </h1>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={usersQ.isFetching || countsQ.isFetching}
            className="flex items-center gap-1.5 rounded-full border table-border table-bg table-text px-3.5 py-[7px] text-[12px] font-bold transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {usersQ.isFetching || countsQ.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards — role filters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TABS.map(({ key, label, count }) => {
          const active = roleTab === key;
          const styles =
            key === "ALL"
              ? { border: "border-white/15", bg: "bg-white/[0.03]", accent: "text-white" }
              : key === "USER"
                ? { border: "border-green-500/25", bg: "bg-green-500/[0.06]", accent: "text-green-400" }
                : key === "GYM"
                  ? { border: "border-orange-500/25", bg: "bg-orange-500/[0.06]", accent: "text-orange-400" }
                  : { border: "border-violet-500/25", bg: "bg-violet-500/[0.06]", accent: "text-violet-300" };
          const Icon = key === "ALL" ? Users : key === "USER" ? User : key === "GYM" ? Dumbbell : Shield;
          return (
            <button
              key={key}
              type="button"
              onClick={() => switchRoleTab(key)}
              className={`rounded-2xl border p-4 text-left transition-all ${styles.border} ${styles.bg} ${
                active ? "ring-2 ring-orange-500/40" : "hover:border-white/20"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Icon className={`h-5 w-5 ${styles.accent}`} />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? "bg-white/10 text-white" : "bg-black/20 table-text-muted"}`}>
                  {count}
                </span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">{label}</p>
              <p className={`mt-0.5 text-2xl font-black ${active ? "text-white" : "table-text"}`}>{count}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative max-w-[300px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 table-text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, email, username, gym…"
            className="w-full rounded-full border table-border table-bg py-2 pl-9 pr-4 text-[13px] font-medium text-white placeholder:table-text-muted outline-none transition-all focus:border-orange-500/40 focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)]"
          />
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSortIdx((i) => (i + 1) % SORTS.length)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[12px] font-bold transition-all ${
              sortIdx !== 0 ? "border-orange-500/30 bg-orange-500/10 text-orange-400" : "table-border table-bg table-text hover:border-orange-500/30 hover:text-orange-400"
            }`}
          >
            <SortIcon className="h-3.5 w-3.5" />
            {sort.label}
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
              Filter
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] rounded-2xl border table-border table-bg p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                <div className="px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">Role</div>
                {TABS.map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchRoleTab(key)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition-colors ${
                      roleTab === key ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-[12px] font-semibold table-text">{label}</span>
                    <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-black table-text-muted">{count}</span>
                  </button>
                ))}
                <div className="mt-1 border-t border-[hsl(0,0%,13%)] px-2.5 py-2 text-[8px] font-black uppercase tracking-widest table-text-muted">
                  Account status
                </div>
                {(
                  [
                    { v: null as boolean | null, label: "All" },
                    { v: true, label: "Active only" },
                    { v: false, label: "Suspended only" },
                  ] as const
                ).map(({ v, label }) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setActiveFilter(v)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition-colors ${
                      activeFilter === v ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-[12px] font-semibold table-text">{label}</span>
                    {activeFilter === v && <Check className="h-3.5 w-3.5 text-orange-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-[34px] w-auto rounded-full border table-border table-bg px-3.5 text-[12px] font-bold table-text focus:ring-orange-500/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="table-border table-bg-alt text-white">
              {PAGE_SIZES.map((v) => (
                <SelectItem key={v} value={v} className="text-[12px] focus:bg-white/[0.06]">
                  {v} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <span className="font-semibold text-white">{total}</span> account{total !== 1 ? "s" : ""} match your filters
        </p>
      )}

      <div className="overflow-hidden rounded-[18px] border table-border table-bg">
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="table-header-bg border-b table-border">
              {["User", "Role", "Status", "Email", "Created", "Account", "IDs", "Actions"].map((h, i) => (
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
            {usersQ.isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-orange-500" />
                  <div className="text-[13px] table-text-muted">Loading users…</div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 table-text-muted" strokeWidth={1.5} />
                  <div className="text-[16px] font-bold table-text">{debounced ? "No results found" : "No accounts here"}</div>
                  <div className="mt-1 text-[13px] table-text-muted">
                    {debounced ? `Nothing matches "${debounced}"` : "This list is currently empty"}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr key={u.accountId} className="table-border-row border-b transition-colors last:border-0 hover:bg-white/[0.025]">
                  <td className="px-3.5 py-3.5 pl-5" style={colStyle(0)}>
                    <div className="flex items-center gap-2.5">
                      <AccountRowAvatar row={u} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-bold">{u.displayName}</div>
                        <div className="mt-0.5 truncate text-[11px] table-text-muted">{u.secondaryLine}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3.5" style={colStyle(1)}>
                    <RolePill role={u.role} />
                  </td>
                  <td className="px-3.5 py-3.5" style={colStyle(2)}>
                    <StatusPill active={u.active} emailVerified={u.emailVerified} />
                  </td>
                  <td className="px-3.5 py-3.5" style={colStyle(3)}>
                    <div className="truncate text-[12px] font-semibold text-blue-400/95">{u.email}</div>
                  </td>
                  <td className="table-text truncate px-3.5 py-3.5 text-[12px]" style={colStyle(4)}>
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="table-text-muted truncate px-3.5 py-3.5 font-mono text-[11px]" style={colStyle(5)}>
                    #{u.accountId}
                  </td>
                  <td className="px-3.5 py-3.5 text-[11px] table-text-muted" style={colStyle(6)}>
                    {u.userId != null && <div>User #{u.userId}</div>}
                    {u.gymId != null && <div>Gym #{u.gymId}</div>}
                    {u.userId == null && u.gymId == null && "—"}
                  </td>
                  <td className="px-2 py-3.5 text-right" style={colStyle(7)}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 border-white/10 bg-[#0f0f0f] text-white">
                        <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer" onClick={() => openDialog(u)}>
                          <Eye className="mr-2 h-4 w-4" /> View details
                        </DropdownMenuItem>
                        {u.role === "USER" && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {u.active ? (
                              <DropdownMenuItem
                                className="text-red-400 focus:bg-red-500/15 focus:text-red-300 cursor-pointer"
                                onClick={() => setSuspendTargetId(u.accountId)}
                              >
                                <UserX className="mr-2 h-4 w-4" /> Suspend
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-400 focus:bg-green-500/15 focus:text-green-300 cursor-pointer"
                                onClick={() => unsuspendMut.mutate(u.accountId)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" /> Reactivate
                              </DropdownMenuItem>
                            )}
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

      <div className="flex flex-col gap-3 border-t table-border-cell pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] table-text-muted">
          {debounced ? `Search: "${debounced}"` : "Use stat cards to filter by account type"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page === 0 || usersQ.isFetching}
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
            disabled={!usersQ.data?.hasNext || usersQ.isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border table-border table-bg px-4 py-1.5 text-[11px] font-bold table-text transition-all hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      <Dialog open={dialogAccountId !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Account details</DialogTitle>
            <DialogDescription className="text-[13px] text-[hsl(0,0%,50%)]">
              {dialogRole === "USER" && "Member profile — suspend or reactivate from here."}
              {dialogRole === "GYM" && "Gym owner account — full gym onboarding lives under Manage Gyms."}
              {dialogRole === "SUPERADMIN" && "Administrator account — read only."}
            </DialogDescription>
          </DialogHeader>

          {detailQ.isLoading && (
            <div className="flex items-center justify-center gap-2 py-12">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              <span className="text-sm table-text-muted">Loading…</span>
            </div>
          )}

          {detailQ.isError && !detailQ.isLoading && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
              {getApiErrorMessage(detailQ.error, "Could not load account details")}
            </p>
          )}

          {!detailQ.isLoading && detail && dialogRole === "USER" && (
            <MemberDetailBody
              detail={detail}
              suspendPending={suspendMut.isPending}
              unsuspendPending={unsuspendMut.isPending}
              onSuspendClick={() => setSuspendTargetId(detail.accountId)}
              onUnsuspend={() => unsuspendMut.mutate(detail.accountId)}
            />
          )}

          {!detailQ.isLoading && detail && dialogRole === "GYM" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-4">
                <div className="flex items-center gap-3">
                  {detail.gymLogoUrl ? (
                    <img
                      src={detail.gymLogoUrl}
                      alt=""
                      className="h-14 w-14 flex-shrink-0 rounded-[12px] border border-orange-500/30 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const el = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (el) el.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[12px] border border-orange-500/30 bg-orange-500/15 text-lg font-black text-orange-400 ${detail.gymLogoUrl ? "hidden" : ""}`}
                  >
                    {gymInitials(detail.gymName ?? "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-orange-200/95">Gym profile &amp; approvals</p>
                    {detail.gymName && (
                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {detail.gymName}
                        <span className="ml-2 font-mono text-xs table-text-muted">#{detail.gymId}</span>
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-xs text-blue-400/90">{detail.email}</p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-[hsl(0,0%,65%)]">
                  Documents, location, payouts, and approval workflow are handled on the{" "}
                  <span className="font-semibold text-white">Manage Gyms</span> page.
                </p>
              </div>
              <Button
                type="button"
                className="w-full bg-orange-600 text-white hover:bg-orange-500"
                onClick={() => {
                  closeDialog();
                  navigate("/admin/dashboard", { state: { activeSection: "gyms" } });
                }}
              >
                <Dumbbell className="mr-2 h-4 w-4" />
                Open Manage Gyms
              </Button>
            </div>
          )}

          {!detailQ.isLoading && detail && dialogRole === "SUPERADMIN" && (
            <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
              <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" />
              <div>
                <p className="text-sm font-semibold text-white">{detail.email}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[hsl(0,0%,60%)]">
                  This is a platform administrator. Suspension is not available from this screen.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={suspendTargetId !== null} onOpenChange={(open) => !open && setSuspendTargetId(null)}>
        <AlertDialogContent className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,7%)] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend member?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(0,0%,55%)]">
              They will be signed out and blocked from signing in until reactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,12%)] text-white hover:bg-[hsl(0,0%,16%)]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={(e) => {
                e.preventDefault();
                if (suspendTargetId !== null) suspendMut.mutate(suspendTargetId);
              }}
            >
              {suspendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suspend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
