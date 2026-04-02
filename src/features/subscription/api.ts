import apiClient from "@/shared/api/client";
import type {
  PageResponse,
  PauseMySubscriptionRequest,
  SelectUserSubscriptionRequest,
  UserSubscriptionHistoryItemResponse,
  UserSubscriptionHistorySearchRequest,
  UserSubscriptionResponse,
  UserSubscriptionStateResponse,
} from "@/features/subscription/model";

function buildSubscriptionHistoryParams(request?: UserSubscriptionHistorySearchRequest) {
  if (!request) {
    return undefined;
  }

  return {
    ...request,
    statuses: request.statuses?.length ? request.statuses.join(",") : undefined,
  };
}

/** GET /api/users/me/subscription */
export async function getMySubscriptionApi(): Promise<UserSubscriptionStateResponse> {
  const response = await apiClient.get<UserSubscriptionStateResponse>("/users/me/subscription");
  return response.data;
}

/** POST /api/users/me/subscription */
export async function selectMySubscriptionApi(
  payload: SelectUserSubscriptionRequest
): Promise<UserSubscriptionResponse> {
  const response = await apiClient.post<UserSubscriptionResponse>("/users/me/subscription", payload);
  return response.data;
}

/** POST /api/users/me/subscription/pause */
export async function pauseMySubscriptionApi(
  payload: PauseMySubscriptionRequest
): Promise<UserSubscriptionResponse> {
  const response = await apiClient.post<UserSubscriptionResponse>(
    "/users/me/subscription/pause",
    payload
  );
  return response.data;
}

/** POST /api/users/me/subscription/resume */
export async function resumeMySubscriptionApi(): Promise<UserSubscriptionResponse> {
  const response = await apiClient.post<UserSubscriptionResponse>("/users/me/subscription/resume");
  return response.data;
}

/** GET /api/users/me/subscription/history */
export async function getMySubscriptionHistoryApi(
  request?: UserSubscriptionHistorySearchRequest
): Promise<PageResponse<UserSubscriptionHistoryItemResponse>> {
  const response = await apiClient.get<PageResponse<UserSubscriptionHistoryItemResponse>>(
    "/users/me/subscription/history",
    { params: buildSubscriptionHistoryParams(request) }
  );
  return response.data;
}
