export type DashboardActivityDisplayState = "SUCCESS" | "MISSED" | "TODAY" | "FUTURE";
export type DashboardUpcomingSessionState = "PLANNED" | "IN_PROGRESS" | "EMPTY";
export type DashboardRoutineHeatmapState = "READY" | "EMPTY";
export type DashboardVisitRangeType = "WEEK" | "MONTH" | "YEAR";

export interface DashboardPlanCardResponse {
  hasSubscription: boolean;
  planName: string | null;
  planType: string | null;
  billingCycle: string | null;
  subscriptionStatus: string | null;
  currentAccessEndsAt: string | null;
  nextMembershipStartsAt: string | null;
  totalPaidCoverageEndsAt: string | null;
  remainingDays: number | null;
  durationDays: number | null;
  progressPercent: number | null;
}

export interface DashboardMonthlyActivityDayResponse {
  date: string;
  dayOfMonth: number;
  hasValidCheckIn: boolean;
  displayState: DashboardActivityDisplayState;
}

export interface DashboardMonthlyActivityResponse {
  year: number;
  month: number;
  days: DashboardMonthlyActivityDayResponse[];
}

export interface DashboardExercisePreviewResponse {
  exerciseName: string;
  setCount: number;
  repsLabel: string | null;
  weightLabel: string | null;
}

export interface DashboardHeatmapExerciseResponse {
  exerciseName: string;
  setCount: number;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

export interface DashboardTopFacilityResponse {
  gymId: number;
  gymName: string | null;
  city: string | null;
  logoUrl: string | null;
  visitCount: number;
}

export interface DashboardMemberStatsResponse {
  rangeType: DashboardVisitRangeType;
  rangeLabel: string;
  totalVisits: number;
  successfulVisits: number;
  deniedVisits: number;
  uniqueGyms: number;
  comparisonLabel: string | null;
  topFacilities: DashboardTopFacilityResponse[];
}

export interface DashboardUpcomingSessionResponse {
  state: DashboardUpcomingSessionState;
  title: string | null;
  routineName: string | null;
  routineDayName: string | null;
  focusLabel: string | null;
  exerciseCount: number;
  estimatedDurationMinutes: number;
  routineId: string | null;
  routineDayId: string | null;
  routineLogId: string | null;
  emptyStateTitle: string | null;
  emptyStateMessage: string | null;
  exercises: DashboardExercisePreviewResponse[];
}

export interface DashboardRoutineHeatmapResponse {
  state: DashboardRoutineHeatmapState;
  title: string;
  routineName: string | null;
  routineDayName: string | null;
  emptyStateTitle: string | null;
  emptyStateMessage: string | null;
  exercises: DashboardHeatmapExerciseResponse[];
}

export interface DashboardSummaryResponse {
  generatedAt: string;
  planCard: DashboardPlanCardResponse;
  monthlyActivityCard: DashboardMonthlyActivityResponse;
  upcomingSessionCard: DashboardUpcomingSessionResponse;
  memberStatsCard: DashboardMemberStatsResponse;
  routineHeatmapCard: DashboardRoutineHeatmapResponse;
}

export interface DashboardMonthlyActivityRequest {
  year?: number;
  month?: number;
}

export interface DashboardVisitStatsRequest {
  rangeType: DashboardVisitRangeType;
  year?: number;
  month?: number;
  weekStart?: string;
}
