import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import { useAuthState } from "@/features/auth/hooks";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { queryClient } from "@/shared/api";
import { showApiErrorToast, showApiSuccessToast } from "@/shared/lib/toast-helpers";
import {
  getNotificationNavigationState,
  navigateToUserDashboardSection,
} from "@/shared/navigation/dashboard-navigation";
import {
  getNotificationUnreadCountApi,
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "../api";
import type { AccountNotificationResponse } from "../model";
import { notificationQueryKeys } from "../queryKeys";
import { useNotificationStream } from "../use-notification-stream";

interface NotificationBellProps {
  buttonClassName?: string;
  iconClassName?: string;
  badgeClassName?: string;
}

const PAGE_SIZE = 8;

export function NotificationBell({
  buttonClassName,
  iconClassName,
  badgeClassName,
}: NotificationBellProps) {
  const auth = useAuthState();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);

  useNotificationStream(Boolean(auth.accessToken));

  const unreadCountQuery = useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: getNotificationUnreadCountApi,
    enabled: Boolean(auth.accessToken),
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  const notificationsQuery = useQuery({
    queryKey: notificationQueryKeys.list(page, PAGE_SIZE, true),
    queryFn: () => getNotificationsApi({ page, size: PAGE_SIZE, unreadOnly: true }),
    enabled: Boolean(auth.accessToken),
    staleTime: 10_000,
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

  const unreadCount = unreadCountQuery.data?.unreadCount ?? 0;
  const pageData = notificationsQuery.data;
  const hasNotifications = (pageData?.items.length ?? 0) > 0;
  const isUser = auth.role?.toUpperCase() === "USER";

  const badgeLabel = useMemo(() => {
    if (unreadCount <= 0) {
      return null;
    }
    return unreadCount > 99 ? "99+" : String(unreadCount);
  }, [unreadCount]);

  const handleNotificationClick = async (notification: AccountNotificationResponse) => {
    if (notification.unread && !markReadMutation.isPending) {
      await markReadMutation.mutateAsync(notification.notificationId);
    }

    if (notification.deepLink) {
      const state = getNotificationNavigationState(notification.payload);
      navigate(notification.deepLink, state ? { state } : undefined);
      setIsOpen(false);
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setPage(0);
          queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("group relative rounded-full p-2 transition-colors hover:bg-[#1a1a1a]", buttonClassName)}
        >
          <Bell className={cn("h-6 w-6 text-gray-400 transition-colors group-hover:text-orange-500", iconClassName)} />
          {badgeLabel ? (
            <span
              className={cn(
                "absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border border-[#050505] bg-orange-500 px-1.5 text-[10px] font-black text-white",
                badgeClassName
              )}
            >
              {badgeLabel}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={10}
        collisionPadding={16}
        className={cn(
          "z-[120] flex w-[min(92vw,392px)] max-h-[min(82dvh,500px)] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111111] p-0 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
        )}
      >
        <div className="shrink-0 border-b border-white/[0.07] bg-[#111111] px-4 py-3 sm:px-4.5 sm:py-3.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-black tracking-tight text-white">
              Unread{" "}
              <span className="text-gradient-fire">Notifications</span>
              {unreadCount > 0 ? <span className="text-white/50"> ({unreadCount})</span> : null}
            </h3>
            <button
              type="button"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || unreadCount === 0}
              className="inline-flex shrink-0 items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.11em] text-white/75 transition hover:border-orange-500/35 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-1.5 [scrollbar-gutter:stable]">
          {notificationsQuery.isLoading ? (
            <div className="space-y-2 px-3 py-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : hasNotifications ? (
            pageData?.items.map((notification) => {
              const actorLabel = notification.actorGymName ?? notification.actorDisplayName;
              return (
                <button
                  key={notification.notificationId}
                  type="button"
                  onClick={() => void handleNotificationClick(notification)}
                  className={cn(
                    "mb-1.5 flex w-full flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition last:mb-0 hover:border-orange-500/[0.22] hover:bg-orange-500/[0.05]",
                    notification.unread
                      ? "border-orange-500/25 bg-orange-500/[0.07]"
                      : "border-white/[0.07] bg-white/[0.025]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-white">{notification.title}</p>
                      {actorLabel ? (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-400">
                          {actorLabel}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
                      {formatDistanceToNow(new Date(notification.publishedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <p className="line-clamp-2 text-[12px] leading-5 text-white/70">{notification.body}</p>
                  <div className="flex items-center justify-between text-[10px] font-semibold text-white/45">
                    <span>{String(notification.category).replace(/_/g, " ").toLowerCase()}</span>
                    {notification.unread ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-orange-300">
                        <span className="h-1 w-1 rounded-full bg-orange-400" />
                        Unread
                      </span>
                    ) : (
                      <span className="text-white/30">Opened</span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-5 py-9 text-center">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-white/35">All caught up</p>
              <p className="mt-2.5 text-sm leading-6 text-white/55">
                New announcements, review decisions, and system alerts will appear here.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] bg-[#111111] px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={!pageData?.hasPrevious}
              className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.11em] text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Newer
            </button>

            <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/35">
              Page {(pageData?.page ?? 0) + 1}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!pageData?.hasNext}
              className="inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.11em] text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              Older
            </button>
          </div>

          {isUser ? (
            <button
              type="button"
              onClick={() => {
                navigateToUserDashboardSection(navigate, "notifications");
                setIsOpen(false);
              }}
              className="rounded-full border border-orange-500/20 bg-orange-500/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-orange-200 transition hover:border-orange-500 hover:bg-orange-500 hover:text-white"
            >
              View all
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
