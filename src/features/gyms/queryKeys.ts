import type { ReviewSortDirection } from "@/features/gyms/model";
import type { GymSortMode, GymStatusFilter, RecommendationMode } from "@/features/gyms/types";

/**
 * Centralized query keys for gyms feature.
 */
export const gymsQueryKeys = {
  all: ["gyms"] as const,

  discoverLists: () => [...gymsQueryKeys.all, "discover"] as const,

  discover: (params: {
    audience?: "member" | "public";
    query?: string;
    mode?: RecommendationMode;
    status?: GymStatusFilter;
    savedOnly?: boolean;
    sort?: GymSortMode;
    lat?: number;
    lng?: number;
  }) =>
    [
      ...gymsQueryKeys.discoverLists(),
      params.audience ?? "member",
      params.query ?? "",
      params.mode ?? "show-all",
      params.status ?? "all",
      params.savedOnly ?? false,
      params.sort ?? "recommended",
      params.lat ?? null,
      params.lng ?? null,
    ] as const,

  savedCount: () => [...gymsQueryKeys.all, "saved-count"] as const,

  profileViews: (gymId: number) => [...gymsQueryKeys.all, "profile-view", gymId] as const,

  profileView: (gymId: number, lat?: number, lng?: number, audience: "member" | "public" = "member") =>
    [...gymsQueryKeys.profileViews(gymId), audience, lat ?? null, lng ?? null] as const,

  publicProfiles: (gymId: number) => [...gymsQueryKeys.all, "public-profile", gymId] as const,

  publicProfile: (gymId: number) => [...gymsQueryKeys.publicProfiles(gymId), "detail"] as const,

  reviewsLists: (gymId: number) => [...gymsQueryKeys.all, "reviews", gymId] as const,

  reviews: (
    gymId: number,
    params: {
      page: number;
      size: number;
      sortDirection: ReviewSortDirection;
      query?: string;
      rating?: number;
    }
  ) =>
    [
      ...gymsQueryKeys.reviewsLists(gymId),
      params.page,
      params.size,
      params.sortDirection,
      params.query ?? "",
      params.rating ?? null,
    ] as const,

  myReview: (gymId: number) => [...gymsQueryKeys.all, "my-review", gymId] as const,
};
