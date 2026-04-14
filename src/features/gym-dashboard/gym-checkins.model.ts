import type { PageResponse } from "@/features/admin/admin-gym.model";

export type GymCheckInStatus = "ACCESS_PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "DENIED";
export type GymCheckInDenyReason =
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

export type AccessTier = "BASIC" | "PRO" | "ELITE";
export type CheckInAccessMode = "MANUAL" | "DOOR_ACK_REQUIRED";
export type DoorAccessMode = "AUTOMATIC" | "MANUAL";

export interface GymQrCodeResponse {
  qrCodeId: number;
  gymId: number;
  gymName: string | null;
  qrToken: string;
  active: boolean;
  createdAt: string;
  checkInAccessMode: CheckInAccessMode | null;
  doorAccessMode: DoorAccessMode | null;
}

export interface GymTodayCheckInResponse {
  checkInId: string;
  accountId: number | null;
  userId: number | null;
  memberEmail: string | null;
  memberName: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  status: GymCheckInStatus;
  denyReason: GymCheckInDenyReason | null;
  membershipTierAtCheckIn: AccessTier | null;
  withinRadius: boolean | null;
}

export interface GymCheckInAnalyticsResponse {
  totalScans: number;
  successfulScans: number;
  deniedScans: number;
  topDeniedReason: { reason: GymCheckInDenyReason; count: number } | null;
  deniedReasons: { reason: GymCheckInDenyReason; count: number }[];
  peakToday: { hour: number; count: number }[];
  peakWeekAverage: { hour: number; count: number }[];
  peakAllTimeAverage: { hour: number; count: number }[];
}

export interface GymCheckInListItemResponse {
  checkInId: string;
  accountId: number | null;
  memberName: string | null;
  memberProfileImageUrl: string | null;
  membershipTierAtCheckIn: AccessTier | null;
  checkInAt: string;
  checkOutAt: string | null;
  status: GymCheckInStatus;
  denyReason: GymCheckInDenyReason | null;
  withinRadius: boolean | null;
}

export interface GymCheckInSearchParams {
  statuses?: GymCheckInStatus[];
  denyReason?: GymCheckInDenyReason;
  membershipTier?: AccessTier;
  checkInFrom?: string;
  checkInTo?: string;
  memberNamePrefix?: string;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export type GymCheckInPage = PageResponse<GymCheckInListItemResponse>;

export interface GymDoorDeviceResponse {
  deviceId: string;
  gymId: number;
  gymName: string | null;
  active: boolean;
  pollIntervalSeconds: number | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface GymDoorDeviceCredentialResponse {
  deviceId: string;
  gymId: number;
  gymName: string | null;
  deviceSecret: string;
  active: boolean;
  pollIntervalSeconds: number | null;
  secretIssuedAt: string | null;
}

export interface GymDoorDeviceProvisionResponse {
  deviceId: string;
  gymId: number;
  gymName: string | null;
  deviceSecret: string;
  active: boolean;
  pollIntervalSeconds: number | null;
  provisionedAt: string | null;
}
