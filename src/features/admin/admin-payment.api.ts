import { getApiData } from "@/shared/api/client";
import type {
  AdminPaymentHistoryPage,
  AdminPaymentHistorySearchParams,
  AdminPaymentMetricsResponse,
  AdminRevenueTrendResponse,
} from "@/features/admin/admin-payment.model";
import type { RevenueTrendGranularity } from "@/features/payment/payment.constants";

function buildAdminHistoryParams(params?: AdminPaymentHistorySearchParams) {
  if (!params) return undefined;
  return {
    ...params,
    statuses: params.statuses?.length ? params.statuses.join(",") : undefined,
    paymentMethods: params.paymentMethods?.length ? params.paymentMethods.join(",") : undefined,
  };
}

/** GET /api/admin/payments/metrics */
export async function getAdminPaymentMetricsApi(): Promise<AdminPaymentMetricsResponse> {
  return getApiData<AdminPaymentMetricsResponse>("/admin/payments/metrics");
}

/** GET /api/admin/payments/revenue-trend */
export async function getAdminRevenueTrendApi(
  granularity: RevenueTrendGranularity
): Promise<AdminRevenueTrendResponse> {
  return getApiData<AdminRevenueTrendResponse>("/admin/payments/revenue-trend", {
    params: { granularity },
  });
}

/** GET /api/admin/payments/history */
export async function getAdminPaymentHistoryApi(
  params?: AdminPaymentHistorySearchParams
): Promise<AdminPaymentHistoryPage> {
  return getApiData<AdminPaymentHistoryPage>("/admin/payments/history", {
    params: buildAdminHistoryParams(params),
  });
}
