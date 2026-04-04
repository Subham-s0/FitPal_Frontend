import type { PaymentMethod, PaymentStatus } from "@/features/payment/model";

/** Canonical order — matches backend {@code PaymentStatus}. */
export const PAYMENT_STATUS_ORDER: readonly PaymentStatus[] = [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export const PAYMENT_METHOD_ORDER: readonly PaymentMethod[] = ["ESEWA", "KHALTI"] as const;

/** Admin revenue charts — matches backend {@code AdminPaymentTrendGranularity}. */
export const REVENUE_TREND_GRANULARITIES = ["WEEKLY", "MONTHLY", "YEARLY"] as const;
export type RevenueTrendGranularity = (typeof REVENUE_TREND_GRANULARITIES)[number];

export const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "PENDING", label: "Pending" },
] as const;

export const METHOD_FILTER_OPTIONS = [
  { value: "ALL", label: "All methods" },
  { value: "ESEWA", label: "eSewa" },
  { value: "KHALTI", label: "Khalti" },
] as const;

export function getPaymentStatusBadgeClassName(status: PaymentStatus): string {
  switch (status) {
    case "COMPLETED":
      return "border-0 bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20";
    case "FAILED":
      return "border-0 bg-red-500/12 text-red-400 hover:bg-red-500/20";
    case "CANCELLED":
      return "border-0 bg-amber-500/12 text-amber-400 hover:bg-amber-500/20";
    case "PENDING":
      return "border-0 bg-sky-500/12 text-sky-400 hover:bg-sky-500/20";
    default:
      return "border-0 bg-white/10 text-slate-300";
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return method === "ESEWA" ? "eSewa" : "Khalti";
}

export function revenueTrendGranularityLabel(g: RevenueTrendGranularity): string {
  switch (g) {
    case "WEEKLY":
      return "7 days";
    case "MONTHLY":
      return "Monthly";
    case "YEARLY":
      return "Yearly";
    default:
      return g;
  }
}
