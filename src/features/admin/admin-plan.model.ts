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
  currency: string;
};

export const ALL_PLAN_TYPES: PlanType[] = ["BASIC", "PRO", "ELITE", "PROMO"];
export const ALL_ACCESS_TIERS: AccessTier[] = ["BASIC", "PRO", "ELITE"];

export const DEFAULT_MONTHLY_DURATION_DAYS = 28;
export const DEFAULT_YEARLY_DURATION_DAYS = 336;
