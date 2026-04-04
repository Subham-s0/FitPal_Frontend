import apiClient from "@/shared/api/client";
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
  const response = await apiClient.get<AdminPaymentMetricsResponse>("/admin/payments/metrics");
  return response.data;
}

/** GET /api/admin/payments/revenue-trend */
export async function getAdminRevenueTrendApi(
  granularity: RevenueTrendGranularity
): Promise<AdminRevenueTrendResponse> {
  const response = await apiClient.get<AdminRevenueTrendResponse>("/admin/payments/revenue-trend", {
    params: { granularity },
  });
  return response.data;
}

/** GET /api/admin/payments/history */
export async function getAdminPaymentHistoryApi(
  params?: AdminPaymentHistorySearchParams
): Promise<AdminPaymentHistoryPage> {
  const response = await apiClient.get<AdminPaymentHistoryPage>("/admin/payments/history", {
    params: buildAdminHistoryParams(params),
  });
  return response.data;
}
