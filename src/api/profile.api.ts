import apiClient from "./client";
import type {
  BillingProfileResponse,
  DocumentUploadResponse,
  GymProfileResponse,
  GymProfileSetupStatusResponse,
  UpdateBillingProfileRequest,
  UpdateGymOnboardingRequest,
  ProfileSetupStatusResponse,
  UpdateUserOnboardingRequest,
  UserProfileResponse,
} from "@/models/profile.model";

/** GET /api/users/me/profile */
export async function getMyProfileApi(): Promise<UserProfileResponse> {
  const response = await apiClient.get<UserProfileResponse>("/users/me/profile");
  return response.data;
}

/** GET /api/users/me/profile/setup-status */
export async function getProfileSetupStatusApi(): Promise<ProfileSetupStatusResponse> {
  const response = await apiClient.get<ProfileSetupStatusResponse>("/users/me/profile/setup-status");
  return response.data;
}

/** GET /api/users/me/billing-profile */
export async function getMyBillingProfileApi(): Promise<BillingProfileResponse> {
  const response = await apiClient.get<BillingProfileResponse>("/users/me/billing-profile");
  return response.data;
}

/** GET /api/gyms/me/profile */
export async function getMyGymProfileApi(): Promise<GymProfileResponse> {
  const response = await apiClient.get<GymProfileResponse>("/gyms/me/profile");
  return response.data;
}

/** GET /api/gyms/me/profile/setup-status */
export async function getGymProfileSetupStatusApi(): Promise<GymProfileSetupStatusResponse> {
  const response = await apiClient.get<GymProfileSetupStatusResponse>("/gyms/me/profile/setup-status");
  return response.data;
}

/** PATCH /api/users/me/profile */
export async function patchOnboardingProfileApi(
  payload: UpdateUserOnboardingRequest
): Promise<UserProfileResponse> {
  const response = await apiClient.patch<UserProfileResponse>("/users/me/profile", payload);
  return response.data;
}

/** PATCH /api/users/me/billing-profile */
export async function patchMyBillingProfileApi(
  payload: UpdateBillingProfileRequest
): Promise<BillingProfileResponse> {
  const response = await apiClient.patch<BillingProfileResponse>("/users/me/billing-profile", payload);
  return response.data;
}

/** PATCH /api/gyms/me/profile */
export async function patchGymOnboardingProfileApi(
  payload: UpdateGymOnboardingRequest
): Promise<GymProfileResponse> {
  const response = await apiClient.patch<GymProfileResponse>("/gyms/me/profile", payload);
  return response.data;
}

/** POST /api/files/documents */
export async function uploadProfileImageApi(
  file: File,
  folder = "fitpal/profile-images"
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await apiClient.post<DocumentUploadResponse>("/files/documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
