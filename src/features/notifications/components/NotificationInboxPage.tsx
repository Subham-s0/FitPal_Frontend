import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Inbox, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import { getApiErrorMessage, queryClient } from "@/shared/api";
import {
  getNotificationUnreadCountApi,
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "@/features/notifications/api";
import { notificationQueryKeys } from "@/features/notifications/queryKeys";
import type { AccountNotificationResponse } from "@/features/notifications/model";
import { cn } from "@/shared/lib/utils";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 12;

const statCardClass =
  "rounded-[24px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.9)]";

function getNavigationState(notification: AccountNotificationResponse) {
  const payload = notification.payload ?? {};
  if (typeof payload.activeSection === "string") {
    const state: { activeSection: string; checkInView?: string } = {
      activeSection: payload.activeSection,
    };
    if (typeof payload.checkInView === "string") {
      state.checkInView = payload.checkInView;
    }
    return state;
  }
  return undefined;
}

function formatPublishedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return formatDistanceToNow(date, { addSuffix: true });
}

function StatsCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Bell;
  label: string;
  value: string;
  tone: "orange" | "emerald" | "blue";
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300"
      : tone === "blue"
        ? "border-sky-500/20 bg-sky-500/[0.08] text-sky-300"
        : "border-orange-500/20 bg-orange-500/[0.08] text-orange-300";

  return (
    <div className={statCardClass}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", toneClasses)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
          <p className="mt-2 text-2xl font-black text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function NotificationInboxPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.list(page, PAGE_SIZE, false),
    queryFn: () => getNotificationsApi({ page, size: PAGE_SIZE }),
    staleTime: 10_000,
    placeholderData: (previous) => previous,
  });

  const unreadCountQuery = useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: getNotificationUnreadCountApi,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to mark notification as read"));
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      toast.success("All notifications marked as read");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to mark all notifications as read"));
    },
  });

  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const totalNotifications = notificationsQuery.data?.totalItems ?? 0;
  const readCount = Math.max(0, totalNotifications - unreadCount);
  const unreadShare = useMemo(() => {
    if (totalNotifications <= 0) {
      return "0%";
    }
    return `${Math.round((unreadCount / totalNotifications) * 100)}%`;
  }, [totalNotifications, unreadCount]);

  const openNotification = async (notification: AccountNotificationResponse) => {
    if (notification.unread && !markReadMutation.isPending) {
      await markReadMutation.mutateAsync(notification.notificationId);
    }

    if (notification.deepLink) {
      const state = getNavigationState(notification);
      navigate(notification.deepLink, state ? { state } : undefined);
    }
  };

  return (
    <UserSectionShell
      eyebrow="Inbox"
      title="Notifications"
      description="All announcements, review decisions, and system alerts in one place."
      width="wide"
      actions={
        <button
          type="button"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || unreadCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/[0.10] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100 transition hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <StatsCard icon={Inbox} label="Total notifications" value={String(totalNotifications)} tone="orange" />
        <StatsCard icon={Bell} label="Unread right now" value={String(unreadCount)} tone="emerald" />
        <StatsCard icon={Megaphone} label="Read coverage" value={unreadShare} tone="blue" />
      </div>

      <div className="rounded-[28px] border border-white/8 bg-[#0d0d0d] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-400">Activity feed</p>
            <p className="mt-2 text-sm text-white/55">
              {unreadCount > 0
                ? `${unreadCount} unread, ${readCount} already opened.`
                : "Everything here has been opened."}
            </p>
          </div>
        </div>

        {notificationsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-[24px] bg-white/[0.04]" />
            ))}
          </div>
        ) : notifications.length ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const actorLabel = notification.actorGymName ?? notification.actorDisplayName;
              return (
                <button
                  key={notification.notificationId}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className={cn(
                    "w-full rounded-[24px] border px-5 py-4 text-left transition hover:border-orange-500/25 hover:bg-orange-500/[0.04]",
                    notification.unread
                      ? "border-orange-500/18 bg-orange-500/[0.08]"
                      : "border-white/8 bg-white/[0.02]"
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-white">{notification.title}</p>
                        {notification.unread ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            Unread
                          </span>
                        ) : null}
                      </div>
                      {actorLabel ? (
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-400">
                          {actorLabel}
                        </p>
                      ) : null}
                      <p className="mt-3 text-sm leading-7 text-white/65">{notification.body}</p>
                    </div>
                    <div className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">
                      {formatPublishedAt(notification.publishedAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/10 px-6 py-16 text-center">
            <p className="text-lg font-black text-white">No notifications yet</p>
            <p className="mt-3 text-sm leading-7 text-white/55">
              New announcements, payment alerts, and review updates will appear here once they are sent.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-[24px] border border-white/8 bg-[#0d0d0d] px-5 py-4 text-sm text-white/55">
        <p>
          Showing page {(notificationsQuery.data?.page ?? 0) + 1} of {Math.max(notificationsQuery.data?.totalPages ?? 1, 1)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={!notificationsQuery.data?.hasPrevious}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Newer
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!notificationsQuery.data?.hasNext}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            Older
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </UserSectionShell>
  );
}
