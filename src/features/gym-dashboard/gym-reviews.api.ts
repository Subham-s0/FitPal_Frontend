import { deleteApiData, getApiData, postApiData } from "@/shared/api/client";
import type { PublicGymReviewResponse } from "@/features/gyms/model";
import type {
  GymReviewAnalyticsResponse,
  GymReviewPageResponse,
  GymReviewSearchParams,
  UpsertGymReviewReplyRequest,
} from "@/features/gym-dashboard/gym-reviews.model";

export async function getGymReviewAnalyticsApi(): Promise<GymReviewAnalyticsResponse> {
  return getApiData<GymReviewAnalyticsResponse>("/gyms/me/reviews/analytics");
}

export async function getGymReviewsApi(
  params: GymReviewSearchParams = {}
): Promise<GymReviewPageResponse> {
  return getApiData<GymReviewPageResponse>("/gyms/me/reviews", {
    params,
  });
}

export async function upsertGymReviewReplyApi(
  reviewId: number,
  payload: UpsertGymReviewReplyRequest
): Promise<PublicGymReviewResponse> {
  return postApiData<PublicGymReviewResponse>(
    `/gyms/me/reviews/${reviewId}/reply`,
    payload
  );
}

export async function deleteGymReviewReplyApi(reviewId: number): Promise<PublicGymReviewResponse> {
  return deleteApiData<PublicGymReviewResponse>(`/gyms/me/reviews/${reviewId}/reply`);
}
