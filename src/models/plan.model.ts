export type PlanType = "BASIC" | "PRO" | "ELITE" | "PROMO";
export type AccessTier = "BASIC" | "PRO" | "ELITE";

export interface PlanResponse {
  planId: number;
  planType: PlanType;
  accessTierGranted: AccessTier;
  name: string;
  description: string;
  monthlyPrice: number;
  currency: string;
  monthlyDurationDays: number;
  yearlyDurationDays: number;
  yearlyDiscountPercent: number;
  yearlyBaseAmount: number;
  yearlyBilledAmount: number;
  yearlySavingsAmount: number;
  mostPopular: boolean;
  active: boolean;
  features: string[];
  createdAt: string;
  updatedAt: string;
}
