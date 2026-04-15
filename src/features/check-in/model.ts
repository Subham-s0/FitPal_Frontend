import type { AccessTier } from "@/features/profile/model";
export type { PageResponse } from "@/shared/api/model";

export type CheckInStatus = "ACCESS_PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "DENIED";

export type CheckInDenyReason =
  | "INACTIVE_TOKEN"
  | "GYM_NOT_APPROVED"
  | "GYM_CHECK_IN_DISABLED"
  | "GYM_GEOFENCE_NOT_CONFIGURED"
  | "NO_ACTIVE_SUBSCRIPTION"
  | "TIER_TOO_LOW"
  | "OUTSIDE_RADIUS"
  | "ALREADY_VISITED_ANOTHER_GYM_TODAY"
  | "ALREADY_CHECKED_IN"
  | "DOOR_DEVICE_UNAVAILABLE"
  | "DOOR_COMMAND_FAILED"
  | "DOOR_COMMAND_EXPIRED";

export interface CheckInScanRequest {
  qrToken: string;
  latitude?: number | null;
  longitude?: number | null;
  deviceInfo?: string | null;
}

export interface CheckInCheckOutRequest {
  latitude?: number | null;
  longitude?: number | null;
}

export interface GymCheckInResponse {
  checkInId: string;
  gymId: number | null;
  gymName: string | null;
  gymLogoUrl: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  status: CheckInStatus;
  denyReason: CheckInDenyReason | null;
  membershipTierAtCheckIn: AccessTier | null;
  withinRadius: boolean | null;
  radiusMetersAtCheckIn: number | null;
  message: string | null;
}

export interface UserCheckInHistoryItemResponse {
  checkInId: string;
  gymId: number | null;
  gymName: string | null;
  gymLogoUrl: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  durationSeconds: number | null;
  status: CheckInStatus;
  denyReason: CheckInDenyReason | null;
  membershipTierAtCheckIn: AccessTier | null;
  withinRadius: boolean | null;
  radiusMetersAtCheckIn: number | null;
}

export interface UserCheckInHistorySummaryResponse {
  totalAttempts: number;
  completedVisits: number;
  deniedVisits: number;
  uniqueGyms: number;
}

export type UserCheckInHistorySortBy =
  | "checkInAt"
  | "checkOutAt"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "gym.gymName";

export interface UserCheckInHistorySearchRequest {
  statuses?: CheckInStatus[];
  gymName?: string;
  sortBy?: UserCheckInHistorySortBy;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface UserCheckInHistorySummaryRequest {
  statuses?: CheckInStatus[];
  gymName?: string;
}
