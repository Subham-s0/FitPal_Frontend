import type { BillingCycle } from "@/features/subscription/model";

export type PaymentMethod = "ESEWA" | "KHALTI";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface EsewaInitiatePaymentRequest {
  subscriptionId: number;
  successUrl: string;
  failureUrl: string;
  billingName?: string;
  billingEmail?: string;
  billingPhoneNumber?: string;
  billingAddress?: string;
  billingCity?: string;
}

export interface EsewaInitiatePaymentResponse {
  subscriptionId: number;
  paymentAttemptId: number;
  paymentUrl: string;
  formFields: Record<string, string>;
}

export interface KhaltiInitiatePaymentRequest {
  subscriptionId: number;
  returnUrl: string;
  websiteUrl: string;
  billingName: string;
  billingEmail: string;
  billingPhoneNumber: string;
}

export interface KhaltiInitiatePaymentResponse {
  subscriptionId: number;
  paymentAttemptId: number;
  pidx: string;
  paymentUrl: string;
  expiresAt: string | null;
  expiresIn: number | null;
}

export interface KhaltiLookupPaymentRequest {
  paymentAttemptId: number;
  pidx?: string;
}

export interface EsewaLookupPaymentRequest {
  paymentAttemptId: number;
}

export interface EsewaConfirmPaymentRequest {
  paymentAttemptId: number;
  data: string;
}

export interface EsewaFailurePaymentRequest {
  paymentAttemptId: number;
  reason?: string;
}

export interface PaymentAttemptStatusResponse {
  subscriptionId: number;
  paymentAttemptId: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subscriptionStatus: string;
  gatewayReference: string | null;
  gatewayTransactionId: string | null;
  gatewayResponseCode: string | null;
  gatewayResponseMessage: string | null;
}

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UserPaymentHistoryItemResponse {
  paymentAttemptId: number;
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
}

export interface UserPaymentHistorySearchRequest {
  statuses?: PaymentStatus[];
  paymentMethods?: PaymentMethod[];
  sortBy?: "paymentTime" | "createdAt" | "updatedAt" | "paymentStatus" | "paymentMethod" | "totalAmount";
  sortDirection?: "ASC" | "DESC";
  page?: number;
  size?: number;
}
