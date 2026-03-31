import apiClient from "@/shared/api/client";
import type {
  CheckInCheckOutRequest,
  CheckInScanRequest,
  GymCheckInResponse,
  PageResponse,
  UserCheckInHistoryItemResponse,
  UserCheckInHistorySearchRequest,
  UserCheckInHistorySummaryResponse,
} from "@/features/check-in/model";

function buildHistoryParams(request?: UserCheckInHistorySearchRequest) {
  if (!request) {
    return undefined;
  }

  return {
    ...request,
    statuses: request.statuses?.length ? request.statuses.join(",") : undefined,
  };
}

export async function scanMyCheckInApi(payload: CheckInScanRequest): Promise<GymCheckInResponse> {
  const response = await apiClient.post<GymCheckInResponse>("/users/me/check-ins/scan", payload);
  return response.data;
}

export async function checkOutMyCheckInApi(
  checkInId: string,
  payload?: CheckInCheckOutRequest
): Promise<GymCheckInResponse> {
  const response = await apiClient.post<GymCheckInResponse>(
    `/users/me/check-ins/${checkInId}/check-out`,
    payload ?? {}
  );
  return response.data;
}

export async function getMyCheckInsApi(): Promise<GymCheckInResponse[]> {
  const response = await apiClient.get<GymCheckInResponse[]>("/users/me/check-ins");
  return response.data;
}

export async function getMyCheckInHistoryApi(
  request?: UserCheckInHistorySearchRequest
): Promise<PageResponse<UserCheckInHistoryItemResponse>> {
  const response = await apiClient.get<PageResponse<UserCheckInHistoryItemResponse>>(
    "/users/me/check-ins/history",
    { params: buildHistoryParams(request) }
  );
  return response.data;
}

export async function getMyCheckInHistorySummaryApi(
  request?: UserCheckInHistorySearchRequest
): Promise<UserCheckInHistorySummaryResponse> {
  const response = await apiClient.get<UserCheckInHistorySummaryResponse>(
    "/users/me/check-ins/history/summary",
    { params: buildHistoryParams(request) }
  );
  return response.data;
}
