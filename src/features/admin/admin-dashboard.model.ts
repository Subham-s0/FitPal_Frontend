export interface DashboardSnapshotResponse {
  totalGyms: number;
  onlineGyms: number;
  offlineGyms: number;
  activeCheckIns: number;
  checkInsToday: number;
  checkInsYesterday: number;
  totalMembers: number;
  newMembersThisMonth: number;
}

export interface DashboardRevenueResponse {
  currency: string;
  totalCollected: number;
  baseAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  vatAmount: number;
  taxRate: number;
  serviceChargeRate: number;
  effectiveTaxRate: number;
  effectiveServiceChargeRate: number;
  subscriptionCount: number;
  totalCollectedPrevPeriod: number;
  allTimeTotalCollected: number;
  allTimeBaseAmount: number;
  allTimeTaxAmount: number;
  allTimeServiceChargeAmount: number;
  allTimeVatAmount: number;
  allTimeCompletedCount: number;
  dueToGyms: number;
  paidToGyms: number;
  platformNetRevenue: number;
}

export interface RevenueTrendPoint {
  timestamp: string;
  amount: number;
}

export interface DashboardRevenueTrendResponse {
  points: RevenueTrendPoint[];
  subtitle: string;
}

export interface PeakActivityPoint {
  label: string;
  count: number;
}

export interface DashboardPeakActivityResponse {
  points: PeakActivityPoint[];
  subtitle: string;
}

export interface PlanDistributionItem {
  planType: string;
  billingCycle: string;
  count: number;
  percent: number;
}

export interface DashboardMembersResponse {
  totalPlatformUsers: number;
  newThisMonth: number;
  churned: number;
  churnedGyms: number;
  verifiedPercent: number;
  planDistribution: PlanDistributionItem[];
  mostPopularPlan: string;
  mostPopularCount: number;
  gymsPendingApproval: number;
  gymsRejected: number;
  gymsApproved: number;
}

export interface DashboardRecentSignupResponse {
  accountId: number;
  name: string;
  email: string;
  profileImageUrl: string | null;
  role: string | null;
  gymApprovalStatus: string | null;
  planName: string | null;
  billingCycle: string | null;
  createdAt: string;
}

export interface DashboardMemberActivityResponse {
  checkedInToday: number;
  avgSessionsPerWeek: number;
  suspendedAccounts: number;
  avgSessionMinutes: number;
}

export interface DashboardTopGymResponse {
  gymId: number;
  name: string;
  logoUrl: string | null;
  checkIns: number;
  trendPercent: number | null;
  joinedAt: string | null;
  accessMode: string | null;
  eligibleTier: string | null;
  eligible: boolean;
}

export interface DashboardRecentPayoutResponse {
  payoutSettlementId: number;
  gymName: string;
  netAmount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface ApiVolumePoint {
  label: string;
  count: number;
}

export interface ApiSlowEndpoint {
  method: string;
  endpoint: string;
  avgMs: number;
  hits: number;
}

export interface ApiErrorCategory {
  category: string;
  count: number;
}

export interface DashboardApiHealthResponse {
  totalRequests: number;
  totalRequestsPrev: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  errorRate: number;
  errorCount: number;
  slowestMs: number;
  slowestEndpoint: string;
  volumePoints: ApiVolumePoint[];
  slowestEndpoints: ApiSlowEndpoint[];
  errorBreakdown: ApiErrorCategory[];
}

export type RevenueTrendRange = "WEEKLY" | "MONTHLY" | "YEARLY";
export type PeakActivityRange = "THIS_WEEK" | "THIS_MONTH" | "ALL_TIME";
export type TopGymsRange = "ALL_TIME" | "LAST_MONTH" | "LAST_WEEK";
export type ApiHealthRange = "TODAY" | "LAST_WEEK" | "LAST_MONTH";
