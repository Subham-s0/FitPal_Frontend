export type BillingCycle = "MONTHLY" | "YEARLY";

export type SubscriptionStatus =
  | "PENDING"
  | "UPCOMING"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";

export interface SelectUserSubscriptionRequest {
  planId: number;
  billingCycle: BillingCycle;
}

export interface UserSubscriptionResponse {
  accountId: number;
  userId: number;
  onboardingStep: number;
  profileCompleted: boolean;
  hasSubscription: boolean;
  hasActiveSubscription: boolean;
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
}
