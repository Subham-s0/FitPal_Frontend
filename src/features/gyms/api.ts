import apiClient from "@/shared/api/client";
import type {
  PublicGymProfileResponse,
  PublicGymReviewResponse,
  SavedGymCountResponse,
  SavedGymResponse,
  UserGymDiscoverPageResponse,
  UserGymDiscoverRequest,
} from "@/features/gyms/model";

export async function getUserGymDiscoverApi(
  params: UserGymDiscoverRequest = {}
): Promise<UserGymDiscoverPageResponse> {
  const response = await apiClient.get<UserGymDiscoverPageResponse>("/users/me/gyms/discover", {
    params,
  });
  return response.data;
}

export async function getMySavedGymsApi(): Promise<SavedGymResponse[]> {
  const response = await apiClient.get<SavedGymResponse[]>("/users/me/saved-gyms");
  return response.data;
}

export async function getMySavedGymCountApi(): Promise<SavedGymCountResponse> {
  const response = await apiClient.get<SavedGymCountResponse>("/users/me/saved-gyms/count");
  return response.data;
}

export async function saveMyGymApi(gymId: number): Promise<SavedGymResponse> {
  const response = await apiClient.put<SavedGymResponse>(`/users/me/saved-gyms/${gymId}`);
  return response.data;
}

export async function unsaveMyGymApi(gymId: number): Promise<void> {
  await apiClient.delete(`/users/me/saved-gyms/${gymId}`);
}

export async function getPublicGymProfileApi(gymId: number): Promise<PublicGymProfileResponse> {
  const response = await apiClient.get<PublicGymProfileResponse>(`/gyms/${gymId}`);
  return response.data;
}

export async function getPublicGymReviewsApi(gymId: number): Promise<PublicGymReviewResponse[]> {
  const response = await apiClient.get<PublicGymReviewResponse[]>(`/gyms/${gymId}/reviews`);
  return response.data;
}
