import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Megaphone,
  MoreVertical,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Edit2,
  Zap,
} from "lucide-react";

import {
  getCmsAnnouncementsApi,
  createCmsAnnouncementApi,
  updateCmsAnnouncementApi,
  deleteCmsAnnouncementApi,
} from "@/features/admin/admin-settings.api";
import type {
  CmsAnnouncementResponse,
  CmsAnnouncementUpsertRequest,
} from "@/features/admin/admin-settings.model";
import { publicCmsHomeQueryKey } from "@/features/marketing/public-cms.api";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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

/* ── Shared styling ────────────────────────────────────────────────── */
const FIRE = "var(--gradient-fire)";
const fireStyle = {
  background: FIRE,
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  backgroundClip: "text" as const,
};

const inputCls =
  "h-9 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-600 focus:border-orange-500/50 focus:outline-none";

/* ── Status badge ────────────────────────────────────────────────── */
function StatusBadge({
  label,
  v,
}: {
  label: string;
  v: "green" | "amber" | "red" | "blue" | "violet" | "slate";
}) {
  const cls = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    amber: "bg-amber-500/10  text-amber-400  border-amber-500/25",
    red: "bg-red-500/10    text-red-400    border-red-500/25",
    blue: "bg-blue-500/10   text-blue-400   border-blue-500/25",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/25",
    slate: "bg-slate-500/10  text-slate-400  border-slate-500/25",
  }[v];
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
        cls
      )}
    >
      {label}
    </span>
  );
}

/* ── Dots menu ────────────────────────────────────────────────────── */
function Dots({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: { label: string; icon: React.ReactNode; fn: () => void }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white/30 transition hover:bg-white/10 hover:text-white"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 border-white/10 bg-[#0f0f0f] text-white"
      >
        {onEdit && (
          <DropdownMenuItem
            className="cursor-pointer focus:bg-white/10"
            onClick={onEdit}
          >
            <Edit2 className="mr-2 h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
        )}
        {extra?.map((x) => (
          <DropdownMenuItem
            key={x.label}
            className="cursor-pointer focus:bg-white/10"
            onClick={x.fn}
          >
            {x.icon}
            {x.label}
          </DropdownMenuItem>
        ))}
        {onDelete && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 focus:bg-red-500/15 focus:text-red-300"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Field row ───────────────────────────────────────────────────── */
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Form type ───────────────────────────────────────────────────── */
type AnnouncementForm = CmsAnnouncementUpsertRequest & { id?: string };

function emptyAnnouncement(): AnnouncementForm {
  return { title: "", audience: "All users", type: "INFO", scheduledAt: null };
}

/* ── Main component ────────────────────────────────────────────────── */
export default function ManageNotices() {
  const queryClient = useQueryClient();
  const announcementsQ = useQuery({
    queryKey: ["admin", "cms", "announcements"],
    queryFn: getCmsAnnouncementsApi,
  });
  const [editing, setEditing] = useState<AnnouncementForm | null>(null);
  const [isNew, setIsNew] = useState(false);

  const createMutation = useMutation({
    mutationFn: createCmsAnnouncementApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cms", "announcements"] });
      queryClient.invalidateQueries({ queryKey: publicCmsHomeQueryKey });
      toast.success("Announcement created");
      setEditing(null);
    },
    onError: (e: Error) =>
      toast.error(e.message || "Failed to create announcement"),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CmsAnnouncementUpsertRequest;
    }) => updateCmsAnnouncementApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cms", "announcements"] });
      queryClient.invalidateQueries({ queryKey: publicCmsHomeQueryKey });
      toast.success("Announcement updated");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCmsAnnouncementApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cms", "announcements"] });
      queryClient.invalidateQueries({ queryKey: publicCmsHomeQueryKey });
      toast.success("Announcement deleted");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: CmsAnnouncementUpsertRequest;
    }) => updateCmsAnnouncementApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "cms", "announcements"] });
      queryClient.invalidateQueries({ queryKey: publicCmsHomeQueryKey });
      toast.success("Status updated");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  const openNew = () => {
    setEditing(emptyAnnouncement());
    setIsNew(true);
  };

  const openEdit = (a: CmsAnnouncementResponse) => {
    setEditing({
      id: a.id,
      title: a.title,
      audience: a.audience,
      type: a.type,
      scheduledAt: a.scheduledAt,
    });
    setIsNew(false);
  };

  const save = () => {
    if (!editing || !editing.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const { id, ...data } = editing;
    if (isNew) {
      createMutation.mutate(data);
    } else if (id) {
      updateMutation.mutate({ id, data });
    }
  };

  const announcements = announcementsQ.data ?? [];

  const statusV = (isActive: boolean, scheduledAt: string | null) => {
    if (scheduledAt && new Date(scheduledAt) > new Date()) return "blue";
    return isActive ? "green" : "amber";
  };

  const statusLabel = (a: CmsAnnouncementResponse) => {
    if (a.scheduledAt && new Date(a.scheduledAt) > new Date()) return "scheduled";
    return a.active ? "published" : "draft";
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return "border-red-500/25 bg-red-500/[0.08] text-red-400";
      case "WARNING":
        return "border-amber-500/25 bg-amber-500/[0.08] text-amber-400";
      case "MAINTENANCE":
        return "border-blue-500/25 bg-blue-500/[0.08] text-blue-400";
      default:
        return "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400";
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-black tracking-tight text-white">
            Admin <span style={fireStyle}>Notices</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Publish platform-wide announcements, finance updates, and operational notices.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void announcementsQ.refetch()}
            disabled={announcementsQ.isFetching}
            className="flex items-center gap-1.5 rounded-full border table-border table-bg table-text px-3.5 py-[7px] text-[12px] font-bold transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {announcementsQ.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-[7px] text-[12px] font-black uppercase tracking-[0.1em] text-orange-300 transition hover:bg-orange-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            New Notice
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total",
            count: announcements.length,
            color: "border-white/15 bg-white/[0.03]",
            accent: "text-white",
          },
          {
            label: "Published",
            count: announcements.filter((a) => a.active && (!a.scheduledAt || new Date(a.scheduledAt) <= new Date())).length,
            color: "border-emerald-500/25 bg-emerald-500/[0.06]",
            accent: "text-emerald-400",
          },
          {
            label: "Drafts",
            count: announcements.filter((a) => !a.active).length,
            color: "border-amber-500/25 bg-amber-500/[0.06]",
            accent: "text-amber-400",
          },
          {
            label: "Scheduled",
            count: announcements.filter((a) => a.scheduledAt && new Date(a.scheduledAt) > new Date()).length,
            color: "border-blue-500/25 bg-blue-500/[0.06]",
            accent: "text-blue-400",
          },
        ].map(({ label, count, color, accent }) => (
          <div
            key={label}
            className={cn("rounded-2xl border p-4", color)}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Megaphone className={cn("h-5 w-5", accent)} />
              <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black table-text-muted">
                {count}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider table-text-muted">
              {label}
            </p>
            <p className="mt-0.5 text-2xl font-black table-text">{count}</p>
          </div>
        ))}
      </div>

      {/* Announcements list */}
      {announcementsQ.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-[18px] border table-border table-bg p-12 text-center">
          <Megaphone className="mx-auto mb-3 h-10 w-10 table-text-muted" strokeWidth={1.5} />
          <p className="text-[16px] font-bold table-text">No announcements yet</p>
          <p className="mt-1 text-[13px] table-text-muted">
            Create your first platform-wide notice
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-orange-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Notice
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 rounded-[18px] border table-border table-bg px-5 py-4 transition hover:border-white/15"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border",
                  typeColor(item.type)
                )}
              >
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-bold text-white">{item.title}</p>
                    <span className={cn("mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", typeColor(item.type))}>
                      {item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      label={statusLabel(item)}
                      v={statusV(item.active, item.scheduledAt)}
                    />
                    <Dots
                      onEdit={() => openEdit(item)}
                      onDelete={() => deleteMutation.mutate(item.id)}
                      extra={
                        !item.active
                          ? [
                              {
                                label: "Publish",
                                icon: <Zap className="mr-2 h-3.5 w-3.5" />,
                                fn: () =>
                                  togglePublishMutation.mutate({
                                    id: item.id,
                                    data: {
                                      title: item.title,
                                      audience: item.audience,
                                      type: item.type,
                                      scheduledAt: null,
                                      active: true,
                                    },
                                  }),
                              },
                            ]
                          : []
                      }
                    />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                  <span>
                    Audience: <span className="text-slate-300">{item.audience}</span>
                  </span>
                  {item.scheduledAt && (
                    <span>
                      Scheduled:{" "}
                      <span className="text-blue-400">
                        {new Date(item.scheduledAt).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                  <span>
                    Created:{" "}
                    <span className="text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="border-white/10 bg-[#0f0f0f] text-white sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-black">
              {isNew ? "New Announcement" : "Edit Announcement"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <FieldRow label="Title">
                <input
                  className={inputCls}
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  placeholder="Scheduled maintenance…"
                />
              </FieldRow>
              <FieldRow label="Audience">
                <input
                  className={inputCls}
                  value={editing.audience ?? "All users"}
                  onChange={(e) =>
                    setEditing({ ...editing, audience: e.target.value })
                  }
                  placeholder="All users"
                />
              </FieldRow>
              <FieldRow label="Type">
                <Select
                  value={editing.type ?? "INFO"}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      type: v as "INFO" | "WARNING" | "CRITICAL" | "MAINTENANCE",
                    })
                  }
                >
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#1a1a1a]">
                    <SelectItem
                      value="INFO"
                      className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      Info
                    </SelectItem>
                    <SelectItem
                      value="WARNING"
                      className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      Warning
                    </SelectItem>
                    <SelectItem
                      value="CRITICAL"
                      className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      Critical
                    </SelectItem>
                    <SelectItem
                      value="MAINTENANCE"
                      className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
                    >
                      Maintenance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Schedule (optional)">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={editing.scheduledAt ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      scheduledAt: e.target.value || null,
                    })
                  }
                />
              </FieldRow>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.07]"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-orange-500 text-white hover:bg-orange-400"
              onClick={save}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-2 h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
