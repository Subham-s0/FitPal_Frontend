import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CheckCheck, Inbox, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import UserSectionShell from "@/features/user-dashboard/components/UserSectionShell";
import { queryClient } from "@/shared/api";
import {
  getNotificationUnreadCountApi,
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "@/features/notifications/api";
import { notificationQueryKeys } from "@/features/notifications/queryKeys";
import type { AccountNotificationResponse } from "@/features/notifications/model";
import { showApiErrorToast, showApiSuccessToast } from "@/shared/lib/toast-helpers";
import { getNotificationNavigationState } from "@/shared/navigation/dashboard-navigation";
import { EmptyState } from "@/shared/ui/state";
import { cn } from "@/shared/lib/utils";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 12;

const TB_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.14em] transition-colors duration-200";
const TB_IDLE =
  "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white";

const statCardClass = "rounded-2xl border table-border table-bg p-4";

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
      showApiErrorToast(error, "Failed to mark notification as read");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
      showApiSuccessToast("All notifications marked as read");
    },
    onError: (error) => {
      showApiErrorToast(error, "Failed to mark all notifications as read");
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
      const state = getNotificationNavigationState(notification.payload);
      navigate(notification.deepLink, state ? { state } : undefined);
    }
  };

  return (
    <UserSectionShell
      title={
        <>
          Notifications <span className="text-gradient-fire">Inbox</span>
        </>
      }
      description="All announcements, review decisions, and system alerts in one place."
      width="wide"
      actions={
        <button
          type="button"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || unreadCount === 0}
          className={`${TB_BASE} border-orange-500/30 bg-orange-500/[0.10] text-orange-200 hover:border-orange-500 hover:bg-orange-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-45`}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <StatsCard icon={Inbox} label="Total notifications" value={String(totalNotifications)} tone="orange" />
        <StatsCard icon={Bell} label="Unread right now" value={String(unreadCount)} tone="emerald" />
        <StatsCard icon={Megaphone} label="Read coverage" value={unreadShare} tone="blue" />
      </div>

      <div className="rounded-[18px] border table-border table-bg p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] table-text-muted">Activity feed</p>
            <p className="mt-2 text-sm table-text-muted">
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
          <div className="space-y-2.5">
            {notifications.map((notification) => {
              const actorLabel = notification.actorGymName ?? notification.actorDisplayName;
              return (
                <button
                  key={notification.notificationId}
                  type="button"
                  onClick={() => void openNotification(notification)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3.5 text-left transition hover:border-orange-500/25 hover:bg-orange-500/[0.04]",
                    notification.unread
                      ? "border-orange-500/18 bg-orange-500/[0.08]"
                      : "border-white/10 bg-white/[0.02]"
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-black text-white">{notification.title}</p>
                        {notification.unread ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                            Unread
                          </span>
                        ) : null}
                      </div>
                      {actorLabel ? (
                        <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-orange-400">
                          {actorLabel}
                        </p>
                      ) : null}
                      <p className="mt-2.5 text-sm leading-6 text-white/65">{notification.body}</p>
                    </div>
                    <div className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                      {formatPublishedAt(notification.publishedAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No notifications yet"
            description="New announcements, payment alerts, and review updates will appear here once they are sent."
            className="border-dashed table-border bg-transparent"
          />
        )}
      </div>

      <div className="flex flex-col gap-3 border-t table-border-cell pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] table-text-muted">
          Showing page {(notificationsQuery.data?.page ?? 0) + 1} of {Math.max(notificationsQuery.data?.totalPages ?? 1, 1)}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={!notificationsQuery.data?.hasPrevious}
            className={`${TB_BASE} ${TB_IDLE} disabled:cursor-not-allowed disabled:opacity-35`}
          >
            Prev
          </button>
          <span className="rounded-full border table-border table-bg-alt px-3.5 py-1.5 text-[11px] font-semibold text-white">
            Page {(notificationsQuery.data?.page ?? 0) + 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={!notificationsQuery.data?.hasNext}
            className={`${TB_BASE} ${TB_IDLE} disabled:cursor-not-allowed disabled:opacity-35`}
          >
            Next
          </button>
        </div>
      </div>
    </UserSectionShell>
  );
}
