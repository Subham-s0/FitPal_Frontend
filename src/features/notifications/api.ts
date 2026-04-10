import apiClient from "@/shared/api/client";
import type {
  AccountNotificationResponse,
  NotificationListParams,
  NotificationPageResponse,
  NotificationUnreadCountResponse,
} from "./model";

export async function getNotificationsApi(
  params: NotificationListParams = {}
): Promise<NotificationPageResponse<AccountNotificationResponse>> {
  const response = await apiClient.get<NotificationPageResponse<AccountNotificationResponse>>("/notifications", {
    params,
  });
  return response.data;
}

export async function getNotificationUnreadCountApi(): Promise<NotificationUnreadCountResponse> {
  const response = await apiClient.get<NotificationUnreadCountResponse>("/notifications/unread-count");
  return response.data;
}

export async function markNotificationReadApi(notificationId: number): Promise<AccountNotificationResponse> {
  const response = await apiClient.post<AccountNotificationResponse>(`/notifications/${notificationId}/read`);
  return response.data;
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await apiClient.post("/notifications/read-all");
}
