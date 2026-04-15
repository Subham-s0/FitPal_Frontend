import type { PageResponse } from "@/shared/api/model";
import type { PaymentMethod, PaymentStatus } from "@/features/payment/model";
import type { BillingCycle } from "@/features/subscription/model";
import type { RevenueTrendGranularity } from "@/features/payment/payment.constants";

export type AdminPaymentMetricsResponse = {
  currency: string;
  /** All attempts — “All statuses / All methods” counts in filters */
  totalPaymentCount: number;
  /** Month-to-date completed revenue (same period basis as Dashboard total collected) */
  totalRevenueCompletedMonthToDate: number;
  totalRevenueCompleted: number;
  completedPaymentCount: number;
  cancelledPaymentCount: number;
  failedPaymentCount: number;
  pendingPaymentCount: number;
  khaltiPaymentCount: number;
  esewaPaymentCount: number;
  khaltiRevenueCompleted: number;
  esewaRevenueCompleted: number;
};

export type AdminRevenueTrendPoint = {
  periodStart: string;
  totalAmount: number;
};

export type AdminRevenueTrendResponse = {
  granularity: RevenueTrendGranularity;
  rangeFrom: string;
  rangeTo: string;
  points: AdminRevenueTrendPoint[];
};

export type AdminPaymentHistoryItemResponse = {
  paymentAttemptId: number;
  accountId: number;
  accountEmail: string;
  /** Member username (USER accounts); omitted on older API responses */
  accountUserName?: string | null;
  subscriptionId: number | null;
  planId: number | null;
  planType: string | null;
  planName: string | null;
  billingCycle: BillingCycle | null;
  invoiceNumber: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTime: string;
  startsAt: string | null;
  endsAt: string | null;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  vatAmount: number;
  totalAmount: number;
  billingName: string | null;
  billingEmail: string | null;
  billingPhoneNumber: string | null;
  billingAddress: string | null;
  billingCity: string | null;
  gatewayReference: string | null;
  gatewayTransactionId: string | null;
  gatewayResponseCode: string | null;
  gatewayResponseMessage: string | null;
};

export type AdminPaymentHistorySearchParams = {
  query?: string;
  statuses?: PaymentStatus[];
  paymentMethods?: PaymentMethod[];
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
};

export type AdminPaymentHistoryPage = PageResponse<AdminPaymentHistoryItemResponse>;
