import type { AccessTier, PlanType } from "@/features/plans/model";

export type PlanUpsertPayload = {
  planType: PlanType;
  accessTierGranted: AccessTier;
  name: string;
  description: string;
  monthlyPrice: number;
  currency: string;
  monthlyDurationDays: number;
  yearlyDurationDays: number;
  yearlyDiscountPercent: number;
  mostPopular: boolean;
  active: boolean;
  features: string[];
};

export type ApplicationRuleSummaryResponse = {
  /** ISO 4217 currency code — e.g. "NPR" */
  currency: string;
  /** Tax rate as a decimal 0–1 e.g. 0.13 = 13% */
  taxRate: number;
  /** Service charge rate as a decimal 0–1 e.g. 0.02 = 2% */
  serviceChargeRate: number;
  /** App commission rate as a decimal 0–1 e.g. 0.10 = 10% */
  appCommissionRate: number;
  /** Derived: 1 - appCommissionRate */
  gymShareRate: number;
  /** IANA timezone string e.g. "Asia/Kathmandu" */
  timeZoneId: string;
  /** Door controller poll interval (seconds) */
  doorPollIntervalSeconds: number;
  /** Door unlock duration (seconds) */
  doorUnlockDurationSeconds: number;
  /** Door command expiry (seconds) */
  doorCommandExpirySeconds: number;
  /** Door ACK timeout (seconds) */
  doorAckTimeoutSeconds: number;
  /** Window to consider a door device online (seconds) */
  doorDeviceOnlineWindowSeconds: number;
};

export const ALL_PLAN_TYPES: PlanType[] = ["BASIC", "PRO", "ELITE", "PROMO"];
export const ALL_ACCESS_TIERS: AccessTier[] = ["BASIC", "PRO", "ELITE"];

export const DEFAULT_MONTHLY_DURATION_DAYS = 28;
export const DEFAULT_YEARLY_DURATION_DAYS = 336;
