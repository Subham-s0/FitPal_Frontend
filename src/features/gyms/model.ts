import type { PageResponse } from "@/features/check-in/model";
import type { AccessTier, CheckInAccessMode } from "@/features/profile/model";

export type UserGymDiscoverMode = "nearest" | "best-match" | "show-all";
export type UserGymDiscoverStatusFilter = "all" | "open" | "closed";
export type UserGymDiscoverSortMode = "recommended" | "alphabetical";
export type ReviewSortDirection = "ASC" | "DESC";

export interface UserGymDiscoverRequest {
  query?: string;
  mode?: UserGymDiscoverMode;
  status?: UserGymDiscoverStatusFilter;
  savedOnly?: boolean;
  sort?: UserGymDiscoverSortMode;
  lat?: number;
  lng?: number;
  page?: number;
  size?: number;
}

export interface UserGymDiscoverResponse {
  gymId: number;
  gymName: string | null;
  addressLine: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  currentlyOpen: boolean;
  occupancyPercent: number | null;
  occupancyLabel: string | null;
  activeCheckIns: number | null;
  maxCapacity: number | null;
  rating: number | null;
  reviewCount: number;
  minimumAccessTier: AccessTier | null;
  checkInEnabled: boolean;
  coverPhotoUrl: string | null;
  logoUrl: string | null;
  isSaved: boolean;
  accessibleByCurrentUser: boolean;
}

export interface SavedGymResponse {
  savedGymId: number;
  gymId: number;
  gymName: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  minimumAccessTier: AccessTier | null;
  checkInEnabled: boolean;
  logoUrl: string | null;
  savedAt: string;
}

export interface SavedGymCountResponse {
  count: number;
}

export interface PublicGymPhotoResponse {
  photoId: number;
  photoUrl: string | null;
  caption: string | null;
  displayOrder: number | null;
  cover: boolean;
}

export interface PublicGymProfileResponse {
  gymId: number;
  gymName: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  establishedAt: number | null;
  description: string | null;
  phoneNo: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  currentlyOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  activeCheckIns: number | null;
  maxCapacity: number | null;
  occupancyPercent: number | null;
  occupancyLabel: string | null;
  rating: number | null;
  reviewCount: number;
  minimumAccessTier: AccessTier | null;
  checkInEnabled: boolean;
  checkInAccessMode: CheckInAccessMode | null;
  allowedCheckInRadiusMeters: number | null;
  photos: PublicGymPhotoResponse[];
}

export interface UserGymProfileViewResponse {
  profile: PublicGymProfileResponse;
  isSaved: boolean;
  accessibleByCurrentUser: boolean;
  distanceMeters: number | null;
}

export interface PublicGymReviewResponse {
  reviewId: number;
  reviewerName: string | null;
  reviewerAvatarUrl: string | null;
  rating: number | null;
  comments: string | null;
  createdAt: string;
  gymReply: string | null;
  gymReplyAt: string | null;
}

export type UserGymDiscoverPageResponse = PageResponse<UserGymDiscoverResponse>;
export type PublicGymReviewPageResponse = PageResponse<PublicGymReviewResponse>;
