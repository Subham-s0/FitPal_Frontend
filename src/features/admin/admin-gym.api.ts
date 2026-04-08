import apiClient from "@/shared/api/client";
import type {
  AdminGymAccessReviewRequest,
  AdminGymDocumentsReviewRequest,
  AdminGymListParams,
  AdminGymLocationReviewRequest,
  AdminGymPhotosReviewRequest,
  AdminGymPayoutReviewBatchRequest,
  AdminGymReviewResponse,
  AdminGymStatusCounts,
  AdminGymSummaryResponse,
  PageResponse,
  UpdateGymApprovalRequest,
  UpdateGymCheckInAccessModeRequest,
} from "@/features/admin/admin-gym.model";
import type { GymApprovalStatus, GymPhotoResponse, GymProfileResponse } from "@/features/profile/model";

/** GET /api/admin/gyms */
export async function getAdminGymsApi(
  params: AdminGymListParams = {}
): Promise<PageResponse<AdminGymSummaryResponse>> {
  const response = await apiClient.get<PageResponse<AdminGymSummaryResponse>>("/admin/gyms", {
    params,
  });
  return response.data;
}

/** GET /api/admin/gyms status counts */
export async function getAdminGymStatusCountsApi(): Promise<AdminGymStatusCounts> {
  const statusPageSize = 1;
  const [pendingReview, approved, rejected] = await Promise.all(
    (["PENDING_REVIEW", "APPROVED", "REJECTED"] as GymApprovalStatus[]).map((approvalStatus) =>
      getAdminGymsApi({ approvalStatus, page: 0, size: statusPageSize })
    )
  );

  return {
    pendingReview: pendingReview.totalItems,
    approved: approved.totalItems,
    rejected: rejected.totalItems,
  };
}

/** GET /api/admin/gyms/:gymId/review */
export async function getAdminGymReviewApi(gymId: number): Promise<AdminGymReviewResponse> {
  const response = await apiClient.get<AdminGymReviewResponse>(`/admin/gyms/${gymId}/review`);
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/review/location */
export async function patchAdminGymLocationApi(
  gymId: number,
  payload: AdminGymLocationReviewRequest
): Promise<AdminGymReviewResponse> {
  const response = await apiClient.patch<AdminGymReviewResponse>(
    `/admin/gyms/${gymId}/review/location`,
    payload
  );
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/review/access */
export async function patchAdminGymAccessApi(
  gymId: number,
  payload: AdminGymAccessReviewRequest
): Promise<AdminGymReviewResponse> {
  const response = await apiClient.patch<AdminGymReviewResponse>(
    `/admin/gyms/${gymId}/review/access`,
    payload
  );
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/review/documents */
export async function patchAdminGymDocumentsApi(
  gymId: number,
  payload: AdminGymDocumentsReviewRequest
): Promise<AdminGymReviewResponse> {
  const response = await apiClient.patch<AdminGymReviewResponse>(
    `/admin/gyms/${gymId}/review/documents`,
    payload
  );
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/review/payout */
export async function patchAdminGymPayoutApi(
  gymId: number,
  payload: AdminGymPayoutReviewBatchRequest
): Promise<AdminGymReviewResponse> {
  const response = await apiClient.patch<AdminGymReviewResponse>(
    `/admin/gyms/${gymId}/review/payout`,
    payload
  );
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/review/photos */
export async function patchAdminGymPhotosApi(
  gymId: number,
  payload: AdminGymPhotosReviewRequest
): Promise<AdminGymReviewResponse> {
  const response = await apiClient.patch<AdminGymReviewResponse>(
    `/admin/gyms/${gymId}/review/photos`,
    payload
  );
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/approval */
export async function patchAdminGymApprovalApi(
  gymId: number,
  payload: UpdateGymApprovalRequest
): Promise<GymProfileResponse> {
  const response = await apiClient.patch<GymProfileResponse>(`/admin/gyms/${gymId}/approval`, payload);
  return response.data;
}

/** PATCH /api/admin/gyms/:gymId/check-in-access-mode */
export async function patchAdminGymCheckInAccessModeApi(
  gymId: number,
  payload: UpdateGymCheckInAccessModeRequest
): Promise<GymProfileResponse> {
  const response = await apiClient.patch<GymProfileResponse>(
    `/admin/gyms/${gymId}/check-in-access-mode`,
    payload
  );
  return response.data;
}

export async function patchAdminGymPhotoCaptionApi(
  gymId: number,
  photoId: number,
  caption?: string | null
): Promise<AdminGymReviewResponse> {
  return patchAdminGymPhotosApi(gymId, {
    photoUpdates: [{ photoId, caption: caption ?? null }],
  });
}

export function getAdminGymCoverPhotoUrl(photos: GymPhotoResponse[]): string | null {
  return photos.find((photo) => photo.cover)?.photoUrl ?? photos[0]?.photoUrl ?? null;
}
