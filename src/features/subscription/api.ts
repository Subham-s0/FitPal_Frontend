import { getApiData, postApiData } from "@/shared/api/client";
import type { PageResponse } from "@/shared/api/model";
import type {
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
  return getApiData<UserSubscriptionStateResponse>("/users/me/subscription");
}

/** POST /api/users/me/subscription */
export async function selectMySubscriptionApi(
  payload: SelectUserSubscriptionRequest
): Promise<UserSubscriptionResponse> {
  return postApiData<UserSubscriptionResponse>("/users/me/subscription", payload);
}

/** POST /api/users/me/subscription/pause */
export async function pauseMySubscriptionApi(
  payload: PauseMySubscriptionRequest
): Promise<UserSubscriptionResponse> {
  return postApiData<UserSubscriptionResponse>(
    "/users/me/subscription/pause",
    payload
  );
}

/** POST /api/users/me/subscription/resume */
export async function resumeMySubscriptionApi(): Promise<UserSubscriptionResponse> {
  return postApiData<UserSubscriptionResponse>("/users/me/subscription/resume");
}

/** GET /api/users/me/subscription/history */
export async function getMySubscriptionHistoryApi(
  request?: UserSubscriptionHistorySearchRequest
): Promise<PageResponse<UserSubscriptionHistoryItemResponse>> {
  return getApiData<PageResponse<UserSubscriptionHistoryItemResponse>>(
    "/users/me/subscription/history",
    { params: buildSubscriptionHistoryParams(request) }
  );
}
