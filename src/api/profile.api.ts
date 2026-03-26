import apiClient from "./client";
import type {
  CreateGymPhotoRequest,
  DeleteAssetRequest,
  DeleteAssetResponse,
  DocumentUploadResponse,
  GymDocumentResponse,
  GymPhotoResponse,
  GymProfileResponse,
  GymProfileSetupStatusResponse,
  UpdateGymBasicsStepRequest,
  UpdateGymLocationStepRequest,
  UpdateGymPayoutStepRequest,
  UpdateGymPhotoRequest,
  UpsertGymDocumentRequest,
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

/** GET /api/gyms/me/profile/documents */
export async function getMyGymDocumentsApi(): Promise<GymDocumentResponse[]> {
  const response = await apiClient.get<GymDocumentResponse[]>("/gyms/me/profile/documents");
  return response.data;
}

/** GET /api/gyms/me/profile/photos */
export async function getMyGymPhotosApi(): Promise<GymPhotoResponse[]> {
  const response = await apiClient.get<GymPhotoResponse[]>("/gyms/me/profile/photos");
  return response.data;
}

/** POST /api/gyms/me/profile/logo */
export async function uploadGymLogoApi(file: File): Promise<GymProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<GymProfileResponse>("/gyms/me/profile/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/** DELETE /api/gyms/me/profile/logo */
export async function deleteGymLogoApi(): Promise<GymProfileResponse> {
  const response = await apiClient.delete<GymProfileResponse>("/gyms/me/profile/logo");
  return response.data;
}

/** POST /api/gyms/me/profile/verify-registered-email */
export async function verifyGymRegisteredEmailApi(): Promise<GymProfileSetupStatusResponse> {
  const response = await apiClient.post<GymProfileSetupStatusResponse>(
    "/gyms/me/profile/verify-registered-email"
  );
  return response.data;
}

/** PATCH /api/users/me/profile */
export async function patchOnboardingProfileApi(
  payload: UpdateUserOnboardingRequest
): Promise<UserProfileResponse> {
  const response = await apiClient.patch<UserProfileResponse>("/users/me/profile", payload);
  return response.data;
}

/** PATCH /api/gyms/me/profile/steps/basic */
export async function patchGymBasicsStepApi(
  payload: UpdateGymBasicsStepRequest
): Promise<GymProfileResponse> {
  const response = await apiClient.patch<GymProfileResponse>("/gyms/me/profile/steps/basic", payload);
  return response.data;
}

/** PATCH /api/gyms/me/profile/steps/location */
export async function patchGymLocationStepApi(
  payload: UpdateGymLocationStepRequest
): Promise<GymProfileResponse> {
  const response = await apiClient.patch<GymProfileResponse>(
    "/gyms/me/profile/steps/location",
    payload
  );
  return response.data;
}

/** PATCH /api/gyms/me/profile/steps/payout */
export async function patchGymPayoutStepApi(
  payload: UpdateGymPayoutStepRequest
): Promise<GymProfileResponse> {
  const response = await apiClient.patch<GymProfileResponse>(
    "/gyms/me/profile/steps/payout",
    payload
  );
  return response.data;
}

/** POST /api/gyms/me/profile/steps/review-submission */
export async function submitGymReviewSubmissionApi(): Promise<GymProfileResponse> {
  const response = await apiClient.post<GymProfileResponse>(
    "/gyms/me/profile/steps/review-submission"
  );
  return response.data;
}

/** POST /api/gyms/me/profile/documents */
export async function upsertGymDocumentApi(
  payload: UpsertGymDocumentRequest
): Promise<GymDocumentResponse> {
  const response = await apiClient.post<GymDocumentResponse>("/gyms/me/profile/documents", payload);
  return response.data;
}

/** DELETE /api/gyms/me/profile/documents/:documentId */
export async function deleteGymDocumentApi(documentId: number): Promise<void> {
  await apiClient.delete(`/gyms/me/profile/documents/${documentId}`);
}

/** POST /api/gyms/me/profile/photos */
export async function createGymPhotoApi(
  payload: CreateGymPhotoRequest
): Promise<GymPhotoResponse> {
  const response = await apiClient.post<GymPhotoResponse>("/gyms/me/profile/photos", payload);
  return response.data;
}

/** PATCH /api/gyms/me/profile/photos/:photoId */
export async function updateGymPhotoApi(
  photoId: number,
  payload: UpdateGymPhotoRequest
): Promise<GymPhotoResponse> {
  const response = await apiClient.patch<GymPhotoResponse>(`/gyms/me/profile/photos/${photoId}`, payload);
  return response.data;
}

/** DELETE /api/gyms/me/profile/photos/:photoId */
export async function deleteGymPhotoApi(photoId: number): Promise<void> {
  await apiClient.delete(`/gyms/me/profile/photos/${photoId}`);
}

/** POST /api/files/documents */
export async function uploadDocumentFileApi(
  file: File,
  folder?: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await apiClient.post<DocumentUploadResponse>("/files/documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/** POST /api/files/images */
export async function uploadImageFileApi(
  file: File,
  folder?: string
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const response = await apiClient.post<DocumentUploadResponse>("/files/images", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/** DELETE /api/files/assets */
export async function deleteUploadedAssetApi(
  payload: DeleteAssetRequest
): Promise<DeleteAssetResponse> {
  const response = await apiClient.delete<DeleteAssetResponse>("/files/assets", {
    data: payload,
  });
  return response.data;
}

/** POST /api/users/me/profile/image */
export async function uploadProfileImageApi(file: File): Promise<UserProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<UserProfileResponse>("/users/me/profile/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

/** DELETE /api/users/me/profile/image */
export async function deleteProfileImageApi(): Promise<UserProfileResponse> {
  const response = await apiClient.delete<UserProfileResponse>("/users/me/profile/image");
  return response.data;
}
