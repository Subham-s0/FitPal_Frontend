import axios from "axios";
import apiClient from "@/shared/api/client";
import type {
  PublicGymProfileResponse,
  PublicGymReviewPageResponse,
  PublicGymReviewResponse,
  ReviewSortDirection,
  SavedGymCountResponse,
  SavedGymResponse,
  UserGymDiscoverPageResponse,
  UserGymDiscoverRequest,
  UserGymProfileViewResponse,
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

export interface GetPublicGymReviewsParams {
  query?: string;
  rating?: number;
  page?: number;
  size?: number;
  sortDirection?: ReviewSortDirection;
}

export async function getPublicGymReviewsApi(
  gymId: number,
  params: GetPublicGymReviewsParams = {}
): Promise<PublicGymReviewPageResponse> {
  const response = await apiClient.get<PublicGymReviewPageResponse>(`/gyms/${gymId}/reviews`, {
    params,
  });
  return response.data;
}

export async function getMyGymReviewApi(gymId: number): Promise<PublicGymReviewResponse | null> {
  try {
    const response = await apiClient.get<PublicGymReviewResponse | null>(`/gyms/${gymId}/reviews/me`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function getUserGymProfileViewApi(
  gymId: number,
  params?: { lat?: number; lng?: number }
): Promise<UserGymProfileViewResponse> {
  const response = await apiClient.get<UserGymProfileViewResponse>(`/users/me/gyms/${gymId}/profile-view`, {
    params,
  });
  return response.data;
}

export interface CreateGymReviewRequest {
  rating: number;
  comments?: string;
}

export async function createGymReviewApi(
  gymId: number,
  data: CreateGymReviewRequest
): Promise<PublicGymReviewResponse> {
  const response = await apiClient.post<PublicGymReviewResponse>(`/gyms/${gymId}/reviews`, data);
  return response.data;
}

export async function updateMyGymReviewApi(
  gymId: number,
  data: CreateGymReviewRequest
): Promise<PublicGymReviewResponse> {
  const response = await apiClient.patch<PublicGymReviewResponse>(`/gyms/${gymId}/reviews/me`, data);
  return response.data;
}

export async function deleteMyGymReviewApi(gymId: number): Promise<void> {
  await apiClient.delete(`/gyms/${gymId}/reviews/me`);
}
