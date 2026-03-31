import type {
  UserGymDiscoverMode,
  UserGymDiscoverResponse,
  UserGymDiscoverSortMode,
  UserGymDiscoverStatusFilter,
} from "@/features/gyms/model";

export type RecommendationMode = UserGymDiscoverMode;
export type GymStatusFilter = UserGymDiscoverStatusFilter;
export type GymSortMode = UserGymDiscoverSortMode;

export type LocationPermissionState = "loading" | "prompt" | "granted" | "denied" | "unsupported";

export type GymRecommendationItem = UserGymDiscoverResponse;

export type SheetSnap = "closed" | "compact" | "expanded";
