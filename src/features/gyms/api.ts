import axios from "axios";
import { deleteApiData, getApiData, patchApiData, postApiData, putApiData } from "@/shared/api/client";
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
  return getApiData<UserGymDiscoverPageResponse>("/users/me/gyms/discover", {
    params,
  });
}

export async function getPublicGymDiscoverApi(
  params: UserGymDiscoverRequest = {}
): Promise<UserGymDiscoverPageResponse> {
  return getApiData<UserGymDiscoverPageResponse>("/public/gyms/discover", {
    params: {
      ...params,
      savedOnly: undefined,
    },
  });
}

export async function getMySavedGymsApi(): Promise<SavedGymResponse[]> {
  return getApiData<SavedGymResponse[]>("/users/me/saved-gyms");
}

export async function getMySavedGymCountApi(): Promise<SavedGymCountResponse> {
  return getApiData<SavedGymCountResponse>("/users/me/saved-gyms/count");
}

export async function saveMyGymApi(gymId: number): Promise<SavedGymResponse> {
  return putApiData<SavedGymResponse>(`/users/me/saved-gyms/${gymId}`);
}

export async function unsaveMyGymApi(gymId: number): Promise<void> {
  await deleteApiData(`/users/me/saved-gyms/${gymId}`);
}

export async function getPublicGymProfileApi(gymId: number): Promise<PublicGymProfileResponse> {
  return getApiData<PublicGymProfileResponse>(`/public/gyms/${gymId}`);
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
  return getApiData<PublicGymReviewPageResponse>(`/public/gyms/${gymId}/reviews`, {
    params,
  });
}

export async function getMyGymReviewApi(gymId: number): Promise<PublicGymReviewResponse | null> {
  try {
    return await getApiData<PublicGymReviewResponse | null>(`/gyms/${gymId}/reviews/me`);
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
  return getApiData<UserGymProfileViewResponse>(`/users/me/gyms/${gymId}/profile-view`, {
    params,
  });
}

export interface CreateGymReviewRequest {
  rating: number;
  comments?: string;
}

export async function createGymReviewApi(
  gymId: number,
  data: CreateGymReviewRequest
): Promise<PublicGymReviewResponse> {
  return postApiData<PublicGymReviewResponse>(`/gyms/${gymId}/reviews`, data);
}

export async function updateMyGymReviewApi(
  gymId: number,
  data: CreateGymReviewRequest
): Promise<PublicGymReviewResponse> {
  return patchApiData<PublicGymReviewResponse>(`/gyms/${gymId}/reviews/me`, data);
}

export async function deleteMyGymReviewApi(gymId: number): Promise<void> {
  await deleteApiData(`/gyms/${gymId}/reviews/me`);
}
