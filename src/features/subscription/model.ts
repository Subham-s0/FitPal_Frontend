export type BillingCycle = "MONTHLY" | "YEARLY";

export type SubscriptionStatus =
  | "PENDING"
  | "UPCOMING"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";

export type SubscriptionPauseHistoryStatus =
  | "SCHEDULED"
  | "PAUSED"
  | "RESUMED_EARLY"
  | "COMPLETED"
  | "CANCELLED_SCHEDULED";

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SelectUserSubscriptionRequest {
  planId: number;
  billingCycle: BillingCycle;
}

export interface PauseMySubscriptionRequest {
  pauseStartDate: string;
  pauseDays: number;
}

export interface SubscriptionPauseHistoryItemResponse {
  pauseEventId: number;
  pauseStartAt: string;
  pauseDays: number;
  plannedResumeAt: string;
  actualResumeAt: string | null;
  historyStatus: SubscriptionPauseHistoryStatus;
}

export interface UserSubscriptionResponse {
  accountId: number;
  userId: number;
  onboardingStep: number;
  profileCompleted: boolean;
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
  hasDashboardAccess: boolean;
  subscriptionId: number;
  planId: number;
  planType: string;
  planName: string;
  billingCycle: BillingCycle;
  subscriptionStatus: SubscriptionStatus;
  baseAmount: number;
  billedAmount: number;
  discountAmount: number;
  discountPercent: number;
    taxRate: number;
    taxAmount: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  totalAmount: number;
  autoRenew: boolean;
  pauseCount: number;
  pauseCountCurrentWindow: number;
  pauseLimitPerWindow: number;
  totalPauseLimit: number;
  scheduledPauseStartAt: string | null;
  scheduledPauseUntil: string | null;
  pausedAt: string | null;
  pauseUntil: string | null;
  startsAt: string | null;
  endsAt: string | null;
  pauseHistory: SubscriptionPauseHistoryItemResponse[];
}

export interface UserSubscriptionStateResponse {
  selected: boolean;
  subscription: UserSubscriptionResponse | null;
  currentSubscription: UserSubscriptionResponse | null;
  upcomingSubscription: UserSubscriptionResponse | null;
  currentAccessEndsAt: string | null;
  nextMembershipStartsAt: string | null;
  totalPaidCoverageEndsAt: string | null;
}

export interface UserSubscriptionHistoryItemResponse {
  subscriptionId: number;
  planId: number | null;
  planType: string | null;
  planName: string | null;
  billingCycle: BillingCycle | null;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  totalAmount: number;
}

export interface UserSubscriptionHistorySearchRequest {
  statuses?: SubscriptionStatus[];
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}
