import apiClient from "@/shared/api/client";
import type { PublicGymReviewResponse } from "@/features/gyms/model";
import type {
  GymReviewAnalyticsResponse,
  GymReviewPageResponse,
  GymReviewSearchParams,
  UpsertGymReviewReplyRequest,
} from "@/features/gym-dashboard/gym-reviews.model";

export async function getGymReviewAnalyticsApi(): Promise<GymReviewAnalyticsResponse> {
  const response = await apiClient.get<GymReviewAnalyticsResponse>("/gyms/me/reviews/analytics");
  return response.data;
}

export async function getGymReviewsApi(
  params: GymReviewSearchParams = {}
): Promise<GymReviewPageResponse> {
  const response = await apiClient.get<GymReviewPageResponse>("/gyms/me/reviews", {
    params,
  });
  return response.data;
}

export async function upsertGymReviewReplyApi(
  reviewId: number,
  payload: UpsertGymReviewReplyRequest
): Promise<PublicGymReviewResponse> {
  const response = await apiClient.post<PublicGymReviewResponse>(
    `/gyms/me/reviews/${reviewId}/reply`,
    payload
  );
  return response.data;
}

export async function deleteGymReviewReplyApi(reviewId: number): Promise<PublicGymReviewResponse> {
  const response = await apiClient.delete<PublicGymReviewResponse>(`/gyms/me/reviews/${reviewId}/reply`);
  return response.data;
}
