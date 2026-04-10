export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (page: number, size: number, unreadOnly = false) =>
    [...notificationQueryKeys.all, "list", page, size, unreadOnly] as const,
  unreadCount: () => [...notificationQueryKeys.all, "unread-count"] as const,
};
