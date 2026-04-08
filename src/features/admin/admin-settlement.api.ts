import { AxiosHeaders } from "axios";

import apiClient from "@/shared/api/client";
import type {
  CreatePayoutSettlementRequest,
  GymCheckinSettlementSearchParams,
  GymPayoutSettlementSearchParams,
  GymSettlementAnalyticsResponse,
  PendingGymSettlementPage,
  PendingGymSettlementSearchParams,
  PayoutSettlementPage,
  PayoutSettlementSearchParams,
  PayoutSettlementResponse,
  SettlementDueTimelineResponse,
} from "@/features/admin/admin-settlement.model";

function buildPendingParams(params?: PendingGymSettlementSearchParams) {
  if (!params) return undefined;
  return {
    ...params,
    payoutStatus: params.payoutStatus,
  };
}

function buildBatchParams(params?: PayoutSettlementSearchParams) {
  if (!params) return undefined;
  return {
    ...params,
    status: params.status,
  };
}

const formDataTransformRequest = [
  (data: unknown, headers: unknown) => {
    if (data instanceof FormData && headers) {
      if (headers instanceof AxiosHeaders) {
        headers.delete("Content-Type");
      } else {
        delete (headers as Record<string, unknown>)["Content-Type"];
      }
    }
    return data;
  },
] as const;

/** GET /api/admin/payout-settlements/pending */
export async function getAdminPendingSettlementsApi(
  params?: PendingGymSettlementSearchParams
): Promise<PendingGymSettlementPage> {
  const response = await apiClient.get<PendingGymSettlementPage>("/admin/payout-settlements/pending", {
    params: buildPendingParams(params),
  });
  return response.data;
}

/** GET /api/admin/payout-settlements/due-timeline */
export async function getAdminDueTimelineApi(
  params?: PendingGymSettlementSearchParams
): Promise<SettlementDueTimelineResponse> {
  const response = await apiClient.get<SettlementDueTimelineResponse>("/admin/payout-settlements/due-timeline", {
    params: buildPendingParams(params),
  });
  return response.data;
}

/** GET /api/admin/payout-settlements/batches */
export async function getAdminPayoutBatchesApi(
  params?: PayoutSettlementSearchParams
): Promise<PayoutSettlementPage> {
  const response = await apiClient.get<PayoutSettlementPage>("/admin/payout-settlements/batches", {
    params: buildBatchParams(params),
  });
  return response.data;
}

/** GET /api/gyms/me/payout-settlements/batches */
export async function getGymPayoutBatchesApi(
  params?: GymPayoutSettlementSearchParams
): Promise<PayoutSettlementPage> {
  const response = await apiClient.get<PayoutSettlementPage>("/gyms/me/payout-settlements/batches", {
    params: buildBatchParams(params),
  });
  return response.data;
}

/**
 * POST /api/admin/gyms/:gymId/payout-settlements (multipart)
 * Creates batch; transaction reference and receipt image are optional parts.
 */
export async function createAdminPayoutSettlementApi(
  gymId: number,
  payload: CreatePayoutSettlementRequest,
  transactionReference?: string | null,
  proofImage?: File | null
): Promise<PayoutSettlementResponse> {
  const formData = new FormData();
  formData.append("request", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  const ref = transactionReference?.trim();
  if (ref) {
    formData.append("transactionReference", ref);
  }
  if (proofImage) {
    formData.append("proofImage", proofImage);
  }

  const response = await apiClient.post<PayoutSettlementResponse>(`/admin/gyms/${gymId}/payout-settlements`, formData, {
    timeout: 120_000,
    transformRequest: [...formDataTransformRequest],
  });
  return response.data;
}

/** GET /api/gyms/me/payout-settlements/checkin-settlements */
export async function getGymCheckinSettlementsApi(
  params?: GymCheckinSettlementSearchParams
): Promise<PendingGymSettlementPage> {
  const response = await apiClient.get<PendingGymSettlementPage>("/gyms/me/payout-settlements/checkin-settlements", {
    params,
  });
  return response.data;
}

/** GET /api/gyms/me/payout-settlements/due-timeline */
export async function getGymDueTimelineApi(
  params?: GymCheckinSettlementSearchParams
): Promise<SettlementDueTimelineResponse> {
  const response = await apiClient.get<SettlementDueTimelineResponse>("/gyms/me/payout-settlements/due-timeline", {
    params,
  });
  return response.data;
}

/** PATCH /api/gyms/me/payout-settlements/:id/review */
export async function reviewGymPayoutSettlementApi(
  payoutSettlementId: number,
  approved: boolean
): Promise<PayoutSettlementResponse> {
  const response = await apiClient.patch<PayoutSettlementResponse>(
    `/gyms/me/payout-settlements/${payoutSettlementId}/review`,
    { approved },
  );
  return response.data;
}

/** GET /api/gyms/me/payout-settlements/analytics */
export async function getGymSettlementAnalyticsApi(): Promise<GymSettlementAnalyticsResponse> {
  const response = await apiClient.get<GymSettlementAnalyticsResponse>("/gyms/me/payout-settlements/analytics");
  return response.data;
}
