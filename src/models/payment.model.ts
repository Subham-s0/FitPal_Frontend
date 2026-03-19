import type { BillingCycle } from "./subscription.model";

export type PaymentMethod = "ESEWA";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export interface EsewaInitiatePaymentRequest {
  subscriptionId?: number;
  planId?: number;
  billingCycle?: BillingCycle;
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
