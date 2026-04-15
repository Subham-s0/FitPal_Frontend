import { getApiData, postApiData } from "@/shared/api/client";
import type { PageResponse } from "@/shared/api/model";
import type {
  CheckInCheckOutRequest,
  CheckInScanRequest,
  GymCheckInResponse,
  UserCheckInHistorySummaryRequest,
  UserCheckInHistoryItemResponse,
  UserCheckInHistorySearchRequest,
  UserCheckInHistorySummaryResponse,
} from "@/features/check-in/model";

function buildHistoryParams(
  request?: UserCheckInHistorySearchRequest | UserCheckInHistorySummaryRequest
) {
  if (!request) {
    return undefined;
  }

  return {
    ...request,
    statuses: request.statuses?.length ? request.statuses.join(",") : undefined,
  };
}

export async function scanMyCheckInApi(payload: CheckInScanRequest): Promise<GymCheckInResponse> {
  return postApiData<GymCheckInResponse>("/users/me/check-ins/scan", payload);
}

export async function checkOutMyCheckInApi(
  checkInId: string,
  payload?: CheckInCheckOutRequest
): Promise<GymCheckInResponse> {
  return postApiData<GymCheckInResponse>(
    `/users/me/check-ins/${checkInId}/check-out`,
    payload ?? {}
  );
}

export async function getMyCheckInsApi(): Promise<GymCheckInResponse[]> {
  return getApiData<GymCheckInResponse[]>("/users/me/check-ins");
}

export async function getMyCheckInHistoryApi(
  request?: UserCheckInHistorySearchRequest
): Promise<PageResponse<UserCheckInHistoryItemResponse>> {
  return getApiData<PageResponse<UserCheckInHistoryItemResponse>>(
    "/users/me/check-ins/history",
    { params: buildHistoryParams(request) }
  );
}

export async function getMyCheckInHistorySummaryApi(
  request?: UserCheckInHistorySummaryRequest
): Promise<UserCheckInHistorySummaryResponse> {
  return getApiData<UserCheckInHistorySummaryResponse>(
    "/users/me/check-ins/history/summary",
    { params: buildHistoryParams(request) }
  );
}
