import type {
  GymSettlementAnalyticsResponse,
  PayoutSettlementResponse,
  SettlementDueTimelineResponse,
} from "@/features/admin/admin-settlement.model";
import type {
  GymCheckInAnalyticsResponse,
  GymDoorDeviceResponse,
} from "@/features/gym-dashboard/gym-checkins.model";
import type {
  GymMembersMetricsResponse,
  GymMembersWindow,
} from "@/features/gym-dashboard/gym-members.model";
import type { GymReviewAnalyticsResponse } from "@/features/gym-dashboard/gym-reviews.model";
import type { GymProfileResponse } from "@/features/profile/model";

export type GymDashboardCheckInTrendRange = "WEEK" | "MONTH" | "YEAR" | "ALL_TIME";
export type GymDashboardPeakActivityRange = "TODAY" | "WEEK" | "ALL_TIME";
export type GymDashboardRevenueTrendRange = "WEEKLY" | "MONTHLY" | "YEARLY";
export type GymDashboardOverviewMembersWindow = GymMembersWindow;

export interface GymDashboardCountTrendPoint {
  key: string;
  label: string;
  count: number;
}

export interface GymDashboardCountTrendResponse {
  range: string;
  subtitle: string;
  points: GymDashboardCountTrendPoint[];
}

export interface GymDashboardRevenueTrendPoint {
  key: string;
  label: string;
  revenue: number;
  due: number;
  paid: number;
}

export interface GymDashboardRevenueTrendResponse {
  range: string;
  subtitle: string;
  currency: string;
  points: GymDashboardRevenueTrendPoint[];
}

export interface GymDashboardOverviewResponse {
  profile: GymProfileResponse;
  settlementAnalytics: GymSettlementAnalyticsResponse;
  dueTimeline: SettlementDueTimelineResponse;
  checkInAnalytics: GymCheckInAnalyticsResponse;
  reviewAnalytics: GymReviewAnalyticsResponse;
  membersMetrics: GymMembersMetricsResponse;
  doorDevice: GymDoorDeviceResponse | null;
  recentPayoutBatches: PayoutSettlementResponse[];
}

export interface GymDashboardOverviewParams {
  membersWindow?: GymDashboardOverviewMembersWindow;
}
