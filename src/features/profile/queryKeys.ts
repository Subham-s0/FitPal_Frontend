import type { PaymentMethod, PaymentStatus } from "@/features/payment/model";

/**
 * Centralized query keys for the profile feature.
 * 
 * Key structure:
 * - profile.all: Root key for all profile queries
 * - profile.user: User profile data
 * - profile.subscription: User subscription details
 * - profile.routineSettings: User routine preferences
 * - profile.paymentHistory: Payment transaction history with filters
 * - profile.paymentHistorySummary: Payment summary totals with filters
 */
export const profileQueryKeys = {
  // Root key
  all: ["profile"] as const,

  // User profile data
  user: () => [...profileQueryKeys.all, "user"] as const,

  // User subscription/membership state
  subscription: () => [...profileQueryKeys.all, "subscription"] as const,

  // Routine settings/preferences
  routineSettings: () => [...profileQueryKeys.all, "routine-settings"] as const,

  // Payment history with filters and pagination
  paymentHistory: (
    status?: PaymentStatus | "all" | null,
    method?: PaymentMethod | "all" | null,
    sortDirection?: "ASC" | "DESC",
    page?: number
  ) => [
    ...profileQueryKeys.all,
    "payment-history",
    status ?? "all",
    method ?? "all",
    sortDirection ?? "DESC",
    page ?? 0,
  ] as const,

  paymentHistorySummary: (
    status?: PaymentStatus | "all" | null,
    method?: PaymentMethod | "all" | null
  ) => [
    ...profileQueryKeys.all,
    "payment-history-summary",
    status ?? "all",
    method ?? "all",
  ] as const,
};
