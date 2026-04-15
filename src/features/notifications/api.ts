import { getApiData, postApiData } from "@/shared/api/client";
import type {
  AccountNotificationResponse,
  NotificationListParams,
  NotificationPageResponse,
  NotificationUnreadCountResponse,
} from "./model";

export async function getNotificationsApi(
  params: NotificationListParams = {}
): Promise<NotificationPageResponse<AccountNotificationResponse>> {
  return getApiData<NotificationPageResponse<AccountNotificationResponse>>("/notifications", {
    params,
  });
}

export async function getNotificationUnreadCountApi(): Promise<NotificationUnreadCountResponse> {
  return getApiData<NotificationUnreadCountResponse>("/notifications/unread-count");
}

export async function markNotificationReadApi(notificationId: number): Promise<AccountNotificationResponse> {
  return postApiData<AccountNotificationResponse>(`/notifications/${notificationId}/read`);
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await postApiData("/notifications/read-all");
}
