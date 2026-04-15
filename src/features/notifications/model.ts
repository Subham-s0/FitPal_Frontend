import type { PageResponse } from "@/shared/api/model";

export type NotificationPageResponse<T> = PageResponse<T>;

export interface AccountNotificationResponse {
  notificationId: number;
  category:
    | "ANNOUNCEMENT"
    | "SUBSCRIPTION_ENDING_SOON"
    | "SUBSCRIPTION_EXPIRED"
    | "PAYMENT_FAILED"
    | "GYM_APPROVAL_UPDATED"
    | "CHECK_IN_STATUS"
    | "SYSTEM";
  sourceDomain: "ANNOUNCEMENT" | "SUBSCRIPTION" | "PAYMENT" | "GYM" | "CHECKIN" | "SYSTEM";
  sourceEntityId: number | null;
  title: string;
  body: string;
  deepLink: string | null;
  payload: Record<string, unknown>;
  actorDisplayName: string | null;
  actorGymName: string | null;
  publishedAt: string;
  readAt: string | null;
  unread: boolean;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

export interface NotificationListParams {
  page?: number;
  size?: number;
  unreadOnly?: boolean;
}
