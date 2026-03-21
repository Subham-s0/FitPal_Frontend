import apiClient from "./client";
import type {
  SelectUserSubscriptionRequest,
  UserSubscriptionResponse,
  UserSubscriptionStateResponse,
} from "@/models/subscription.model";

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
