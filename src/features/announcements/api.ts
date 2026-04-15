import { deleteApiData, getApiData, patchApiData, postApiData } from "@/shared/api/client";
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
  return getApiData<AnnouncementPageResponse<AnnouncementSummaryResponse>>(
    "/admin/announcements",
    { params }
  );
}

export async function getAdminAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  return getApiData<AnnouncementDetailResponse>(`/admin/announcements/${announcementId}`);
}

export async function getAdminAnnouncementStatsApi(): Promise<AdminAnnouncementStatsResponse> {
  return getApiData<AdminAnnouncementStatsResponse>("/admin/announcements/summary");
}

export async function createAdminAnnouncementApi(
  payload: AdminAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>("/admin/announcements", payload);
}

export async function updateAdminAnnouncementApi(
  announcementId: number,
  payload: AdminAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  return patchApiData<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}`,
    payload
  );
}

export async function deleteAdminAnnouncementApi(announcementId: number): Promise<void> {
  await deleteApiData(`/admin/announcements/${announcementId}`);
}

export async function publishAdminAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/publish`
  );
}

export async function cancelAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/cancel`
  );
}

export async function approveGymAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/approve`
  );
}

export async function rejectGymAnnouncementApi(
  announcementId: number,
  rejectionReason: string
): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>(
    `/admin/announcements/${announcementId}/reject`,
    { rejectionReason }
  );
}

export async function getGymAnnouncementsApi(
  params: GymAnnouncementListParams = {}
): Promise<AnnouncementPageResponse<AnnouncementSummaryResponse>> {
  return getApiData<AnnouncementPageResponse<AnnouncementSummaryResponse>>(
    "/gyms/me/announcements",
    { params }
  );
}

export async function getGymAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  return getApiData<AnnouncementDetailResponse>(`/gyms/me/announcements/${announcementId}`);
}

export async function getGymAnnouncementStatsApi(): Promise<GymAnnouncementStatsResponse> {
  return getApiData<GymAnnouncementStatsResponse>("/gyms/me/announcements/summary");
}

export async function createGymAnnouncementApi(
  payload: GymAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>("/gyms/me/announcements", payload);
}

export async function updateGymAnnouncementApi(
  announcementId: number,
  payload: GymAnnouncementUpsertRequest
): Promise<AnnouncementDetailResponse> {
  return patchApiData<AnnouncementDetailResponse>(
    `/gyms/me/announcements/${announcementId}`,
    payload
  );
}

export async function submitGymAnnouncementApi(announcementId: number): Promise<AnnouncementDetailResponse> {
  return postApiData<AnnouncementDetailResponse>(
    `/gyms/me/announcements/${announcementId}/submit`
  );
}
