import apiClient from "@/shared/api/client";
import type {
  AdminAnnouncementListParams,
  AdminAnnouncementStatsResponse,
  AdminAnnouncementUpsertRequest,
  AnnouncementDetailResponse,
  AnnouncementPageResponse,
  AnnouncementSummaryResponse,
  GymAnnouncementStatsResponse,
  GymAnnouncementListParams,
  GymAnnouncementUpsertRequest,
} from "./model";

export async function getAdminAnnouncementsApi(
  params: AdminAnnouncementListParams = {}
): Promise<AnnouncementPageResponse<AnnouncementSummaryResponse>> {
  const response = await apiClient.get<AnnouncementPageResponse<AnnouncementSummaryResponse>>(
    "/admin/announcements",
    { params }
  );
  return response.data;
}

export async function getAdminAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.get<AnnouncementDetailResponse>(`/admin/announcements/${announcementId}`);
  return response.data;
}

export async function getAdminAnnouncementStatsApi(): Promise<AdminAnnouncementStatsResponse> {
  const response = await apiClient.get<AdminAnnouncementStatsResponse>("/admin/announcements/summary");
  return response.data;
}

export async function createAdminAnnouncementApi(
  payload: AdminAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>("/admin/announcements", payload);
  return response.data;
}

export async function updateAdminAnnouncementApi(
  announcementId: number,
  payload: AdminAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.patch<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}`,
    payload
  );
  return response.data;
}

export async function deleteAdminAnnouncementApi(announcementId: number): Promise<void> {
  await apiClient.delete(`/admin/announcements/${announcementId}`);
}

export async function publishAdminAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/publish`
  );
  return response.data;
}

export async function cancelAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/cancel`
  );
  return response.data;
}

export async function approveGymAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/approve`
  );
  return response.data;
}

export async function rejectGymAnnouncementApi(
  announcementId: number,
  rejectionReason: string
): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/reject`,
    { rejectionReason }
  );
  return response.data;
}

export async function getGymAnnouncementsApi(
  params: GymAnnouncementListParams = {}
): Promise<AnnouncementPageResponse<AnnouncementSummaryResponse>> {
  const response = await apiClient.get<AnnouncementPageResponse<AnnouncementSummaryResponse>>(
    "/gyms/me/announcements",
    { params }
  );
  return response.data;
}

export async function getGymAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.get<AnnouncementDetailResponse>(`/gyms/me/announcements/${announcementId}`);
  return response.data;
}

export async function getGymAnnouncementStatsApi(): Promise<GymAnnouncementStatsResponse> {
  const response = await apiClient.get<GymAnnouncementStatsResponse>("/gyms/me/announcements/summary");
  return response.data;
}

export async function createGymAnnouncementApi(
  payload: GymAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>("/gyms/me/announcements", payload);
  return response.data;
}

export async function updateGymAnnouncementApi(
  announcementId: number,
  payload: GymAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.patch<AnnouncementDetailResponse>(
    `/gyms/me/announcements/${announcementId}`,
    payload
  );
  return response.data;
}

export async function submitGymAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  const response = await apiClient.post<AnnouncementDetailResponse>(
    `/gyms/me/announcements/${announcementId}/submit`
  );
  return response.data;
}
