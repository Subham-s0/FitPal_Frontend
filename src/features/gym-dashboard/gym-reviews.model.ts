import type { PageResponse } from "@/features/check-in/model";
import type { PublicGymReviewResponse } from "@/features/gyms/model";

export type GymReviewSortMode = "NEWEST" | "OLDEST" | "NAME_A_Z" | "NAME_Z_A";

export interface GymReviewRatingDistributionResponse {
  rating: number;
  count: number;
  percentage: number;
}

export interface GymReviewAnalyticsResponse {
  totalReviews: number;
  averageRating: number | null;
  positiveCount: number;
  positivePercentage: number;
  needsAttentionCount: number;
  needsAttentionPercentage: number;
  unrepliedCount: number;
  repliedRatePercentage: number;
  ratingDistribution: GymReviewRatingDistributionResponse[];
}

export interface GymReviewSearchParams {
  query?: string;
  rating?: number;
  sort?: GymReviewSortMode;
  page?: number;
  size?: number;
}

export interface UpsertGymReviewReplyRequest {
  replyText: string;
}

export type GymReviewPageResponse = PageResponse<PublicGymReviewResponse>;
