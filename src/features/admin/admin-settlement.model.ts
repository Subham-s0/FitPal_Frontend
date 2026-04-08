import type { PageResponse } from "@/features/admin/admin-gym.model";

export type GymSettlementPayoutStatus = "PENDING" | "IN_PAYOUT" | "PAID";

export type PayoutSettlementStatus =
  | "CREATED"
  | "GYM_REVIEW_PENDING"
  | "APPROVED"
  | "PAID"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED";

export interface PendingGymSettlementResponse {
  checkInSettlementId: number;
  gymId: number | null;
  gymName: string | null;
  accountId: number | null;
  memberEmail: string | null;
  memberProfileImageUrl: string | null;
  visitDate: string | null;
  checkedInAt: string | null;
  currency: string;
  memberName: string | null;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  settled: boolean;
  payoutStatus: GymSettlementPayoutStatus;
  payoutSettlementId: number | null;
}

export interface PendingGymSettlementSearchParams {
  gymId?: number;
  accountId?: number;
  payoutStatus?: GymSettlementPayoutStatus;
  visitDateFrom?: string;
  visitDateTo?: string;
  memberNamePrefix?: string;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface CreatePayoutSettlementRequest {
  payoutAccountId: number;
  currency: string;
  note?: string | null;
  settlementIds?: number[];
  visitDateFrom?: string;
  visitDateTo?: string;
}

export interface PayoutSettlementResponse {
  payoutSettlementId: number;
  gymId: number;
  gymName: string | null;
  payoutAccountId: number;
  provider: string;
  walletIdentifierSnapshot: string;
  accountNameSnapshot: string;
  currency: string;
  settlementCount: number;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: PayoutSettlementStatus;
  transactionReference: string | null;
  proofUrl: string | null;
  proofPublicId: string | null;
  proofUploadedAt: string | null;
  note: string | null;
  createdAt: string;
  settlementIds: number[];
  createdByName: string | null;
  paidByName: string | null;
  paidAt: string | null;
  gymReviewedAt: string | null;
}

export interface GymCheckinSettlementSearchParams {
  payoutStatus?: GymSettlementPayoutStatus;
  visitDateFrom?: string;
  visitDateTo?: string;
  memberNamePrefix?: string;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export interface PayoutSettlementSearchParams {
  gymId?: number;
  status?: PayoutSettlementStatus;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}

export type GymPayoutSettlementSearchParams = Omit<PayoutSettlementSearchParams, "gymId">;

export type PendingGymSettlementPage = PageResponse<PendingGymSettlementResponse>;
export type PayoutSettlementPage = PageResponse<PayoutSettlementResponse>;

export interface SettlementDueTimelinePointResponse {
  date: string;
  checkinAmount: number;
  paidAmount: number;
  dueAmount: number;
}

export interface SettlementDueTimelineResponse {
  currency: string;
  startDate: string | null;
  endDate: string;
  totalDue: number;
  points: SettlementDueTimelinePointResponse[];
}

export interface GymSettlementAnalyticsResponse {
  currency: string;
  pendingBatchAmount: number;
  pendingBatchCount: number;
  gymReviewPendingAmount: number;
  gymReviewPendingCount: number;
  receivedAmount: number;
  receivedCount: number;
  receivableAmount: number;
  receivableCount: number;
  grossSum: number;
  netSum: number;
  totalCheckinSettlements: number;
  checkinPendingCount: number;
  checkinInPayoutCount: number;
  checkinPaidCount: number;
  weeklyCheckins: { date: string; count: number }[];
  monthlyCheckins: { yearMonth: string; count: number }[];
}
